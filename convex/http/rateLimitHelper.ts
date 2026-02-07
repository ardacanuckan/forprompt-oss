/**
 * Rate limiting helper for HTTP routes
 *
 * Provides utilities for applying rate limiting to HTTP endpoints
 * using the token bucket algorithm implemented in lib/rateLimit.ts
 */

import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import {
  RATE_LIMITS,
  RateLimitType,
  createRateLimitHeaders,
} from "../lib/rateLimit";

/**
 * Rate limit check result with HTTP response helpers
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
  headers: Record<string, string>;
}

/**
 * Check rate limit for an HTTP request
 *
 * @param ctx - HTTP action context
 * @param limitType - Type of rate limit to apply
 * @param identifier - Unique identifier (API key, IP, etc.)
 * @returns Rate limit check result with headers
 */
export async function checkHttpRateLimit(
  ctx: ActionCtx,
  limitType: RateLimitType,
  identifier: string
): Promise<RateLimitCheckResult> {
  const config = RATE_LIMITS[limitType];

  if (!config) {
    // Unknown limit type - allow but log warning
    console.warn(`Unknown rate limit type: ${limitType}`);
    return {
      allowed: true,
      remaining: 0,
      headers: {},
    };
  }

  const result = await ctx.runMutation(internal.lib.rateLimit.checkRateLimit, {
    limitType,
    identifier,
  });

  return {
    allowed: result.allowed,
    remaining: result.remaining,
    retryAfter: result.retryAfter,
    headers: createRateLimitHeaders(result, config),
  };
}

/**
 * Create a rate limit exceeded response
 *
 * @param result - Rate limit check result
 * @returns HTTP Response with 429 status
 */
export function createRateLimitResponse(
  result: RateLimitCheckResult
): Response {
  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      retryAfter: result.retryAfter,
      message: `Too many requests. Please retry after ${result.retryAfter} seconds.`,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...result.headers,
      },
    }
  );
}

/**
 * Extract identifier from request for rate limiting
 *
 * Priority:
 * 1. API key (if present)
 * 2. X-Forwarded-For header (for proxied requests)
 * 3. Fallback to "anonymous"
 *
 * @param request - HTTP request
 * @returns Identifier string
 */
export function extractRateLimitIdentifier(request: Request): string {
  // First try API key
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    // Use first 16 chars of API key as identifier (enough for uniqueness)
    return `key:${apiKey.substring(0, 16)}`;
  }

  // Try X-Forwarded-For for proxied requests
  const forwardedFor = request.headers.get("X-Forwarded-For");
  if (forwardedFor) {
    // Use first IP in the chain
    const ip = forwardedFor.split(",")[0].trim();
    return `ip:${ip}`;
  }

  // Try CF-Connecting-IP (Cloudflare)
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    return `ip:${cfIp}`;
  }

  // Fallback
  return "anonymous";
}

/**
 * Add rate limit headers to an existing response
 *
 * @param response - Original response
 * @param result - Rate limit check result
 * @returns New response with rate limit headers
 */
export function addRateLimitHeaders(
  response: Response,
  result: RateLimitCheckResult
): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(result.headers)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
