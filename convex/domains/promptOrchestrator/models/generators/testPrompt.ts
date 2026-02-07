/**
 * Test prompt action - Tests a prompt with OpenRouter
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { chatWithUsageTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import type { TestPromptResult } from "../utils/types";

/**
 * Test a prompt with OpenRouter
 */
export const testPrompt = action({
  args: {
    versionId: v.id("promptVersions"),
    userMessage: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args): Promise<TestPromptResult> => {
    // Get the prompt version using internal query
    const version = await ctx.runQuery(internal.domains.promptOrchestrator.models.queries.getInternal, {
      versionId: args.versionId,
    });

    if (!version) {
      throw new Error("Prompt version not found");
    }

    // Get the prompt for org context
    const prompt = await ctx.runQuery(internal.domains.promptOrchestrator.queries.getByIdInternal, {
      promptId: version.promptId,
    });

    // Get organization context for usage tracking
    const orgId = prompt?.projectId
      ? await getOrgIdFromProject(ctx, prompt.projectId)
      : null;

    const startTime = Date.now();

    // Call AI API with usage tracking
    let content: string;
    let tokens: number;
    if (orgId) {
      const result = await chatWithUsageTracking(
        {
          ctx,
          orgId,
          projectId: prompt?.projectId,
          promptId: prompt?._id,
          versionId: args.versionId,
        },
        "testPrompt",
        {
          model: args.model,
          messages: [
            { role: "system", content: version.systemPrompt },
            { role: "user", content: args.userMessage },
          ],
          maxTokens: 2048,
        }
      );
      content = result.content;
      tokens = result.tokens;
    } else {
      const ai = await import("../../../../lib/ai");
      const result = await ai.chatWithUsage({
        model: args.model,
        messages: [
          { role: "system", content: version.systemPrompt },
          { role: "user", content: args.userMessage },
        ],
        maxTokens: 2048,
      });
      content = result.content;
      tokens = result.tokens;
    }

    const responseTime = Date.now() - startTime;

    // Record the test result using internal mutation
    await ctx.runMutation(internal.domains.promptOrchestrator.models.testing.recordTestResultInternal, {
      versionId: args.versionId,
      model: args.model,
      userMessage: args.userMessage,
      response: content,
      tokens,
      responseTime,
    });

    return {
      response: content,
      tokens,
      responseTime,
      model: args.model,
    };
  },
});

