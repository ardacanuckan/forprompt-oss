/**
 * Task prompts for prompt enhancement
 */

import { task_enhancement, task_enhancement_suggestions } from "../../../../../forprompt";

/**
 * Returns the field enhancement task instructions
 */
export function getEnhanceFieldTaskPrompt(): string {
  return task_enhancement;
}

/**
 * Returns the enhancement suggestions task instructions
 */
export function getEnhancementSuggestionsTaskPrompt(): string {
  return task_enhancement_suggestions;
}
