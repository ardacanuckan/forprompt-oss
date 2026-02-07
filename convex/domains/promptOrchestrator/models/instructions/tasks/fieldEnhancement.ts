/**
 * Field-specific enhancement prompts
 * Each field gets a tailored, concise prompt for precise improvements
 */

import {
  field_purpose,
  field_expected_behavior,
  field_input_format,
  field_output_format,
  field_constraints,
  field_use_cases,
  field_additional_notes,
  field_tools_notes,
} from "../../../../../forprompt";

// Map field names to ForPrompt prompts
const FIELD_PROMPTS: Record<string, string> = {
  purpose: field_purpose,
  expectedBehavior: field_expected_behavior,
  inputFormat: field_input_format,
  outputFormat: field_output_format,
  constraints: field_constraints,
  useCases: field_use_cases,
  additionalNotes: field_additional_notes,
  toolsNotes: field_tools_notes,
};

/**
 * Replace template variables in a prompt
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get the enhancement prompt for a specific field
 */
export function getFieldEnhancementPrompt(
  fieldName: string,
  fieldValue: string
): string {
  const template = FIELD_PROMPTS[fieldName];

  if (!template) {
    // Fallback for unknown fields
    return `Improve this text to be clearer and more specific. Remove fluff, keep the core meaning.

TEXT:
${fieldValue}

Return ONLY the improved text.`;
  }

  // Replace the {{fieldValue}} placeholder
  return replaceTemplateVariables(template, { fieldValue });
}

/**
 * Get just the field description for context
 */
export function getFieldDescription(fieldName: string): string {
  const descriptions: Record<string, string> = {
    purpose: "the main goal of this AI",
    expectedBehavior: "how the AI should behave",
    inputFormat: "expected user input format",
    outputFormat: "expected AI output format",
    constraints: "rules and limitations",
    useCases: "example scenarios",
    additionalNotes: "extra context",
    toolsNotes: "tool usage strategy",
  };

  return descriptions[fieldName] || "prompt information";
}
