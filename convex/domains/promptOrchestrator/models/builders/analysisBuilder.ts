/**
 * Analysis prompt builder
 * Combines base prompt, task prompt, and data formatters
 */

import { buildSections, getBasePrompt } from "../instructions";
import { getAnalysisTaskPrompt } from "../instructions/tasks/analysis.task";
import { formatPromptInfo, type PromptInfoData } from "../data/promptInfo";
import { formatToolsInfo, type ToolInfo } from "../data/toolsInfo";

export interface BuildAnalysisPromptParams {
  systemPrompt: string;
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
  tools?: ToolInfo[];
  toolsNotes?: string;
}

/**
 * Builds a complete analysis prompt by combining layers
 */
export function buildAnalysisPrompt(params: BuildAnalysisPromptParams): string {
  return buildSections([
    getBasePrompt(),
    getAnalysisTaskPrompt(),
    formatPromptInfo({
      systemPrompt: params.systemPrompt,
      purpose: params.purpose,
      expectedBehavior: params.expectedBehavior,
      inputFormat: params.inputFormat,
      outputFormat: params.outputFormat,
      constraints: params.constraints,
      useCases: params.useCases,
    }),
    formatToolsInfo({
      tools: params.tools || [],
      toolsNotes: params.toolsNotes,
    }),
  ]);
}
