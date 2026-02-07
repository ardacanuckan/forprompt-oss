/**
 * Extraction prompt builder
 */

import { buildSections, getBasePrompt } from "../instructions";
import { getExtractionTaskPrompt } from "../instructions/tasks/extraction.task";

export interface BuildExtractionPromptParams {
  systemPrompt: string;
}

/**
 * Builds a complete extraction prompt
 */
export function buildExtractionPrompt(
  params: BuildExtractionPromptParams
): string {
  return buildSections([
    getBasePrompt(),
    getExtractionTaskPrompt(),
    `SYSTEM PROMPT TO ANALYZE:
---
${params.systemPrompt}
---`
  ]);
}
