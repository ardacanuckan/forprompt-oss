"use node";
/**
 * Webhook delivery action with retry logic
 */

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import crypto from "crypto";

/**
 * Webhook event payload structure
 */
interface WebhookPayload {
  event: string;
  timestamp: number;
  projectId: string;
  data: {
    promptId?: string;
    promptKey?: string;
    versionNumber?: number;
    systemPrompt?: string;
    [key: string]: any;
  };
}

/**
 * Generate HMAC signature for webhook verification
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Deliver webhook with retries
 */
export const deliverWebhook = internalAction({
  args: {
    subscriptionId: v.id("webhookSubscriptions"),
    payload: v.any(),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    // Get subscription details
    const subscription = await ctx.runQuery(
      internal.domains.webhooks.queries.getWebhookInternal,
      {
        subscriptionId: args.subscriptionId,
      }
    );

    if (!subscription) {
      console.error("Subscription not found:", args.subscriptionId);
      return;
    }

    const payloadString = JSON.stringify(args.payload);
    const signature = generateSignature(payloadString, subscription.secret);

    // Attempt delivery with retries
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(subscription.endpointUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ForPrompt-Signature": signature,
            "X-ForPrompt-Event": args.event,
            "X-ForPrompt-Delivery-ID": crypto.randomUUID(),
            "User-Agent": "ForPrompt-Webhook/1.0",
          },
          body: payloadString,
        });

        const responseBody = await response.text().catch(() => "");

        if (response.ok) {
          // Success - update last delivery time
          await ctx.runMutation(
            internal.domains.webhooks.mutations.updateLastDelivery,
            {
              subscriptionId: args.subscriptionId,
            }
          );
          return;
        }

        // Non-OK response
        lastError = new Error(`HTTP ${response.status}: ${responseBody}`);

        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          break;
        }
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Webhook delivery attempt ${attempt} failed:`,
          error
        );
      }

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    // All retries failed
    console.error("Webhook delivery failed after retries:", lastError);

    // Increment failure count
    await ctx.runMutation(
      internal.domains.webhooks.mutations.incrementFailureCount,
      {
        subscriptionId: args.subscriptionId,
      }
    );
  },
});

/**
 * Trigger webhooks for an event
 */
export const triggerWebhooks = internalAction({
  args: {
    projectId: v.id("projects"),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Get active webhooks for this project and event
    const webhooks = await ctx.runQuery(
      internal.domains.webhooks.queries.getActiveWebhooksInternal,
      {
        projectId: args.projectId,
        event: args.event,
      }
    );

    if (webhooks.length === 0) {
      return;
    }

    // Trigger delivery for each webhook (in parallel)
    await Promise.all(
      webhooks.map((webhook) =>
        ctx.runAction(internal.domains.webhooks.delivery.deliverWebhook, {
          subscriptionId: webhook._id,
          payload: args.payload,
          event: args.event,
        })
      )
    );
  },
});

