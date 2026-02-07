/**
 * Formatter for user requirements data
 */

export interface RequirementsData {
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
  userDescription?: string;
}

/**
 * Formats user requirements into a structured section
 */
export function formatUserRequirements(data: RequirementsData): string {
  let output = `--- PROMPT REQUIREMENTS ---`;

  if (data.purpose) output += `\n\nPURPOSE:\n${data.purpose}`;
  if (data.expectedBehavior)
    output += `\n\nEXPECTED BEHAVIOR:\n${data.expectedBehavior}`;
  if (data.inputFormat) output += `\n\nINPUT FORMAT:\n${data.inputFormat}`;
  if (data.outputFormat) output += `\n\nOUTPUT FORMAT:\n${data.outputFormat}`;
  if (data.constraints) output += `\n\nCONSTRAINTS:\n${data.constraints}`;
  if (data.useCases) output += `\n\nUSE CASES:\n${data.useCases}`;
  if (data.userDescription)
    output += `\n\nADDITIONAL CONTEXT:\n${data.userDescription}`;

  output += `\n--- END PROMPT REQUIREMENTS ---`;
  return output;
}

