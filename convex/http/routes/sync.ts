/**
 * Sync HTTP routes for bulk prompt synchronization
 */

import { httpAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import {
  checkHttpRateLimit,
  createRateLimitResponse,
  extractRateLimitIdentifier,
  addRateLimitHeaders,
} from "../rateLimitHelper";

/**
 * Verify API key and get project
 */
async function verifyApiKey(
  ctx: ActionCtx,
  apiKey: string | null
): Promise<Id<"projects"> | null> {
  if (!apiKey) {
    return null;
  }

  const projectKeys = await ctx.runQuery(
    internal.domains.projectApiKeys.queries.verifyApiKeyInternal,
    { apiKey }
  );

  return projectKeys;
}

/**
 * GET /api/sync
 * Sync all prompts for a project
 *
 * Returns all prompts with their active versions
 *
 * Rate Limit: 60 requests per minute (cli_operation)
 */
export const syncPrompts = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "cli_operation", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  const projectId = await verifyApiKey(ctx, apiKey);
  if (!projectId) {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }

  try {
    // Get all prompts for the project
    const prompts = await ctx.runQuery(
      internal.domains.promptOrchestrator.queries.listPromptsInternal,
      { projectId }
    );

    // Transform prompts to include full version data
    const promptsWithVersions = await Promise.all(
      prompts.map(async (prompt) => {
        if (!prompt.activeVersionId) {
          return {
            key: prompt.key,
            name: prompt.name,
            description: prompt.description,
            versionNumber: 0,
            systemPrompt: "",
            updatedAt: prompt.updatedAt,
            purpose: prompt.purpose,
            expectedBehavior: prompt.expectedBehavior,
            inputFormat: prompt.inputFormat,
            outputFormat: prompt.outputFormat,
            constraints: prompt.constraints,
            useCases: prompt.useCases,
            additionalNotes: prompt.additionalNotes,
            toolsNotes: prompt.toolsNotes,
          };
        }

        const version = await ctx.runQuery(
          internal.domains.promptOrchestrator.models.queries.getVersionInternal,
          { versionId: prompt.activeVersionId }
        );

        return {
          key: prompt.key,
          name: prompt.name,
          description: prompt.description,
          versionNumber: version?.versionNumber ?? 0,
          systemPrompt: version?.systemPrompt ?? "",
          updatedAt: version?.updatedAt ?? prompt.updatedAt,
          purpose: prompt.purpose,
          expectedBehavior: prompt.expectedBehavior,
          inputFormat: prompt.inputFormat,
          outputFormat: prompt.outputFormat,
          constraints: prompt.constraints,
          useCases: prompt.useCases,
          additionalNotes: prompt.additionalNotes,
          toolsNotes: prompt.toolsNotes,
        };
      })
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          projectId,
          syncedAt: Date.now(),
          prompts: promptsWithVersions,
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
  } catch (error: unknown) {
    console.error("Error syncing prompts:", error);
    const message = error instanceof Error ? error.message : "Failed to sync prompts";
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
