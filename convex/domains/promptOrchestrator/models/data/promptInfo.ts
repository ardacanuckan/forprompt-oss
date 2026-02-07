/**
 * Formatter for prompt information data
 */

export interface PromptInfoData {
  systemPrompt: string;
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
}

/**
 * Formats prompt information into a structured section
 */
export function formatPromptInfo(data: PromptInfoData): string {
  let output = `--- SYSTEM PROMPT TO ANALYZE ---
"""
${data.systemPrompt}
"""
--- END SYSTEM PROMPT ---`;

  const hasMetadata =
    data.purpose ||
    data.expectedBehavior ||
    data.inputFormat ||
    data.outputFormat ||
    data.constraints ||
    data.useCases;

  if (hasMetadata) {
    output += `\n\n--- PROMPT INFORMATION ---`;
    if (data.purpose) output += `\nPurpose: ${data.purpose}`;
    if (data.expectedBehavior)
      output += `\nExpected Behavior: ${data.expectedBehavior}`;
    if (data.inputFormat) output += `\nInput Format: ${data.inputFormat}`;
    if (data.outputFormat) output += `\nOutput Format: ${data.outputFormat}`;
    if (data.constraints) output += `\nConstraints: ${data.constraints}`;
    if (data.useCases) output += `\nUse Cases: ${data.useCases}`;
    output += `\n--- END PROMPT INFORMATION ---`;
  }

  return output;
}

