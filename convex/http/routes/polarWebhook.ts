/**
 * Polar webhook handler
 * Handles subscription events from Polar.sh
 *
 * Implements Standard Webhooks signature verification manually
 * since @polar-sh/sdk is not available in Convex runtime.
 * See: https://github.com/standard-webhooks/standard-webhooks
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";

/**
 * Polar webhook event types we handle
 */
type PolarEventType =
  | "subscription.created"
  | "subscription.updated"
  | "subscription.active"
  | "subscription.canceled"
  | "subscription.revoked"
  | "subscription.uncanceled"
  | "checkout.created"
  | "checkout.updated"
  | "order.created"
  | "order.paid";

interface PolarSubscription {
  id: string;
  status:
    | "incomplete"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  current_period_start: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  product: {
    id: string;
    name: string;
  };
  price: {
    id: string;
    amount_type: string;
  };
  customer: {
    id: string;
    email: string;
    external_id?: string; // Organization's Clerk ID
  };
}

interface PolarCheckout {
  id: string;
  status: "open" | "expired" | "confirmed" | "succeeded";
  customer_id?: string;
  customer_external_id?: string;
  product_id: string;
}

interface PolarWebhookEvent {
  type: PolarEventType;
  data: PolarSubscription | PolarCheckout;
}

/**
 * Base64 decode helper that handles URL-safe base64
 */
function base64Decode(str: string): Uint8Array {
  // Handle URL-safe base64 (replace - with + and _ with /)
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if needed
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/**
 * Verify webhook signature using Standard Webhooks spec
 * https://github.com/standard-webhooks/standard-webhooks/blob/main/spec/standard-webhooks.md
 */
async function verifyWebhookSignature(
  body: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const webhookId = headers.get("webhook-id");
  const webhookTimestamp = headers.get("webhook-timestamp");
  const webhookSignature = headers.get("webhook-signature");

  console.log("Webhook verification starting...");
  console.log("Headers present:", {
    "webhook-id": webhookId,
    "webhook-timestamp": webhookTimestamp,
    "webhook-signature": webhookSignature?.substring(0, 50) + "...",
  });
  console.log("Body length:", body.length);
  console.log("Body first 100 chars:", body.substring(0, 100));

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    console.error("Missing required webhook headers");
    return false;
  }

  // Check timestamp to prevent replay attacks (5 minute tolerance)
  const timestamp = parseInt(webhookTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - timestamp);

  if (timeDiff > 300) {
    console.error(`Webhook timestamp too old or in future. Diff: ${timeDiff}s`);
    return false;
  }

  // Construct the signed payload: "{webhook-id}.{webhook-timestamp}.{body}"
  const signedPayload = `${webhookId}.${webhookTimestamp}.${body}`;
  console.log("Signed payload preview:", signedPayload.substring(0, 150) + "...");

  // IMPORTANT: Polar's SDK source code reveals the secret handling:
  // const base64Secret = Buffer.from(secret, "utf-8").toString("base64");
  // const webhook = new Webhook(base64Secret);
  //
  // This means Polar takes the raw secret string, converts to UTF-8 bytes,
  // then base64 encodes it for Standard Webhooks.
  //
  // Standard Webhooks then base64 DEcodes to get the key bytes.
  // Net result: the raw UTF-8 bytes of the secret string are used as HMAC key.

  const secretBytes = new TextEncoder().encode(secret);
  console.log(`Secret as raw UTF-8 bytes, length: ${secretBytes.length}`);
  console.log(`Secret first 20 chars: ${secret.substring(0, 20)}...`);

  // Import the key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes.buffer.slice(
      secretBytes.byteOffset,
      secretBytes.byteOffset + secretBytes.byteLength
    ) as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  );

  // Convert signature to base64
  const computedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  // Parse received signatures - format: "v1,<sig1> v1,<sig2>"
  const receivedSignatures = webhookSignature.split(" ");

  console.log(`Computed signature: v1,${computedSignature.substring(0, 20)}...`);
  console.log(`Received signatures count: ${receivedSignatures.length}`);

  for (const sig of receivedSignatures) {
    const parts = sig.split(",");
    if (parts.length !== 2) continue;

    const [version, sigValue] = parts;
    console.log(`Checking: version=${version}, sig=${sigValue.substring(0, 20)}...`);

    if (version === "v1" && sigValue === computedSignature) {
      console.log("Signature verified successfully!");
      return true;
    }
  }

  console.error("No matching signature found");
  console.log(`Expected: ${computedSignature}`);
  console.log(`Received: ${receivedSignatures.map(s => s.split(",")[1]).join(", ")}`);

  return false;
}

/**
 * Handle Polar webhook events
 * Supported events:
 * - subscription.created: New subscription
 * - subscription.active: Subscription became active (payment succeeded)
 * - subscription.updated: Subscription details changed
 * - subscription.canceled: Subscription cancelled (will end at period end)
 * - subscription.revoked: Subscription immediately terminated
 * - subscription.uncanceled: Cancellation was reversed
 * - checkout.updated: Checkout completed (status: succeeded)
 */
export const handlePolarWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("POLAR_WEBHOOK_SECRET not configured");
    return new Response("Server configuration error", { status: 500 });
  }

  console.log(`Webhook secret configured: ${webhookSecret.substring(0, 15)}...`);

  // Get the raw body for signature verification
  const body = await request.text();

  // Validate the webhook signature
  const isValid = await verifyWebhookSignature(body, request.headers, webhookSecret);
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  // Parse the event
  let event: PolarWebhookEvent;
  try {
    event = JSON.parse(body) as PolarWebhookEvent;
  } catch {
    console.error("Invalid JSON in webhook body");
    return new Response("Invalid JSON", { status: 400 });
  }

  console.log(`Polar webhook received: ${event.type}`);

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.uncanceled": {
        const subscription = event.data as PolarSubscription;

        // Get organization from external ID (Clerk org ID)
        const clerkOrgId = subscription.customer.external_id;
        if (!clerkOrgId) {
          console.error(
            "No external_id (Clerk org ID) in subscription customer"
          );
          return new Response("Missing customer external_id", { status: 200 });
        }

        const org = await ctx.runQuery(
          internal.domains.organizations.queries.getByClerkIdInternal,
          { clerkId: clerkOrgId }
        );

        if (!org) {
          console.error(`Organization not found for Clerk ID: ${clerkOrgId}`);
          return new Response("Organization not found", { status: 200 });
        }

        // Only activate if subscription is actually active
        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          await ctx.runMutation(
            internal.domains.subscriptions.internal.activateSubscription,
            {
              orgId: org._id,
              polarCustomerId: subscription.customer.id,
              polarSubscriptionId: subscription.id,
              productId: subscription.product.id,
              expirationAtMs: subscription.current_period_end
                ? new Date(subscription.current_period_end).getTime()
                : undefined,
            }
          );
          console.log(
            `Subscription activated for org ${org._id}: ${subscription.product.name}`
          );
        }
        break;
      }

      case "subscription.canceled": {
        const subscription = event.data as PolarSubscription;
        const clerkOrgId = subscription.customer.external_id;

        if (!clerkOrgId) {
          console.error("No external_id in cancelled subscription");
          return new Response("OK", { status: 200 });
        }

        await ctx.runMutation(
          internal.domains.subscriptions.internal.cancelSubscription,
          { polarCustomerId: subscription.customer.id }
        );
        console.log(
          `Subscription cancelled for customer ${subscription.customer.id}`
        );
        break;
      }

      case "subscription.revoked": {
        const subscription = event.data as PolarSubscription;
        const clerkOrgId = subscription.customer.external_id;

        if (!clerkOrgId) {
          console.error("No external_id in revoked subscription");
          return new Response("OK", { status: 200 });
        }

        // Revoked = immediate termination, downgrade to free
        await ctx.runMutation(
          internal.domains.subscriptions.internal.expireSubscription,
          { polarCustomerId: subscription.customer.id }
        );
        console.log(
          `Subscription revoked for customer ${subscription.customer.id}`
        );
        break;
      }

      case "checkout.created":
      case "checkout.updated": {
        const checkout = event.data as PolarCheckout;

        // Only log checkout events, subscription events handle activation
        if (checkout.status === "succeeded") {
          console.log(`Checkout succeeded: ${checkout.id}`);
        } else {
          console.log(`Checkout ${event.type}: ${checkout.id}, status: ${checkout.status}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Polar event type: ${event.type}`);
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`Error processing Polar webhook:`, error);
    return new Response("Internal server error", { status: 500 });
  }
});
