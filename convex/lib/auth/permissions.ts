/**
 * Permission helper functions for role-based access control
 */

import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { AuthenticationError, AuthorizationError } from "../utils/errors";
import { UserRole } from "../types/common";

/**
 * Get the current authenticated user's Convex ID
 */
export async function getCurrentUserId(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  return user?._id ?? null;
}

/**
 * Get user's membership in a specific organization
 */
export async function getUserMembership(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
) {
  return await ctx.db
    .query("organizationMembers")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .filter((q) => q.eq(q.field("userId"), userId))
    .first();
}

/**
 * Check if user is an admin of the organization
 */
export async function isOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<boolean> {
  const membership = await getUserMembership(ctx, userId, orgId);
  return membership?.role === "org:admin";
}

/**
 * Check if user is a member (any role) of the organization
 */
export async function isOrgMember(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<boolean> {
  const membership = await getUserMembership(ctx, userId, orgId);
  return membership !== null;
}

/**
 * Require user to be authenticated, returns user ID or throws
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx
): Promise<Id<"users">> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    throw new AuthenticationError();
  }
  return userId;
}

/**
 * Require user to have access (be a member) of the organization
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const isMember = await isOrgMember(ctx, userId, orgId);
  
  if (!isMember) {
    throw new AuthorizationError("You do not have access to this organization");
  }
  
  return userId;
}

/**
 * Require user to be an admin of the organization
 */
export async function requireOrgAdmin(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
): Promise<Id<"users">> {
  const userId = await requireAuth(ctx);
  const isAdmin = await isOrgAdmin(ctx, userId, orgId);
  
  if (!isAdmin) {
    throw new AuthorizationError("Admin access required for this action");
  }
  
  return userId;
}

/**
 * Check if user can manage members (admin only)
 */
export async function canManageMembers(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<boolean> {
  return await isOrgAdmin(ctx, userId, orgId);
}

/**
 * Check if user can manage settings (admin only)
 */
export async function canManageSettings(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<boolean> {
  return await isOrgAdmin(ctx, userId, orgId);
}

/**
 * Check if user can leave the organization
 * Returns false if user is the last admin
 */
export async function canLeaveOrg(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  orgId: Id<"organizations">
): Promise<{ canLeave: boolean; reason?: string }> {
  const membership = await getUserMembership(ctx, userId, orgId);
  
  if (!membership) {
    return { canLeave: false, reason: "You are not a member of this organization" };
  }

  // If not an admin, can always leave
  if (membership.role !== "org:admin") {
    return { canLeave: true };
  }

  // Check if there are other admins
  const adminCount = await countOrgAdmins(ctx, orgId);

  if (adminCount === 1) {
    return { 
      canLeave: false, 
      reason: "You are the last admin. Please promote another member to admin before leaving or delete the organization." 
    };
  }

  return { canLeave: true };
}

/**
 * Get all organizations where user is an admin
 */
export async function getUserAdminOrgs(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
): Promise<Array<Id<"organizations">>> {
  const memberships = await ctx.db
    .query("organizationMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("role"), "org:admin"))
    .collect();

  return memberships.map((m) => m.orgId);
}

/**
 * Count total admins in an organization
 */
export async function countOrgAdmins(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">
): Promise<number> {
  const members = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org", (q) => q.eq("orgId", orgId))
    .collect();

  return members.filter((m) => m.role === "org:admin").length;
}

