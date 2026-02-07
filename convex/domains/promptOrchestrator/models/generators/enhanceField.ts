/**
 * Enhance field action - Enhances field text for better AI understanding
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { DEFAULT_MODEL } from "../../../../lib/ai";
import { chatWithTracking } from "../../../../lib/aiTracked";
import { buildEnhanceFieldPrompt } from "../builders/enhancementBuilder";
import type { EnhanceFieldResult } from "../utils/types";

/**
 * Enhance/improve a specific field text to make it clearer for AI understanding
 */
export const enhanceFieldText = action({
  args: {
    fieldName: v.string(),
    fieldValue: v.string(),
    context: v.optional(v.string()),
    // Optional org context for usage tracking
    orgId: v.optional(v.id("organizations")),
    projectId: v.optional(v.id("projects")),
    promptId: v.optional(v.id("prompts")),
  },
  handler: async (ctx, args): Promise<EnhanceFieldResult> => {
    if (!args.fieldValue.trim()) {
      throw new Error("Field value is empty");
    }

    // Build the enhancement prompt
    const enhancePrompt = buildEnhanceFieldPrompt({
      fieldName: args.fieldName,
      fieldValue: args.fieldValue,
      context: args.context,
    });

    // Call AI with usage tracking if org context is provided
    let enhancedText: string;
    if (args.orgId) {
      enhancedText = await chatWithTracking(
        {
          ctx,
          orgId: args.orgId,
          projectId: args.projectId,
          promptId: args.promptId,
        },
        "enhanceField",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: enhancePrompt }],
          maxTokens: 4000,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      enhancedText = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: enhancePrompt }],
        maxTokens: 4000,
      });
    }

    return {
      enhancedText: enhancedText.trim() || args.fieldValue,
    };
  },
});

