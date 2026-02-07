/**
 * Webhook management HTTP routes
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

  // Query all project API keys and check if this key matches
  const projectKeys = await ctx.runQuery(
    internal.domains.projectApiKeys.queries.verifyApiKeyInternal,
    { apiKey }
  );

  return projectKeys;
}

/**
 * POST /api/webhooks
 * Register a webhook subscription
 *
 * Rate Limit: 10 requests per hour (webhook_register)
 */
export const registerWebhook = httpAction(async (ctx, request) => {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing X-API-Key header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Check rate limit - strict limit for webhook registration
  const rateLimitId = extractRateLimitIdentifier(request);
  const rateLimitResult = await checkHttpRateLimit(ctx, "webhook_register", rateLimitId);
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
    const body = await request.json();
    const { endpointUrl, events, metadata } = body;

    if (!endpointUrl || !events || !Array.isArray(events)) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Missing required fields: endpointUrl, events" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    const result = await ctx.runMutation(
      internal.domains.webhooks.mutations.registerWebhookInternal,
      {
        projectId,
        endpointUrl,
        events,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
      }
    );

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({
          subscriptionId: result.subscriptionId,
          secret: result.secret,
          message:
            "Webhook registered successfully. Keep the secret safe for signature verification.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error registering webhook:", error);
    const message = error instanceof Error ? error.message : "Failed to register webhook";
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
 * GET /api/webhooks
 * List all webhooks for the project
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 */
export const listWebhooks = httpAction(async (ctx, request) => {
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
    const webhooks = await ctx.runQuery(
      internal.domains.webhooks.queries.listWebhooksInternal,
      { projectId }
    );

    return addRateLimitHeaders(
      new Response(JSON.stringify({ webhooks }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error listing webhooks:", error);
    const message = error instanceof Error ? error.message : "Failed to list webhooks";
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
 * DELETE /api/webhooks/:id
 * Delete a webhook subscription
 *
 * Rate Limit: 200 requests per minute (prompt_fetch)
 */
export const deleteWebhook = httpAction(async (ctx, request) => {
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
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const subscriptionId = pathParts[pathParts.length - 1] as Id<"webhookSubscriptions">;

    if (!subscriptionId) {
      return addRateLimitHeaders(
        new Response(
          JSON.stringify({ error: "Webhook subscription ID is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        ),
        rateLimitResult
      );
    }

    await ctx.runMutation(internal.domains.webhooks.mutations.deleteWebhookInternal, {
      subscriptionId,
      projectId,
    });

    return addRateLimitHeaders(
      new Response(
        JSON.stringify({ message: "Webhook deleted successfully" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      ),
      rateLimitResult
    );
  } catch (error: unknown) {
    console.error("Error deleting webhook:", error);
    const message = error instanceof Error ? error.message : "Failed to delete webhook";
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
