/**
 * API key mutations
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireOrgAdmin } from "../../lib/auth/permissions";
import { encrypt } from "../../lib/utils/encryption";
import { validateNonEmpty } from "../../lib/utils/validators";
import { ConflictError, NotFoundError } from "../../lib/utils/errors";

/**
 * Create a new API key (admin only)
 */
export const createApiKey = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    service: v.string(),
    keyValue: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOrgAdmin(ctx, args.orgId);

    // Validate key value
    validateNonEmpty(args.keyValue, "API key value");

    // Check if a key for this service already exists
    const existingKey = await ctx.db
      .query("organizationApiKeys")
      .withIndex("by_service", (q) => 
        q.eq("orgId", args.orgId).eq("service", args.service)
      )
      .first();

    if (existingKey) {
      throw new ConflictError(
        `An API key for ${args.service} already exists. Please delete the existing key first.`
      );
    }

    const now = Date.now();
    const keyId = await ctx.db.insert("organizationApiKeys", {
      orgId: args.orgId,
      name: args.name,
      service: args.service,
      keyValue: encrypt(args.keyValue),
      createdAt: now,
      createdBy: userId,
    });

    return { success: true, keyId };
  },
});

/**
 * Delete an API key (admin only)
 */
export const deleteApiKey = mutation({
  args: {
    keyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) {
      throw new NotFoundError("API key");
    }

    await requireOrgAdmin(ctx, key.orgId);

    await ctx.db.delete(args.keyId);

    return { success: true };
  },
});

