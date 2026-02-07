/**
 * Understand Memory API HTTP routes
 */

import { api } from "../../../_generated/api";
import { httpAction } from "../../../_generated/server";

/**
 * GET /api/understand/memory/sync
 * Get all memory for CLI sync
 */
export const syncMemory = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    return new Response(JSON.stringify({ error: "orgId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const memory = await ctx.runQuery(
      api.domains.understand.memory.queries.listMemory,
      {
        orgId: orgId as any,
      },
    );

    return new Response(JSON.stringify(memory), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error syncing memory:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * POST /api/understand/memory
 * Push memory from CLI
 */
export const pushMemory = httpAction(async (ctx, request) => {
  let body: {
    orgId?: string;
    type?: string;
    key?: string;
    content?: string;
    context?: string;
    source?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { orgId, type, key, content, context, source } = body;

  if (!orgId || !type || !key || !content || !source) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: orgId, type, key, content, source",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const memoryId = await ctx.runMutation(
      api.domains.understand.memory.mutations.createMemory,
      {
        orgId: orgId as any,
        type,
        key,
        content,
        context,
        source,
      },
    );

    return new Response(JSON.stringify({ memoryId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error pushing memory:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
