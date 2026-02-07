/**
 * Organization member management
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireOrgAccess, requireOrgAdmin, canLeaveOrg, countOrgAdmins } from "../../lib/auth/permissions";
import { NotFoundError, ValidationError } from "../../lib/utils/errors";
import { validateRole } from "../../lib/utils/validators";

/**
 * Leave an organization (current user)
 */
export const leaveOrganization = mutation({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const userId = await requireOrgAccess(ctx, args.orgId);

    // Check if user can leave
    const canLeave = await canLeaveOrg(ctx, userId, args.orgId);
    if (!canLeave.canLeave) {
      throw new Error(canLeave.reason ?? "Cannot leave organization");
    }

    // Find and delete the membership
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (membership) {
      await ctx.db.delete(membership._id);
    }

    return { success: true };
  },
});

/**
 * Update a member's role (admin only)
 * Note: This updates the local database only
 * The actual role change should be done via Clerk's API
 */
export const updateMemberRole = mutation({
  args: {
    membershipId: v.id("organizationMembers"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new NotFoundError("Membership");
    }

    await requireOrgAdmin(ctx, membership.orgId);

    // Validate role
    validateRole(args.role);

    // If demoting an admin, check if there are other admins
    if (membership.role === "org:admin" && args.role === "org:member") {
      const adminCount = await countOrgAdmins(ctx, membership.orgId);
      if (adminCount <= 1) {
        throw new ValidationError(
          "Cannot demote the last admin. Promote another member to admin first."
        );
      }
    }

    await ctx.db.patch(args.membershipId, { role: args.role });

    return { success: true };
  },
});

/**
 * Remove a member from organization (admin only)
 * Note: This removes from local database only
 * The actual removal should be done via Clerk's API
 */
export const removeMember = mutation({
  args: {
    membershipId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const membership = await ctx.db.get(args.membershipId);
    if (!membership) {
      throw new NotFoundError("Membership");
    }

    await requireOrgAdmin(ctx, membership.orgId);

    // Check if removing an admin
    if (membership.role === "org:admin") {
      const adminCount = await countOrgAdmins(ctx, membership.orgId);
      if (adminCount <= 1) {
        throw new ValidationError(
          "Cannot remove the last admin. Promote another member to admin first or delete the organization."
        );
      }
    }

    await ctx.db.delete(args.membershipId);

    return { success: true };
  },
});

