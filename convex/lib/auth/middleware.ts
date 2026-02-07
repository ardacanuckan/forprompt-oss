/**
 * Context enrichment and middleware utilities
 */

import { QueryCtx, MutationCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { getCurrentUserId } from "./permissions";

/**
 * Get or create user context
 * Useful for ensuring user exists in database during authenticated operations
 */
export async function getOrCreateUser(ctx: MutationCtx): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const clerkId = identity.subject;
  
  let user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .first();

  if (!user) {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      clerkId,
      email: identity.email ?? "",
      firstName: identity.givenName,
      lastName: identity.familyName,
      imageUrl: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
    });
    return userId;
  }

  return user._id;
}

/**
 * Get current user with full details
 */
export async function getCurrentUserDetails(
  ctx: QueryCtx | MutationCtx
): Promise<any | null> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    return null;
  }

  return await ctx.db.get(userId);
}

/**
 * Check if current user owns a resource
 */
export async function isResourceOwner(
  ctx: QueryCtx | MutationCtx,
  resourceCreatorId: Id<"users">
): Promise<boolean> {
  const userId = await getCurrentUserId(ctx);
  if (!userId) {
    return false;
  }

  return userId === resourceCreatorId;
}

