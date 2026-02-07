/**
 * Extract info action - Extracts metadata from an existing prompt
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { chat, DEFAULT_MODEL } from "../../../../lib/ai";
import { buildExtractionPrompt } from "../builders/extractionBuilder";
import { cleanJson } from "../utils/json";

/**
 * Extracts metadata from an existing prompt
 */
export const extractInfoFromPrompt = action({
  args: {
    systemPrompt: v.string(),
  },
  handler: async (ctx, args) => {
    // Build the extraction prompt
    const extractionPrompt = buildExtractionPrompt({
      systemPrompt: args.systemPrompt,
    });

    // Call AI
    const content = await chat({
      model: DEFAULT_MODEL,
      messages: [{ role: "user", content: extractionPrompt }],
      maxTokens: 2000,
    });

    try {
      const result = cleanJson(content);
      
      // Helper to normalize field - convert array to string if needed
      const normalizeField = (field: any): string => {
        if (Array.isArray(field)) {
          return field.join('\n');
        }
        return field || "";
      };
      
      return {
        purpose: normalizeField(result.purpose),
        expectedBehavior: normalizeField(result.expectedBehavior),
        inputFormat: normalizeField(result.inputFormat),
        outputFormat: normalizeField(result.outputFormat),
        constraints: normalizeField(result.constraints),
        useCases: normalizeField(result.useCases),
        toolsAndCapabilities: normalizeField(result.toolsAndCapabilities),
      };
    } catch (error) {
      console.error("Content that failed to parse:", content);
      console.error("Content length:", content?.length);
      console.error("Content type:", typeof content);
      throw new Error("Failed to parse extraction results: " + (error as Error).message);
    }
  },
});
