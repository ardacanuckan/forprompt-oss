/**
 * Violation mutations
 */

import { v } from "convex/values";

import { mutation } from "../../../_generated/server";
import { requireAuth, requireOrgAccess } from "../../../lib/auth/permissions";
import { NotFoundError } from "../../../lib/utils/errors";

/**
 * Create a single violation
 */
export const createViolation = mutation({
  args: {
    orgId: v.id("organizations"),
    ruleId: v.id("understandRules"),
    ruleName: v.string(),
    file: v.string(),
    line: v.number(),
    column: v.optional(v.number()),
    codeSnippet: v.optional(v.string()),
    message: v.string(),
    severity: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await requireOrgAccess(ctx, args.orgId);

    const now = Date.now();
    const violationId = await ctx.db.insert("understandViolations", {
      orgId: args.orgId,
      projectId: args.projectId,
      ruleId: args.ruleId,
      ruleName: args.ruleName,
      file: args.file,
      line: args.line,
      column: args.column,
      codeSnippet: args.codeSnippet,
      message: args.message,
      severity: args.severity,
      status: "flagged",
      createdAt: now,
    });

    return violationId;
  },
});

/**
 * Create multiple violations in batch
 */
export const createViolationsBatch = mutation({
  args: {
    orgId: v.id("organizations"),
    violations: v.array(
      v.object({
        ruleId: v.id("understandRules"),
        ruleName: v.string(),
        file: v.string(),
        line: v.number(),
        column: v.optional(v.number()),
        codeSnippet: v.optional(v.string()),
        message: v.string(),
        severity: v.string(),
        projectId: v.optional(v.id("projects")),
      }),
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    await requireOrgAccess(ctx, args.orgId);

    const now = Date.now();
    const violationIds = await Promise.all(
      args.violations.map((violation) =>
        ctx.db.insert("understandViolations", {
          orgId: args.orgId,
          projectId: violation.projectId,
          ruleId: violation.ruleId,
          ruleName: violation.ruleName,
          file: violation.file,
          line: violation.line,
          column: violation.column,
          codeSnippet: violation.codeSnippet,
          message: violation.message,
          severity: violation.severity,
          status: "flagged",
          createdAt: now,
        }),
      ),
    );

    return violationIds;
  },
});

/**
 * Update violation status
 */
export const updateViolationStatus = mutation({
  args: {
    violationId: v.id("understandViolations"),
    status: v.string(), // "flagged" | "fixed" | "approved" | "ignored"
    approvalReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx);

    const violation = await ctx.db.get(args.violationId);
    if (!violation) {
      throw new NotFoundError("Violation");
    }

    await requireOrgAccess(ctx, violation.orgId);

    const now = Date.now();
    await ctx.db.patch(args.violationId, {
      status: args.status,
      resolvedBy: userId,
      resolvedAt: now,
      approvalReason: args.approvalReason,
    });

    return args.violationId;
  },
});

/**
 * Delete violation (soft delete by setting status)
 */
export const deleteViolation = mutation({
  args: {
    violationId: v.id("understandViolations"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const violation = await ctx.db.get(args.violationId);
    if (!violation) {
      throw new NotFoundError("Violation");
    }

    await requireOrgAccess(ctx, violation.orgId);

    // Soft delete by setting status to ignored
    await ctx.db.patch(args.violationId, {
      status: "ignored",
    });

    return args.violationId;
  },
});
