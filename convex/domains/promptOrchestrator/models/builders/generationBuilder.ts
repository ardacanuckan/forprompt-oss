/**
 * Generation prompt builder
 * Combines base prompt, task prompt, and data formatters
 */

import { buildSections, getBasePrompt } from "../instructions";
import { getGenerationTaskPrompt } from "../instructions/tasks/generation.task";
import { formatUserRequirements } from "../data/requirements";
import { formatToolsInfo, type ToolInfo } from "../data/toolsInfo";

export interface BuildGenerationPromptParams {
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
  userDescription?: string;
  tools?: ToolInfo[];
  toolsNotes?: string;
}

/**
 * Builds a complete generation prompt by combining layers
 */
export function buildGenerationPrompt(
  params: BuildGenerationPromptParams
): string {
  return buildSections([
    getBasePrompt(),
    getGenerationTaskPrompt(),
    formatUserRequirements({
      purpose: params.purpose,
      expectedBehavior: params.expectedBehavior,
      inputFormat: params.inputFormat,
      outputFormat: params.outputFormat,
      constraints: params.constraints,
      useCases: params.useCases,
      userDescription: params.userDescription,
    }),
    formatToolsInfo({
      tools: params.tools || [],
      toolsNotes: params.toolsNotes,
    }),
  ]);
}
