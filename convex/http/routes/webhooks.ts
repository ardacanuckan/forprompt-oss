/**
 * Webhook HTTP routes (Clerk webhooks)
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Webhook } from "svix";

/**
 * Type definitions for Clerk webhook events
 */
interface EmailAddress {
  id: string;
  email_address: string;
}

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: EmailAddress[];
    primary_email_address_id?: string;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    name?: string;
    slug?: string;
    organization?: {
      id: string;
    };
    public_user_data?: {
      user_id: string;
    };
    role?: string;
    email_address?: string;
  };
}

/**
 * POST /clerk-webhook
 * Handles all Clerk webhook events
 */
export const handleClerkWebhook = httpAction(async (ctx, request) => {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers
  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const body = await request.text();

  // Verify the webhook
  const wh = new Webhook(webhookSecret);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("Invalid webhook signature", { status: 400 });
  }

  // Handle the webhook event
  const eventType = evt.type;

  try {
    switch (eventType) {
      // User events
      case "user.created":
      case "user.updated": {
        const { id, email_addresses, first_name, last_name, image_url } = evt.data;
        const primaryEmail = email_addresses?.find((e: EmailAddress) => e.id === evt.data.primary_email_address_id);
        
        await ctx.runMutation(internal.domains.users.internal.upsertFromClerk, {
          clerkId: id,
          email: primaryEmail?.email_address ?? "",
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          imageUrl: image_url ?? undefined,
        });
        break;
      }

      case "user.deleted": {
        const { id } = evt.data;
        if (id) {
          await ctx.runMutation(internal.domains.users.internal.deleteFromClerk, {
            clerkId: id,
          });
        }
        break;
      }

      // Organization events
      case "organization.created":
      case "organization.updated": {
        const { id, name, slug, image_url } = evt.data;
        
        if (!id || !name) {
          console.error("Missing required organization fields:", { id, name });
          break;
        }
        
        await ctx.runMutation(internal.domains.organizations.internal.upsertFromClerk, {
          clerkId: id,
          name: name,
          slug: slug ?? undefined,
          imageUrl: image_url ?? undefined,
        });
        break;
      }

      case "organization.deleted": {
        const { id } = evt.data;
        if (id) {
          await ctx.runMutation(internal.domains.organizations.internal.deleteFromClerk, {
            clerkId: id,
          });
        }
        break;
      }

      // Organization membership events
      case "organizationMembership.created": {
        const { organization, public_user_data, role } = evt.data;
        
        if (!organization?.id || !public_user_data?.user_id || !role) {
          console.error("Missing required membership fields:", { organization, public_user_data, role });
          break;
        }
        
        await ctx.runMutation(internal.domains.organizations.internal.addMemberFromClerk, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
          role: role,
        });
        break;
      }

      case "organizationMembership.deleted": {
        const { organization, public_user_data } = evt.data;
        
        if (!organization?.id || !public_user_data?.user_id) {
          console.error("Missing required membership fields:", { organization, public_user_data });
          break;
        }
        
        await ctx.runMutation(internal.domains.organizations.internal.removeMemberFromClerk, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
        });
        break;
      }

      case "organizationMembership.updated": {
        const { organization, public_user_data, role } = evt.data;
        
        if (!organization?.id || !public_user_data?.user_id || !role) {
          console.error("Missing required membership fields:", { organization, public_user_data, role });
          break;
        }
        
        await ctx.runMutation(internal.domains.organizations.internal.updateMemberRoleFromClerk, {
          clerkOrgId: organization.id,
          clerkUserId: public_user_data.user_id,
          role: role,
        });
        break;
      }

      // Organization invitation events
      case "organizationInvitation.created": {
        const { id, email_address, role, organization, public_user_data } = evt.data;
        
        if (!id || !email_address || !role || !organization?.id || !public_user_data?.user_id) {
          console.error("Missing required invitation fields:", evt.data);
          break;
        }
        
        await ctx.runMutation(internal.domains.invitations.internal.createFromWebhook, {
          clerkOrgId: organization.id,
          clerkInvitationId: id,
          email: email_address,
          role: role,
          invitedByClerkId: public_user_data.user_id,
        });
        break;
      }

      case "organizationInvitation.accepted": {
        const { id } = evt.data;
        
        if (!id) {
          console.error("Missing invitation ID");
          break;
        }
        
        await ctx.runMutation(internal.domains.invitations.internal.acceptFromWebhook, {
          clerkInvitationId: id,
        });
        break;
      }

      case "organizationInvitation.revoked": {
        const { id } = evt.data;
        
        if (!id) {
          console.error("Missing invitation ID");
          break;
        }
        
        await ctx.runMutation(internal.domains.invitations.internal.revokeFromWebhook, {
          clerkInvitationId: id,
        });
        break;
      }

      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    return new Response("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response("Error processing webhook", { status: 500 });
  }
});

