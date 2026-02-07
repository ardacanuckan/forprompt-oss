/**
 * Prompt API HTTP routes
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import {
  checkHttpRateLimit,
  createRateLimitResponse,
  extractRateLimitIdentifier,
  addRateLimitHeaders,
} from "../rateLimitHelper";

/**
 * GET /api/prompts
 * Returns the active version of a prompt by its key
 *
 * Query params:
 *   - key: Prompt key (required)
 *   - version: Specific version number (optional)
 *
 * Headers:
 *   - X-API-Key: Project API key (required)
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 *
 * Response:
 *   { key, name, versionNumber, systemPrompt, ... }
 */
export const getPromptByKey = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const versionParam = url.searchParams.get("version");
  const apiKey = request.headers.get("X-API-Key");

  // Validate API key
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "Missing X-API-Key header" }),
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

  if (!key) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: "Missing key parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  try {
    // Get project from API key
    const project = await ctx.runQuery(
      internal.domains.cliAuth.queries.getProjectByApiKey,
      { apiKey }
    );

    if (!project) {
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

    const promptWithVersion = await ctx.runQuery(
      internal.domains.promptOrchestrator.queries.getByKeyInternal,
      {
        projectId: project.projectId as Id<"projects">,
        key,
      }
    );

    if (!promptWithVersion) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: `Prompt with key "${key}" not found` }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    if (!promptWithVersion.activeVersion) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: `No active version for prompt "${key}"` }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    // TODO: Handle specific version request if versionParam is provided

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          key: promptWithVersion.key,
          name: promptWithVersion.name,
          description: promptWithVersion.description,
          versionNumber: promptWithVersion.activeVersion.versionNumber,
          systemPrompt: promptWithVersion.activeVersion.systemPrompt,
          updatedAt: promptWithVersion.activeVersion.updatedAt,
          // Additional metadata
          purpose: promptWithVersion.purpose,
          expectedBehavior: promptWithVersion.expectedBehavior,
          inputFormat: promptWithVersion.inputFormat,
          outputFormat: promptWithVersion.outputFormat,
          constraints: promptWithVersion.constraints,
          useCases: promptWithVersion.useCases,
          additionalNotes: promptWithVersion.additionalNotes,
          toolsNotes: promptWithVersion.toolsNotes,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: "Internal server error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }
});

