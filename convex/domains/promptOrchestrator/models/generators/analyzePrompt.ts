/**
 * Analyze prompt action - Analyzes a prompt using AI
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildAnalysisPrompt } from "../builders/analysisBuilder";
import type { AnalyzePromptResult } from "../utils/types";

/**
 * Analyze a prompt using AI with prompt information and tool context
 */
export const analyzePrompt = action({
  args: {
    versionId: v.id("promptVersions"),
  },
  handler: async (ctx, args): Promise<AnalyzePromptResult> => {
    const version = await ctx.runQuery(internal.domains.promptOrchestrator.models.queries.getInternal, {
      versionId: args.versionId,
    });

    if (!version) {
      throw new Error("Prompt version not found");
    }

    // Get prompt information
    const prompt = await ctx.runQuery(internal.domains.promptOrchestrator.queries.getByIdInternal, {
      promptId: version.promptId,
    });

    // Get linked tools
    const promptTools = await ctx.runQuery(internal.domains.tools.queries.getPromptToolsInternal, {
      promptId: version.promptId,
    });

    // Build the analysis prompt
    const analysisPrompt = buildAnalysisPrompt({
      systemPrompt: version.systemPrompt,
      purpose: prompt?.purpose,
      expectedBehavior: prompt?.expectedBehavior,
      inputFormat: prompt?.inputFormat,
      outputFormat: prompt?.outputFormat,
      constraints: prompt?.constraints,
      useCases: prompt?.useCases,
      tools: promptTools
        ?.map((pt) =>
          pt.tool
            ? {
                name: pt.tool.name,
                description: pt.tool.description,
                isRequired: pt.isRequired,
                usageNotes: pt.usageNotes,
              }
            : null
        )
        .filter((t): t is NonNullable<typeof t> => t !== null),
      toolsNotes: prompt?.toolsNotes,
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
        "analyzePrompt",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: analysisPrompt }],
          maxTokens: 2048,
        }
      );
    } else {
      // Fallback to untracked chat if org context not available
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: analysisPrompt }],
        maxTokens: 2048,
      });
    }

    try {
      // Use robust JSON parser that handles markdown blocks
      const analysis = parseJSONResponse<{
        clarityScore?: number;
        improvements?: string[];
        edgeCases?: string[];
        optimizations?: string[];
        overallAssessment?: string;
        alignmentCheck?: any;
        toolUsageAnalysis?: any;
      }>(content);

      if (!analysis) {
        throw new Error("Could not extract valid JSON from AI response");
      }

      const result: AnalyzePromptResult = {
        clarityScore: analysis.clarityScore ?? 5,
        improvements: analysis.improvements ?? [],
        edgeCases: analysis.edgeCases ?? [],
        optimizations: analysis.optimizations ?? [],
        overallAssessment: analysis.overallAssessment ?? "Unable to analyze",
        alignmentCheck: analysis.alignmentCheck,
        toolUsageAnalysis: analysis.toolUsageAnalysis,
      };

      // Save the analysis result to the database
      await ctx.runMutation(internal.domains.promptOrchestrator.models.mutations.saveAnalysisResultInternal, {
        versionId: args.versionId,
        ...result,
      });

      return result;
    } catch (error) {
      console.error("Analysis parsing failed:", error);
      
      const fallbackResult: AnalyzePromptResult = {
        clarityScore: 5,
        improvements: ["Could not parse AI response - please try again"],
        edgeCases: [],
        optimizations: [],
        overallAssessment: content.substring(0, 500), // Limit to prevent huge text
      };

      // Save even the fallback result
      await ctx.runMutation(internal.domains.promptOrchestrator.models.mutations.saveAnalysisResultInternal, {
        versionId: args.versionId,
        ...fallbackResult,
      });

      return fallbackResult;
    }
  },
});

