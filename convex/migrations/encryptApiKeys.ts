/**
 * Migration: Encrypt API Keys with AES-256-GCM
 *
 * This migration upgrades all project API keys from legacy base64 encoding
 * to proper AES-256-GCM encryption and adds hash-based indexing for O(1) lookups.
 *
 * IMPORTANT: Before running this migration:
 * 1. Set CONVEX_ENCRYPTION_KEY environment variable in Convex dashboard
 * 2. The key must be at least 32 characters long
 *
 * Run with: npx convex run migrations/encryptApiKeys:migrateAllApiKeys
 */

import { internalMutation } from "../_generated/server";
import {
  encryptAsync,
  decryptAsync,
  hashApiKey,
  getApiKeyPrefix,
  isNewEncryptionFormat,
  decrypt,
} from "../lib/utils/encryption";

/**
 * Migrate all project API keys to new encryption format
 */
export const migrateAllApiKeys = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allKeys = await ctx.db.query("projectApiKeys").collect();

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const key of allKeys) {
      try {
        // Check if already migrated (has keyHash or new encryption format)
        if (key.keyHash && isNewEncryptionFormat(key.keyValue)) {
          skippedCount++;
          continue;
        }

        // Decrypt with old method (base64)
        let plaintext: string;
        try {
          plaintext = decrypt(key.keyValue);
        } catch (e) {
          console.error(`Failed to decrypt key for project ${key.projectId}:`, e);
          errorCount++;
          continue;
        }

        // Validate plaintext looks like an API key
        if (!plaintext.startsWith("fp_proj_")) {
          console.warn(
            `Skipping invalid key format for project ${key.projectId}`
          );
          errorCount++;
          continue;
        }

        // Re-encrypt with new method and add hash
        const [encryptedKey, keyHash] = await Promise.all([
          encryptAsync(plaintext),
          hashApiKey(plaintext),
        ]);
        const keyPrefix = getApiKeyPrefix(plaintext);

        // Update the key record
        await ctx.db.patch(key._id, {
          keyValue: encryptedKey,
          keyHash,
          keyPrefix,
          updatedAt: Date.now(),
        });

        migratedCount++;
        console.log(`Migrated API key for project ${key.projectId}`);
      } catch (error) {
        console.error(
          `Error migrating key for project ${key.projectId}:`,
          error
        );
        errorCount++;
      }
    }

    const result = {
      total: allKeys.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errorCount,
    };

    console.log("Migration completed:", result);
    return result;
  },
});

/**
 * Migrate a single project's API key (for testing)
 */
export const migrateSingleApiKey = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get first unmigrated key
    const allKeys = await ctx.db.query("projectApiKeys").collect();

    const unmigrated = allKeys.find(
      (key) => !key.keyHash || !isNewEncryptionFormat(key.keyValue)
    );

    if (!unmigrated) {
      return { message: "No unmigrated keys found" };
    }

    // Decrypt with old method
    const plaintext = decrypt(unmigrated.keyValue);

    // Re-encrypt with new method and add hash
    const [encryptedKey, keyHash] = await Promise.all([
      encryptAsync(plaintext),
      hashApiKey(plaintext),
    ]);
    const keyPrefix = getApiKeyPrefix(plaintext);

    // Update the key record
    await ctx.db.patch(unmigrated._id, {
      keyValue: encryptedKey,
      keyHash,
      keyPrefix,
      updatedAt: Date.now(),
    });

    return {
      message: "Migrated successfully",
      projectId: unmigrated.projectId,
    };
  },
});

/**
 * Check migration status
 */
export const checkMigrationStatus = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allKeys = await ctx.db.query("projectApiKeys").collect();

    let migratedCount = 0;
    let legacyCount = 0;

    for (const key of allKeys) {
      if (key.keyHash && isNewEncryptionFormat(key.keyValue)) {
        migratedCount++;
      } else {
        legacyCount++;
      }
    }

    return {
      total: allKeys.length,
      migrated: migratedCount,
      legacy: legacyCount,
      percentComplete: allKeys.length > 0
        ? Math.round((migratedCount / allKeys.length) * 100)
        : 100,
    };
  },
});

/**
 * Verify a migrated key works correctly
 */
export const verifyMigration = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get a migrated key
    const allKeys = await ctx.db.query("projectApiKeys").collect();
    const migrated = allKeys.find(
      (key) => key.keyHash && isNewEncryptionFormat(key.keyValue)
    );

    if (!migrated) {
      return { message: "No migrated keys to verify" };
    }

    // Try to decrypt (decryptAsync is already imported at top of file)
    const decrypted = await decryptAsync(migrated.keyValue);

    // Verify format
    const isValidFormat = decrypted.startsWith("fp_proj_");

    // Verify hash matches
    const computedHash = await hashApiKey(decrypted);
    const hashMatches = computedHash === migrated.keyHash;

    // Verify prefix matches
    const computedPrefix = getApiKeyPrefix(decrypted);
    const prefixMatches = computedPrefix === migrated.keyPrefix;

    return {
      projectId: migrated.projectId,
      isValidFormat,
      hashMatches,
      prefixMatches,
      allVerified: isValidFormat && hashMatches && prefixMatches,
    };
  },
});
