/**
 * Generate prompt action - Generates a prompt from information
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildGenerationPrompt } from "../builders/generationBuilder";
import type { GeneratePromptResult } from "../utils/types";

/**
 * Generate a prompt from the information provided (purpose, behavior, tools, etc.)
 */
export const generatePromptFromInfo = action({
  args: {
    promptId: v.id("prompts"),
    userDescription: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<GeneratePromptResult> => {
    // Get prompt information
    const prompt = await ctx.runQuery(internal.domains.promptOrchestrator.queries.getByIdInternal, {
      promptId: args.promptId,
    });

    if (!prompt) {
      throw new Error("Prompt not found");
    }

    // Get linked tools
    const promptTools = await ctx.runQuery(internal.domains.tools.queries.getPromptToolsInternal, {
      promptId: args.promptId,
    });

    // Build the generation prompt
    const generationPrompt = buildGenerationPrompt({
      purpose: prompt.purpose,
      expectedBehavior: prompt.expectedBehavior,
      inputFormat: prompt.inputFormat,
      outputFormat: prompt.outputFormat,
      constraints: prompt.constraints,
      useCases: prompt.useCases,
      userDescription: args.userDescription,
      tools: promptTools
        ?.map((pt) =>
          pt.tool
            ? {
                name: pt.tool.name,
                description: pt.tool.description,
                isRequired: pt.isRequired,
                usageNotes: pt.usageNotes,
                parameters: pt.tool.parameters,
              }
            : null
        )
        .filter((t): t is NonNullable<typeof t> => t !== null),
      toolsNotes: prompt.toolsNotes,
    });

    // Get organization context for usage tracking
    const orgId = await getOrgIdFromProject(ctx, prompt.projectId);

    // Call AI with usage tracking
    let content: string;
    if (orgId) {
      content = await chatWithTracking(
        {
          ctx,
          orgId,
          projectId: prompt.projectId,
          promptId: args.promptId,
        },
        "generatePrompt",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: generationPrompt }],
          maxTokens: 3000,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: generationPrompt }],
        maxTokens: 3000,
      });
    }

    try {
      // Use robust JSON parser that handles markdown blocks
      const result = parseJSONResponse<{
        systemPrompt?: string;
        explanation?: string;
      }>(content);

      if (!result) {
        throw new Error("Could not extract valid JSON from AI response");
      }

      // Validate that systemPrompt is a string and not nested JSON
      let systemPrompt = result.systemPrompt || "";
      
      // Handle case where systemPrompt might be incorrectly nested
      if (typeof systemPrompt === "object") {
        console.warn("systemPrompt is an object, attempting to extract text");
        systemPrompt = JSON.stringify(systemPrompt);
      }

      // Ensure we have actual content
      if (!systemPrompt || systemPrompt.trim().length === 0) {
        throw new Error("Generated prompt is empty");
      }

      return {
        generatedPrompt: systemPrompt,
        explanation: result.explanation || "Generated based on your requirements",
      };
    } catch (error) {
      // Intelligent fallback: try to extract systemPrompt from the raw content
      console.error("JSON parsing failed:", error);
      
      // Strategy 1: Look for systemPrompt field in the text
      const systemPromptMatch = content.match(/"systemPrompt"\s*:\s*"([\s\S]*?)(?<!\\)"/);
      if (systemPromptMatch) {
        const extracted = systemPromptMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\");
        
        return {
          generatedPrompt: extracted,
          explanation: "Extracted from AI response",
        };
      }

      // Strategy 2: If content looks like a prompt (substantial text), use it directly
      if (content && content.trim().length > 50 && !content.includes("```")) {
        return {
          generatedPrompt: content.trim(),
          explanation: "Direct AI response (no JSON structure detected)",
        };
      }

      // Last resort: return error message
      throw new Error(`Failed to parse AI response: ${(error as Error).message}`);
    }
  },
});

