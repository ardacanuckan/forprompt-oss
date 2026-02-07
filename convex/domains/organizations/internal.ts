/**
 * Internal organization operations (for webhooks and system operations)
 */

import { v } from "convex/values";
import { internalMutation } from "../../_generated/server";

/**
 * Create or update an organization from Clerk webhook data
 */
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingOrg) {
      // Update existing organization
      await ctx.db.patch(existingOrg._id, {
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        updatedAt: now,
      });
      return existingOrg._id;
    } else {
      // Create new organization
      const orgId = await ctx.db.insert("organizations", {
        clerkId: args.clerkId,
        name: args.name,
        slug: args.slug,
        imageUrl: args.imageUrl,
        createdAt: now,
        updatedAt: now,
      });
      return orgId;
    }
  },
});

/**
 * Delete an organization (called when organization.deleted webhook is received)
 */
export const deleteFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (org) {
      // Delete all memberships for this organization
      const memberships = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("orgId", org._id))
        .collect();

      for (const membership of memberships) {
        await ctx.db.delete(membership._id);
      }

      // Delete the organization
      await ctx.db.delete(org._id);
    }

    return { success: true };
  },
});

/**
 * Add a member to an organization (called from webhook)
 */
export const addMemberFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the organization
    const org = await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkOrgId))
      .first();

    if (!org) {
      throw new Error(`Organization not found: ${args.clerkOrgId}`);
    }

    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkUserId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.clerkUserId}`);
    }

    // Check if membership already exists
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_clerk_ids", (q) => 
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId)
      )
      .first();

    if (existingMembership) {
      // Update role if it changed
      await ctx.db.patch(existingMembership._id, { role: args.role });
      return existingMembership._id;
    }

    // Create new membership
    const membershipId = await ctx.db.insert("organizationMembers", {
      orgId: org._id,
      userId: user._id,
      clerkOrgId: args.clerkOrgId,
      clerkUserId: args.clerkUserId,
      role: args.role,
      createdAt: Date.now(),
    });

    return membershipId;
  },
});

/**
 * Remove a member from an organization (called from webhook)
 */
export const removeMemberFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_clerk_ids", (q) => 
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId)
      )
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return { success: true };
  },
});

/**
 * Update member role (called from webhook)
 */
export const updateMemberRoleFromClerk = internalMutation({
  args: {
    clerkOrgId: v.string(),
    clerkUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_clerk_ids", (q) => 
        q.eq("clerkOrgId", args.clerkOrgId).eq("clerkUserId", args.clerkUserId)
      )
      .first();

    if (membership) {
      await ctx.db.patch(membership._id, { role: args.role });
    }

    return { success: true };
  },
});

