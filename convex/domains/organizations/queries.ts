/**
 * Organization queries
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";

/**
 * Get an organization by its Clerk ID
 */
export const getByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Get an organization by its Convex ID
 */
export const get = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});

/**
 * Get an organization by slug
 */
export const getBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

/**
 * Get all organizations for the current user
 */
export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const clerkId = identity.subject;
    
    // Find the user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      return [];
    }

    // Get all memberships for this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get the organization details for each membership
    const orgsWithRoles = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.orgId);
        return org ? { ...org, role: membership.role } : null;
      })
    );

    return orgsWithRoles.filter((org) => org !== null);
  },
});

/**
 * Get all members of an organization
 */
export const getMembers = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const members = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId);
        return user
          ? {
              ...user,
              role: membership.role,
              membershipId: membership._id,
              joinedAt: membership.createdAt,
            }
          : null;
      })
    );

    return members.filter((member) => member !== null);
  },
});

/**
 * Get member details including their role
 */
export const getMemberDetails = query({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this org
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!currentUser) {
      return null;
    }
    
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), currentUser._id))
      .first();
    
    if (!membership) {
      return null;
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const targetMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!targetMembership) {
      return null;
    }

    return {
      ...user,
      role: targetMembership.role,
      joinedAt: targetMembership.createdAt,
      membershipId: targetMembership._id,
    };
  },
});

/**
 * Internal: Get organization by Clerk ID (for webhooks and actions)
 */
export const getByClerkIdInternal = internalQuery({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

/**
 * Get member management info for the current user in an organization.
 * Returns info about whether user can leave, admin count, etc.
 */
export const getMemberManagementInfo = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get user's membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!membership) {
      return null;
    }

    // Count total members and admins
    const allMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const totalMembers = allMemberships.length;
    const adminCount = allMemberships.filter((m) => m.role === "org:admin").length;
    const isCurrentUserAdmin = membership.role === "org:admin";
    const isLastAdmin = isCurrentUserAdmin && adminCount === 1;
    const isOnlyMember = totalMembers === 1;

    return {
      currentUserRole: membership.role,
      membershipId: membership._id,
      isCurrentUserAdmin,
      totalMembers,
      adminCount,
      isLastAdmin,
      isOnlyMember,
      canLeave: !isLastAdmin || isOnlyMember,
      leaveWarning: isLastAdmin && !isOnlyMember
        ? "You are the last admin. Promote another member to admin before leaving, or delete the organization."
        : isOnlyMember
        ? "You are the only member. Leaving will delete the organization."
        : null,
    };
  },
});

/**
 * Check if a member can be removed or have their role changed.
 * Returns warnings and restrictions.
 */
export const getMemberActionInfo = query({
  args: {
    orgId: v.id("organizations"),
    targetMembershipId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      return null;
    }

    // Get current user's membership
    const currentMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), currentUser._id))
      .first();

    if (!currentMembership || currentMembership.role !== "org:admin") {
      return { canPerformActions: false, reason: "Admin access required" };
    }

    // Get target membership
    const targetMembership = await ctx.db.get(args.targetMembershipId);
    if (!targetMembership) {
      return { canPerformActions: false, reason: "Member not found" };
    }

    // Get target user
    const targetUser = await ctx.db.get(targetMembership.userId);

    // Count admins
    const allMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    const adminCount = allMemberships.filter((m) => m.role === "org:admin").length;
    const isTargetAdmin = targetMembership.role === "org:admin";
    const isTargetLastAdmin = isTargetAdmin && adminCount === 1;
    const isTargetSelf = targetMembership.userId === currentUser._id;

    return {
      canPerformActions: true,
      targetUser: targetUser ? {
        _id: targetUser._id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        email: targetUser.email,
      } : null,
      targetRole: targetMembership.role,
      isTargetAdmin,
      isTargetLastAdmin,
      isTargetSelf,
      adminCount,
      canRemove: !isTargetLastAdmin && !isTargetSelf,
      canDemote: !isTargetLastAdmin,
      removeWarning: isTargetSelf
        ? "You cannot remove yourself. Use 'Leave Organization' instead."
        : isTargetLastAdmin
        ? "Cannot remove the last admin. Promote another member to admin first."
        : null,
      demoteWarning: isTargetLastAdmin
        ? "Cannot demote the last admin. Promote another member to admin first."
        : null,
    };
  },
});

