/**
 * Enhancement prompt builders
 * Field-specific prompts for precise, quality improvements
 */

import { buildSections, getBasePrompt } from "../instructions";
import { getEnhancementSuggestionsTaskPrompt } from "../instructions/tasks/enhancement.task";
import { getFieldEnhancementPrompt } from "../instructions/tasks/fieldEnhancement";

export interface BuildEnhanceFieldPromptParams {
  fieldName: string;
  fieldValue: string;
  context?: string;
}

/**
 * Builds a field-specific prompt for enhancing text
 * Uses tailored prompts for each field type - no generic fluff
 */
export function buildEnhanceFieldPrompt(
  params: BuildEnhanceFieldPromptParams
): string {
  // Use field-specific prompt directly - no base prompt overhead
  return getFieldEnhancementPrompt(params.fieldName, params.fieldValue);
}

export interface BuildEnhancementSuggestionsPromptParams {
  systemPrompt: string;
  purpose?: string;
  expectedBehavior?: string;
  tools?: Array<{
    name: string;
    description: string;
  }>;
}

/**
 * Builds a prompt for getting enhancement suggestions
 */
export function buildEnhancementSuggestionsPrompt(
  params: BuildEnhancementSuggestionsPromptParams
): string {
  let contextSection = `--- SYSTEM PROMPT ---
"""
${params.systemPrompt}
"""
--- END SYSTEM PROMPT ---`;

  if (params.purpose || params.expectedBehavior || params.tools) {
    contextSection += `\n\n--- CONTEXT ---`;
    if (params.purpose) contextSection += `\nPurpose: ${params.purpose}`;
    if (params.expectedBehavior)
      contextSection += `\nExpected Behavior: ${params.expectedBehavior}`;

    if (params.tools && params.tools.length > 0) {
      contextSection += `\n\nTools:`;
      for (const tool of params.tools) {
        contextSection += `\n- ${tool.name}: ${tool.description}`;
      }
    }
    contextSection += `\n--- END CONTEXT ---`;
  }

  return buildSections([
    getBasePrompt(),
    getEnhancementSuggestionsTaskPrompt(),
    contextSection,
  ]);
}
