/**
 * HTTP routes for conversation logging
 */

import { httpAction } from "../../_generated/server";
import { api, internal } from "../../_generated/api";
import {
  checkHttpRateLimit,
  createRateLimitResponse,
  extractRateLimitIdentifier,
  addRateLimitHeaders,
} from "../rateLimitHelper";

/**
 * POST /api/log - Log a span (message, LLM call, etc.)
 * Header: X-API-Key: fp_proj_xxx
 *
 * Rate Limit: 500 requests per minute (log_span)
 */
export const logSpan = httpAction(async (ctx, request) => {
  // Get API key from header
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "log_span", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Validate API key and get project
    const projectId = await ctx.runQuery(
      internal.domains.projectApiKeys.queries.verifyApiKeyInternal,
      { apiKey }
    );

    if (!projectId) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Invalid API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      traceId,
      promptKey,
      versionNumber,
      type,
      role,
      content,
      model,
      inputTokens,
      outputTokens,
      durationMs,
      source,
      metadata,
    } = body;

    // Validate required fields
    if (!traceId || !promptKey || !type) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "traceId, promptKey, and type are required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // Log the span
    const result = await ctx.runMutation(
      api.domains.logs.mutations.logSpan,
      {
        projectId,
        traceId,
        promptKey,
        versionNumber,
        type,
        role,
        content,
        model,
        inputTokens,
        outputTokens,
        durationMs,
        source,
        metadata,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error logging span:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }
});

/**
 * GET /api/logs - Get traces for a project
 * Header: X-API-Key: fp_proj_xxx
 * Query: ?promptKey=xxx&limit=50
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 */
export const getLogs = httpAction(async (ctx, request) => {
  // Get API key from header
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Validate API key and get project
    const projectId = await ctx.runQuery(
      internal.domains.projectApiKeys.queries.verifyApiKeyInternal,
      { apiKey }
    );

    if (!projectId) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Invalid API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const promptKey = url.searchParams.get("promptKey") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    // Get traces
    const traces = await ctx.runQuery(
      api.domains.logs.queries.getTraces,
      {
        projectId,
        promptKey,
        limit,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ traces }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error getting logs:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }
});

/**
 * GET /api/logs/{traceId} - Get a single trace with all spans
 * Header: X-API-Key: fp_proj_xxx
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 */
export const getLog = httpAction(async (ctx, request) => {
  // Get API key from header
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "API key required" }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Validate API key (we don't need projectId here but validate for security)
    const projectId = await ctx.runQuery(
      internal.domains.projectApiKeys.queries.verifyApiKeyInternal,
      { apiKey }
    );

    if (!projectId) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Invalid API key" }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // Extract traceId from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const traceId = pathParts[pathParts.length - 1];

    if (!traceId) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Trace ID required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // Get trace with spans
    const result = await ctx.runQuery(
      api.domains.logs.queries.getTraceWithSpans,
      { traceId }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error getting log:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: message }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }
});
