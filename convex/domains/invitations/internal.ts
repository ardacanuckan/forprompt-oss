/**
 * Internal invitation operations (for webhooks)
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";
import { getDaysFromNow } from "../../lib/utils/dates";

/**
 * Create invitation record from webhook
 */
export const createFromWebhook = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkInvitationId: v.string(),
    email: v.string(),
    role: v.string(),
    invitedByClerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkOrgId))
      .first();

    if (!org) {
      console.error(`Organization not found: ${args.clerkOrgId}`);
      return { success: false };
    }

    // Find the inviter
    const inviter = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.invitedByClerkId))
      .first();

    if (!inviter) {
      console.error(`Inviter not found: ${args.invitedByClerkId}`);
      return { success: false };
    }

    // Check if invitation already exists
    const existing = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkInvitationId", args.clerkInvitationId))
      .first();

    if (existing) {
      return { success: true, invitationId: existing._id };
    }

    const now = Date.now();
    const expiresAt = getDaysFromNow(7); // 7 days from now

    const invitationId = await ctx.db.insert("organizationInvitations", {
      orgId: org._id,
      clerkInvitationId: args.clerkInvitationId,
      email: args.email,
      role: args.role,
      status: "pending",
      invitedBy: inviter._id,
      createdAt: now,
      expiresAt,
    });

    return { success: true, invitationId };
  },
});

/**
 * Mark invitation as accepted from webhook
 */
export const acceptFromWebhook = internalMutation({
  args: {
    clerkInvitationId: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkInvitationId", args.clerkInvitationId))
      .first();

    if (invitation) {
      await ctx.db.patch(invitation._id, {
        status: "accepted",
        acceptedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Mark invitation as revoked from webhook
 */
export const revokeFromWebhook = internalMutation({
  args: {
    clerkInvitationId: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("organizationInvitations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkInvitationId", args.clerkInvitationId))
      .first();

    if (invitation) {
      await ctx.db.patch(invitation._id, {
        status: "revoked",
        revokedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

