/**
 * Project API key queries
 *
 * SECURITY: API key verification uses O(1) hash-based lookup
 * instead of O(n) full table scan with decryption.
 */

import { v } from "convex/values";
import { query, internalQuery } from "../../_generated/server";
import { requireAuth } from "../../lib/auth/permissions";
import {
  decrypt,
  decryptAsync,
  maskApiKey,
  hashApiKey,
  getApiKeyPrefix,
  constantTimeEqual,
  isNewEncryptionFormat,
} from "../../lib/utils/encryption";

/**
 * Get masked API key for a project
 */
export const getProjectApiKey = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!apiKey) {
      return null;
    }

    // Use async decryption for new format, sync for legacy
    const decrypted = isNewEncryptionFormat(apiKey.keyValue)
      ? await decryptAsync(apiKey.keyValue)
      : decrypt(apiKey.keyValue);

    const creator = await ctx.db.get(apiKey.createdBy);

    return {
      _id: apiKey._id,
      maskedKey: maskApiKey(decrypted),
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      createdBy: creator
        ? {
            _id: creator._id,
            firstName: creator.firstName,
            lastName: creator.lastName,
            email: creator.email,
          }
        : null,
    };
  },
});

/**
 * Get full decrypted API key (for copying)
 */
export const getFullProjectApiKey = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const apiKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!apiKey) {
      return null;
    }

    // Use async decryption for new format, sync for legacy
    const decrypted = isNewEncryptionFormat(apiKey.keyValue)
      ? await decryptAsync(apiKey.keyValue)
      : decrypt(apiKey.keyValue);

    return {
      keyValue: decrypted,
    };
  },
});

/**
 * Verify API key and return project ID (internal use for HTTP API)
 *
 * SECURITY: Uses O(1) hash-based lookup with the by_prefix_hash index.
 * Falls back to O(n) scan for legacy keys without hash (during migration).
 */
export const verifyApiKeyInternal = internalQuery({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = args.apiKey;

    // Extract prefix and compute hash for O(1) lookup
    const prefix = getApiKeyPrefix(apiKey);
    const keyHash = await hashApiKey(apiKey);

    // Try O(1) lookup with hash index first
    const keyByHash = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_prefix_hash", (q) =>
        q.eq("keyPrefix", prefix).eq("keyHash", keyHash)
      )
      .first();

    if (keyByHash) {
      // Verify with constant-time comparison to prevent timing attacks
      const decrypted = isNewEncryptionFormat(keyByHash.keyValue)
        ? await decryptAsync(keyByHash.keyValue)
        : decrypt(keyByHash.keyValue);

      if (constantTimeEqual(decrypted, apiKey)) {
        return keyByHash.projectId;
      }
      // Hash collision (extremely rare) - continue to fallback
    }

    // Fallback: O(n) scan for legacy keys without keyHash field
    // This will be removed after migration is complete
    const allKeys = await ctx.db.query("projectApiKeys").collect();

    for (const key of allKeys) {
      // Skip keys that already have hash (already checked above)
      if (key.keyHash) {
        continue;
      }

      const decrypted = isNewEncryptionFormat(key.keyValue)
        ? await decryptAsync(key.keyValue)
        : decrypt(key.keyValue);

      if (constantTimeEqual(decrypted, apiKey)) {
        console.warn(
          `MIGRATION: Legacy API key found for project ${key.projectId}. ` +
          "Run migration to add keyHash for O(1) lookup."
        );
        return key.projectId;
      }
    }

    return null;
  },
});

