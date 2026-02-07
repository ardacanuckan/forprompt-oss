/**
 * User mutations
 */

import { v } from "convex/values";

import { mutation } from "../../_generated/server";

/**
 * Get or create user - useful for ensuring user exists in database
 * Can be called from authenticated mutations
 */
export const getOrCreate = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
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
      user = await ctx.db.get(userId);
    }

    return user;
  },
});

/**
 * Mark onboarding as completed for the current user
 */
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    });

    return user._id;
  },
});
