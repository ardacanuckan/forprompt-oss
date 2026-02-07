/**
 * CLI HTTP Routes
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import {
  checkHttpRateLimit,
  createRateLimitResponse,
  extractRateLimitIdentifier,
  addRateLimitHeaders,
} from "../rateLimitHelper";

/**
 * Deploy - Get all prompts for a project
 * GET /api/cli/deploy
 * Requires X-API-Key header
 *
 * Rate Limit: 60 requests per minute (cli_operation)
 */
export const deploy = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "cli_operation", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    // Verify API key and get project
    const project = await ctx.runQuery(internal.domains.cliAuth.queries.getProjectByApiKey, {
      apiKey,
    });

    if (!project) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        ),
        rateLimitResult
      );
    }

    // Get all prompts for the project
    const prompts = await ctx.runQuery(internal.domains.promptOrchestrator.queries.getPromptsForDeploy, {
      projectId: project.projectId,
    });

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          project: {
            id: project.projectId,
            name: project.projectName,
            slug: project.projectSlug,
          },
          prompts,
          deployedAt: Date.now(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
      rateLimitResult
    );
  }
});

/**
 * Validate API key and return project info
 * GET /api/cli/validate
 * Requires X-API-Key header
 *
 * Rate Limit: 60 requests per minute (cli_operation)
 */
export const validateApiKey = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "cli_operation", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const project = await ctx.runQuery(internal.domains.cliAuth.queries.getProjectByApiKey, {
      apiKey,
    });

    if (!project) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        ),
        rateLimitResult
      );
    }

    return addRateLimitHeaders(
      new Response(JSON.stringify({ valid: true, project }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  } catch (error) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      ),
      rateLimitResult
    );
  }
});
