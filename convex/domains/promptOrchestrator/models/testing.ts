/**
 * Prompt version testing and test result tracking
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "../../../_generated/server";
import { NotFoundError } from "../../../lib/utils/errors";

/**
 * Record a test result and update version statistics
 */
export const recordTestResult = mutation({
  args: {
    versionId: v.id("promptVersions"),
    model: v.string(),
    userMessage: v.string(),
    response: v.string(),
    tokens: v.number(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new NotFoundError("Prompt version");
    }

    // Record the test result
    await ctx.db.insert("promptTestResults", {
      versionId: args.versionId,
      model: args.model,
      userMessage: args.userMessage,
      response: args.response,
      tokens: args.tokens,
      responseTime: args.responseTime,
      createdAt: Date.now(),
    });

    // Update version statistics
    const currentCount = version.testCount ?? 0;
    const currentAvgTokens = version.avgTokens ?? 0;
    const currentAvgTime = version.avgResponseTime ?? 0;

    const newCount = currentCount + 1;
    const newAvgTokens = (currentAvgTokens * currentCount + args.tokens) / newCount;
    const newAvgTime = (currentAvgTime * currentCount + args.responseTime) / newCount;

    await ctx.db.patch(args.versionId, {
      testCount: newCount,
      avgTokens: Math.round(newAvgTokens),
      avgResponseTime: Math.round(newAvgTime),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Internal: Record a test result (for actions)
 */
export const recordTestResultInternal = internalMutation({
  args: {
    versionId: v.id("promptVersions"),
    model: v.string(),
    userMessage: v.string(),
    response: v.string(),
    tokens: v.number(),
    responseTime: v.number(),
  },
  handler: async (ctx, args) => {
    const version = await ctx.db.get(args.versionId);
    if (!version) {
      throw new NotFoundError("Prompt version");
    }

    await ctx.db.insert("promptTestResults", {
      versionId: args.versionId,
      model: args.model,
      userMessage: args.userMessage,
      response: args.response,
      tokens: args.tokens,
      responseTime: args.responseTime,
      createdAt: Date.now(),
    });

    const currentCount = version.testCount ?? 0;
    const currentAvgTokens = version.avgTokens ?? 0;
    const currentAvgTime = version.avgResponseTime ?? 0;

    const newCount = currentCount + 1;
    const newAvgTokens = (currentAvgTokens * currentCount + args.tokens) / newCount;
    const newAvgTime = (currentAvgTime * currentCount + args.responseTime) / newCount;

    await ctx.db.patch(args.versionId, {
      testCount: newCount,
      avgTokens: Math.round(newAvgTokens),
      avgResponseTime: Math.round(newAvgTime),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

