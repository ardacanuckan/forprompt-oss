/**
 * Rate limiting utilities using token bucket algorithm
 *
 * SECURITY: Implements distributed rate limiting using Convex database
 * to prevent DoS attacks and API abuse.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";

/**
 * Rate limit configuration for different endpoint types
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Prefix for the rate limit key */
  keyPrefix: string;
}

/**
 * Rate limit configurations for different operations
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // API key verification - 100 requests per minute
  api_key_verify: {
    windowMs: 60_000,
    maxRequests: 100,
    keyPrefix: "verify:",
  },

  // Prompt fetch - 200 requests per minute
  prompt_fetch: {
    windowMs: 60_000,
    maxRequests: 200,
    keyPrefix: "fetch:",
  },

  // Log span - 500 requests per minute
  log_span: {
    windowMs: 60_000,
    maxRequests: 500,
    keyPrefix: "log:",
  },

  // Webhook registration - 10 requests per hour
  webhook_register: {
    windowMs: 3_600_000,
    maxRequests: 10,
    keyPrefix: "webhook:",
  },

  // CLI operations - 60 requests per minute
  cli_operation: {
    windowMs: 60_000,
    maxRequests: 60,
    keyPrefix: "cli:",
  },

  // AI operations (streaming, analysis) - 30 requests per minute
  ai_operation: {
    windowMs: 60_000,
    maxRequests: 30,
    keyPrefix: "ai:",
  },
};

export type RateLimitType = keyof typeof RATE_LIMITS;

/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining tokens (requests) in the current window */
  remaining: number;
  /** Seconds until the rate limit resets (only if not allowed) */
  retryAfter?: number;
}

/**
 * Check rate limit for an operation
 *
 * Uses token bucket algorithm:
 * - Each identifier gets a bucket with maxRequests tokens
 * - Tokens are consumed on each request
 * - Tokens refill after windowMs has passed
 *
 * @param limitType - The type of rate limit to check
 * @param identifier - Unique identifier (API key hash, IP address, etc.)
 * @returns Rate limit check result
 */
export const checkRateLimit = internalMutation({
  args: {
    limitType: v.string(),
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    const config = RATE_LIMITS[args.limitType as RateLimitType];

    if (!config) {
      console.error(`Unknown rate limit type: ${args.limitType}`);
      // Fail open for unknown types (allow request but log error)
      return { allowed: true, remaining: 0 };
    }

    const key = `${config.keyPrefix}${args.identifier}`;
    const now = Date.now();

    // Find existing bucket
    const bucket = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!bucket) {
      // Create new bucket with one token consumed
      await ctx.db.insert("rateLimitBuckets", {
        key,
        tokens: config.maxRequests - 1,
        lastRefill: now,
      });

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
      };
    }

    // Calculate token refill
    const elapsed = now - bucket.lastRefill;
    const windowsPassed = Math.floor(elapsed / config.windowMs);

    // Calculate new token count
    let newTokens = bucket.tokens;
    let newLastRefill = bucket.lastRefill;

    if (windowsPassed > 0) {
      // Refill tokens for each window that has passed
      newTokens = Math.min(
        config.maxRequests,
        bucket.tokens + windowsPassed * config.maxRequests
      );
      newLastRefill = bucket.lastRefill + windowsPassed * config.windowMs;
    }

    // Check if we have tokens available
    if (newTokens < 1) {
      const timeUntilRefill = config.windowMs - (now - newLastRefill);
      const retryAfter = Math.ceil(timeUntilRefill / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    // Consume one token
    await ctx.db.patch(bucket._id, {
      tokens: newTokens - 1,
      lastRefill: newLastRefill,
    });

    return {
      allowed: true,
      remaining: newTokens - 1,
    };
  },
});

/**
 * Get current rate limit status without consuming a token
 */
export const getRateLimitStatus = internalQuery({
  args: {
    limitType: v.string(),
    identifier: v.string(),
  },
  handler: async (ctx, args): Promise<RateLimitResult> => {
    const config = RATE_LIMITS[args.limitType as RateLimitType];

    if (!config) {
      return { allowed: true, remaining: 0 };
    }

    const key = `${config.keyPrefix}${args.identifier}`;
    const now = Date.now();

    const bucket = await ctx.db
      .query("rateLimitBuckets")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();

    if (!bucket) {
      return {
        allowed: true,
        remaining: config.maxRequests,
      };
    }

    // Calculate current token count
    const elapsed = now - bucket.lastRefill;
    const windowsPassed = Math.floor(elapsed / config.windowMs);

    const currentTokens = Math.min(
      config.maxRequests,
      bucket.tokens + windowsPassed * config.maxRequests
    );

    if (currentTokens < 1) {
      const newLastRefill = bucket.lastRefill + windowsPassed * config.windowMs;
      const timeUntilRefill = config.windowMs - (now - newLastRefill);
      const retryAfter = Math.ceil(timeUntilRefill / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: currentTokens,
    };
  },
});

/**
 * Clean up expired rate limit buckets (run periodically)
 */
export const cleanupExpiredBuckets = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    const allBuckets = await ctx.db.query("rateLimitBuckets").collect();

    let deletedCount = 0;
    for (const bucket of allBuckets) {
      // Delete buckets that haven't been used in 24 hours
      if (now - bucket.lastRefill > maxAge) {
        await ctx.db.delete(bucket._id);
        deletedCount++;
      }
    }

    return { deletedCount };
  },
});

/**
 * Helper to create rate limit response headers
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
  };

  if (!result.allowed && result.retryAfter) {
    headers["Retry-After"] = String(result.retryAfter);
    headers["X-RateLimit-Reset"] = String(
      Math.floor(Date.now() / 1000) + result.retryAfter
    );
  }

  return headers;
}
