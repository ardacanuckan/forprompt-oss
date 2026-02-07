import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * Manually sync current user from Clerk to Convex
 * Call this from the frontend when a user first logs in
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkId = identity.subject;
    
    // Check if user already exists
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    const now = Date.now();

    if (!user) {
      // Create new user
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
    } else {
      // Update existing user
      await ctx.db.patch(user._id, {
        email: identity.email ?? user.email,
        firstName: identity.givenName ?? user.firstName,
        lastName: identity.familyName ?? user.lastName,
        imageUrl: identity.pictureUrl ?? user.imageUrl,
        updatedAt: now,
      });
    }

    return user;
  },
});

/**
 * Manually sync current user's organizations from Clerk to Convex
 * Pass the organizations from Clerk SDK
 */
export const syncUserOrganizations = mutation({
  args: {
    organizations: v.array(v.object({
      id: v.string(),
      name: v.string(),
      slug: v.optional(v.string()),
      imageUrl: v.optional(v.string()),
      role: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const clerkUserId = identity.subject;
    
    // Get or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkUserId))
      .first();

    if (!user) {
      // Create user if doesn't exist
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        clerkId: clerkUserId,
        email: identity.email ?? "",
        firstName: identity.givenName,
        lastName: identity.familyName,
        imageUrl: identity.pictureUrl,
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }

    if (!user) {
      throw new Error("Failed to create/get user");
    }

    const now = Date.now();
    const results = [];

    // Sync each organization
    for (const org of args.organizations) {
      // Get or create organization
      let convexOrg = await ctx.db
        .query("organizations")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", org.id))
        .first();

      if (!convexOrg) {
        // Create organization
        const orgId = await ctx.db.insert("organizations", {
          clerkId: org.id,
          name: org.name,
          slug: org.slug,
          imageUrl: org.imageUrl,
          createdAt: now,
          updatedAt: now,
        });
        convexOrg = await ctx.db.get(orgId);
      } else {
        // Update organization
        await ctx.db.patch(convexOrg._id, {
          name: org.name,
          slug: org.slug,
          imageUrl: org.imageUrl,
          updatedAt: now,
        });
      }

      if (!convexOrg) {
        continue;
      }

      // Get or create membership
      let membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_clerk_ids", (q) => 
          q.eq("clerkOrgId", org.id).eq("clerkUserId", clerkUserId)
        )
        .first();

      if (!membership) {
        // Create membership
        await ctx.db.insert("organizationMembers", {
          orgId: convexOrg._id,
          userId: user._id,
          clerkOrgId: org.id,
          clerkUserId: clerkUserId,
          role: org.role,
          createdAt: now,
        });
      } else {
        // Update membership role
        await ctx.db.patch(membership._id, {
          role: org.role,
        });
      }

      results.push({
        orgId: convexOrg._id,
        name: org.name,
        role: org.role,
      });
    }

    return {
      syncedOrganizations: results.length,
      organizations: results,
    };
  },
});




