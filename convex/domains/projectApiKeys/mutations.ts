/**
 * Project API key mutations
 *
 * SECURITY: All new API keys are encrypted with AES-256-GCM
 * and include keyHash for O(1) lookup.
 */

import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { requireAuth } from "../../lib/auth/permissions";
import {
  encryptAsync,
  generateSecureApiKey,
  hashApiKey,
  getApiKeyPrefix,
} from "../../lib/utils/encryption";
import { NotFoundError } from "../../lib/utils/errors";

/**
 * Generate API key for a project (called during project creation)
 *
 * Creates a new API key with:
 * - AES-256-GCM encrypted keyValue
 * - SHA-256 hash for O(1) lookup
 * - Prefix for index optimization
 */
export const generateApiKey = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new NotFoundError("Project");
    }

    // Check if API key already exists
    const existingKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (existingKey) {
      // If key already exists, return the existing one (idempotent)
      return { success: true, keyId: existingKey._id };
    }

    // Generate new API key with cryptographic randomness
    const apiKey = generateSecureApiKey();
    const now = Date.now();

    // Encrypt and hash for secure storage and O(1) lookup
    const [encryptedKey, keyHash] = await Promise.all([
      encryptAsync(apiKey),
      hashApiKey(apiKey),
    ]);
    const keyPrefix = getApiKeyPrefix(apiKey);

    const keyId = await ctx.db.insert("projectApiKeys", {
      projectId: args.projectId,
      keyValue: encryptedKey,
      keyHash,
      keyPrefix,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });

    return { success: true, keyId };
  },
});

/**
 * Regenerate API key for a project
 *
 * Generates a new secure API key with:
 * - AES-256-GCM encryption
 * - Updated hash for O(1) lookup
 */
export const regenerateApiKey = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    // Verify project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new NotFoundError("Project");
    }

    // Find existing key
    const existingKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!existingKey) {
      throw new NotFoundError("API key for this project");
    }

    // Generate new API key with cryptographic randomness
    const newApiKey = generateSecureApiKey();
    const now = Date.now();

    // Encrypt and hash for secure storage and O(1) lookup
    const [encryptedKey, keyHash] = await Promise.all([
      encryptAsync(newApiKey),
      hashApiKey(newApiKey),
    ]);
    const keyPrefix = getApiKeyPrefix(newApiKey);

    // Update the existing key with new encrypted value and hash
    await ctx.db.patch(existingKey._id, {
      keyValue: encryptedKey,
      keyHash,
      keyPrefix,
      updatedAt: now,
      createdBy: userId,
    });

    return { success: true, keyId: existingKey._id };
  },
});

/**
 * Delete API key for a project
 */
export const deleteApiKey = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Find existing key
    const existingKey = await ctx.db
      .query("projectApiKeys")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (!existingKey) {
      throw new NotFoundError("API key for this project");
    }

    await ctx.db.delete(existingKey._id);

    return { success: true };
  },
});

