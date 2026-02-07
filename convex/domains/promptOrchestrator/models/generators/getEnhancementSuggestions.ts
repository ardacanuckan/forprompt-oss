/**
 * Get enhancement suggestions action - Gets AI suggestions for improving a prompt
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildEnhancementSuggestionsPrompt } from "../builders/enhancementBuilder";
import type { EnhancementSuggestionsResult } from "../utils/types";

/**
 * Get enhancement suggestions for a prompt with line-specific recommendations
 */
export const getEnhancementSuggestions = action({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args): Promise<EnhancementSuggestionsResult> => {
    const version = await ctx.runQuery(internal.domains.promptOrchestrator.models.queries.getInternal, {
      versionId: args.versionId,
    });

    if (!version) {
      throw new Error("Prompt version not found");
    }

    // Get prompt information and tools
    const prompt = await ctx.runQuery(internal.domains.promptOrchestrator.queries.getByIdInternal, {
      promptId: version.promptId,
    });

    const promptTools = await ctx.runQuery(internal.domains.tools.queries.getPromptToolsInternal, {
      promptId: version.promptId,
    });

    // Build the enhancement suggestions prompt
    const enhancementPrompt = buildEnhancementSuggestionsPrompt({
      systemPrompt: version.systemPrompt,
      purpose: prompt?.purpose,
      expectedBehavior: prompt?.expectedBehavior,
      tools: promptTools
        ?.map((pt) =>
          pt.tool
            ? {
                name: pt.tool.name,
                description: pt.tool.description,
              }
            : null
        )
        .filter((t): t is NonNullable<typeof t> => t !== null),
    });

    // Get organization context for usage tracking
    const orgId = prompt?.projectId
      ? await getOrgIdFromProject(ctx, prompt.projectId)
      : null;

    // Call AI with usage tracking
    let content: string;
    if (orgId) {
      content = await chatWithTracking(
        {
          ctx,
          orgId,
          projectId: prompt?.projectId,
          promptId: prompt?._id,
          versionId: args.versionId,
        },
        "getEnhancementSuggestions",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: enhancementPrompt }],
          maxTokens: 2048,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: enhancementPrompt }],
        maxTokens: 2048,
      });
    }

    try {
      // Use robust JSON parser that handles markdown blocks
      const result = parseJSONResponse<{
        suggestions?: Array<{
          id: string;
          issue: string;
          suggestion: string;
          enhancedText: string;
          priority: "high" | "medium" | "low";
        }>;
      }>(content);

      if (!result) {
        throw new Error("Could not extract valid JSON from AI response");
      }

      return {
        suggestions: result.suggestions || [],
      };
    } catch (error) {
      console.error("Enhancement suggestions parsing failed:", error);
      
      // Return empty suggestions on parse failure
      return {
        suggestions: [],
      };
    }
  },
});

