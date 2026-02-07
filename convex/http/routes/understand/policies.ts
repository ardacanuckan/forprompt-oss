/**
 * Understand Policies API HTTP routes
 */

import { api } from "../../../_generated/api";
import { httpAction } from "../../../_generated/server";

/**
 * GET /api/understand/policies
 * List all policies for organization
 */
export const listPolicies = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");

  if (!orgId) {
    return new Response(JSON.stringify({ error: "orgId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const policies = await ctx.runQuery(
      api.domains.understand.queries.listPolicies,
      {
        orgId: orgId as any,
      },
    );

    return new Response(JSON.stringify(policies), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing policies:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * POST /api/understand/policies
 * Create a new policy
 */
export const createPolicy = httpAction(async (ctx, request) => {
  let body: {
    orgId?: string;
    name?: string;
    description?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { orgId, name, description } = body;

  if (!orgId || !name) {
    return new Response(JSON.stringify({ error: "orgId and name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const policyId = await ctx.runMutation(
      api.domains.understand.mutations.createPolicy,
      {
        orgId: orgId as any,
        name,
        description,
      },
    );

    return new Response(JSON.stringify({ policyId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating policy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * GET /api/understand/policies/{id}
 * Get single policy with rules
 */
export const getPolicy = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const policyId = pathParts[pathParts.length - 1];

  if (!policyId) {
    return new Response(JSON.stringify({ error: "policyId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const policy = await ctx.runQuery(
      api.domains.understand.queries.getPolicy,
      {
        policyId: policyId as any,
      },
    );

    if (!policy) {
      return new Response(JSON.stringify({ error: "Policy not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(policy), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting policy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * PUT /api/understand/policies/{id}
 * Update policy
 */
export const updatePolicy = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const policyId = pathParts[pathParts.length - 1];

  let body: {
    name?: string;
    description?: string;
    isActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!policyId) {
    return new Response(JSON.stringify({ error: "policyId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await ctx.runMutation(api.domains.understand.mutations.updatePolicy, {
      policyId: policyId as any,
      ...body,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating policy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * DELETE /api/understand/policies/{id}
 * Delete policy (cascade to rules)
 */
export const deletePolicy = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const policyId = pathParts[pathParts.length - 1];

  if (!policyId) {
    return new Response(JSON.stringify({ error: "policyId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await ctx.runMutation(api.domains.understand.mutations.deletePolicy, {
      policyId: policyId as any,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error deleting policy:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
