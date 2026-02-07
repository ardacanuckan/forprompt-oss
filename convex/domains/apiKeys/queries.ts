/**
 * API key queries
 */

import { v } from "convex/values";
import { query } from "../../_generated/server";
import { requireOrgAccess, requireOrgAdmin } from "../../lib/auth/permissions";
import { decrypt, maskApiKey } from "../../lib/utils/encryption";

/**
 * Get all API keys for an organization (masked)
 */
export const getApiKeys = query({
  args: {
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const keys = await ctx.db
      .query("organizationApiKeys")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    // Return keys with masked values and creator info
    return await Promise.all(
      keys.map(async (key) => {
        const creator = await ctx.db.get(key.createdBy);
        const decrypted = decrypt(key.keyValue);
        
        return {
          _id: key._id,
          name: key.name,
          service: key.service,
          maskedKey: maskApiKey(decrypted),
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt,
          createdBy: creator
            ? {
                _id: creator._id,
                firstName: creator.firstName,
                lastName: creator.lastName,
                email: creator.email,
              }
            : null,
        };
      })
    );
  },
});

/**
 * Get full API key (admin only, for copying)
 */
export const getFullKey = query({
  args: {
    keyId: v.id("organizationApiKeys"),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db.get(args.keyId);
    if (!key) {
      throw new Error("API key not found");
    }

    await requireOrgAdmin(ctx, key.orgId);

    return {
      keyValue: decrypt(key.keyValue),
    };
  },
});

