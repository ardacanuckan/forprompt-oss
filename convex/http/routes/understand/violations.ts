/**
 * Understand Violations API HTTP routes
 */

import { api } from "../../../_generated/api";
import { httpAction } from "../../../_generated/server";

/**
 * GET /api/understand/violations
 * List violations with filters
 */
export const listViolations = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");
  const limit = url.searchParams.get("limit");

  if (!orgId) {
    return new Response(JSON.stringify({ error: "orgId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const violations = await ctx.runQuery(
      api.domains.understand.violations.queries.listViolations,
      {
        orgId: orgId as any,
        status: status || undefined,
        severity: severity || undefined,
        limit: limit ? parseInt(limit) : undefined,
      },
    );

    return new Response(JSON.stringify(violations), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error listing violations:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * POST /api/understand/violations
 * Create violation (for CLI)
 */
export const createViolation = httpAction(async (ctx, request) => {
  let body: {
    orgId?: string;
    ruleId?: string;
    ruleName?: string;
    file?: string;
    line?: number;
    column?: number;
    codeSnippet?: string;
    message?: string;
    severity?: string;
    projectId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const {
    orgId,
    ruleId,
    ruleName,
    file,
    line,
    column,
    codeSnippet,
    message,
    severity,
    projectId,
  } = body;

  if (
    !orgId ||
    !ruleId ||
    !ruleName ||
    !file ||
    !line ||
    !message ||
    !severity
  ) {
    return new Response(
      JSON.stringify({
        error:
          "Missing required fields: orgId, ruleId, ruleName, file, line, message, severity",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    const violationId = await ctx.runMutation(
      api.domains.understand.violations.mutations.createViolation,
      {
        orgId: orgId as any,
        ruleId: ruleId as any,
        ruleName,
        file,
        line,
        column,
        codeSnippet,
        message,
        severity,
        projectId: projectId as any,
      },
    );

    return new Response(JSON.stringify({ violationId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating violation:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

/**
 * PATCH /api/understand/violations/{id}
 * Update violation status
 */
export const updateViolationStatus = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const violationId = pathParts[pathParts.length - 1];

  let body: {
    status?: string;
    approvalReason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!violationId) {
    return new Response(JSON.stringify({ error: "violationId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.status) {
    return new Response(JSON.stringify({ error: "status required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await ctx.runMutation(
      api.domains.understand.violations.mutations.updateViolationStatus,
      {
        violationId: violationId as any,
        status: body.status,
        approvalReason: body.approvalReason,
      },
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error updating violation status:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
