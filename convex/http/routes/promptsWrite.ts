/**
 * Prompt Write API HTTP routes (for MCP and SDK)
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
 * POST /api/prompts
 * Create a new prompt
 *
 * Headers:
 *   - X-API-Key: Project API key (required)
 *
 * Body:
 *   - key: Prompt key (required)
 *   - name: Prompt name (required)
 *   - description: Prompt description (optional)
 *   - systemPrompt: Initial system prompt content (optional)
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 *
 * Response:
 *   { promptId, key, versionId?, versionNumber? }
 */
export const createPrompt = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  let body: {
    key?: string;
    name?: string;
    description?: string;
    systemPrompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }

  if (!body.key || !body.name) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: "Missing required fields: key, name" }),
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
        new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        rateLimitResult
      );
    }

    const result = await ctx.runMutation(
      internal.domains.promptOrchestrator.internalMutations.createPromptInternal,
      {
        projectId: project.projectId as Id<"projects">,
        key: body.key,
        name: body.name,
        description: body.description,
        systemPrompt: body.systemPrompt,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          promptId: result.promptId,
          key: body.key,
          versionId: result.versionId,
          versionNumber: result.versionNumber,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("Error creating prompt:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("already exists") ? 409 : 500;
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }
});

/**
 * PUT /api/prompts
 * Update an existing prompt
 *
 * Headers:
 *   - X-API-Key: Project API key (required)
 *
 * Body:
 *   - key: Prompt key (required)
 *   - name, description, purpose, expectedBehavior, etc. (optional)
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 *
 * Response:
 *   { success, promptId }
 */
export const updatePrompt = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  let body: {
    key?: string;
    name?: string;
    description?: string;
    purpose?: string;
    expectedBehavior?: string;
    inputFormat?: string;
    outputFormat?: string;
    constraints?: string;
    useCases?: string;
    additionalNotes?: string;
    toolsNotes?: string;
  };

  try {
    body = await request.json();
  } catch {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }

  if (!body.key) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: "Missing required field: key" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  try {
    const project = await ctx.runQuery(
      internal.domains.cliAuth.queries.getProjectByApiKey,
      { apiKey }
    );

    if (!project) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        rateLimitResult
      );
    }

    const { key, ...updates } = body;

    const result = await ctx.runMutation(
      internal.domains.promptOrchestrator.internalMutations.updatePromptInternal,
      {
        projectId: project.projectId as Id<"projects">,
        key,
        ...updates,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          promptId: result.promptId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("Error updating prompt:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }
});

/**
 * POST /api/prompts/versions
 * Create a new version for a prompt
 *
 * Headers:
 *   - X-API-Key: Project API key (required)
 *
 * Body:
 *   - key: Prompt key (required)
 *   - systemPrompt: System prompt content (required)
 *   - description: Version description (optional)
 *   - setAsActive: Whether to set as active version (optional, default true)
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 *
 * Response:
 *   { success, versionId, versionNumber }
 */
export const createVersion = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  let body: {
    key?: string;
    systemPrompt?: string;
    description?: string;
    setAsActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }

  if (!body.key || !body.systemPrompt) {
    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ error: "Missing required fields: key, systemPrompt" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  }

  try {
    const project = await ctx.runQuery(
      internal.domains.cliAuth.queries.getProjectByApiKey,
      { apiKey }
    );

    if (!project) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        rateLimitResult
      );
    }

    const result = await ctx.runMutation(
      internal.domains.promptOrchestrator.internalMutations.createVersionInternal,
      {
        projectId: project.projectId as Id<"projects">,
        key: body.key,
        systemPrompt: body.systemPrompt,
        description: body.description,
        setAsActive: body.setAsActive,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          success: true,
          versionId: result.versionId,
          versionNumber: result.versionNumber,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error) {
    console.error("Error creating version:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }
});

/**
 * DELETE /api/prompts
 * Delete a prompt
 *
 * Headers:
 *   - X-API-Key: Project API key (required)
 *
 * Query params:
 *   - key: Prompt key (required)
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 *
 * Response:
 *   { success: true }
 */
export const deletePrompt = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "prompt_fetch", rateLimitId);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult);
  }

  if (!key) {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: "Missing key parameter" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }

  try {
    const project = await ctx.runQuery(
      internal.domains.cliAuth.queries.getProjectByApiKey,
      { apiKey }
    );

    if (!project) {
      return addRateLimitHeaders(
        new Response(JSON.stringify({ error: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
        rateLimitResult
      );
    }

    await ctx.runMutation(
      internal.domains.promptOrchestrator.internalMutations.deletePromptInternal,
      {
        projectId: project.projectId as Id<"projects">,
        key,
      }
    );

    return addRateLimitHeaders(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  } catch (error) {
    console.error("Error deleting prompt:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    const status = message.includes("not found") ? 404 : 500;
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  }
});
