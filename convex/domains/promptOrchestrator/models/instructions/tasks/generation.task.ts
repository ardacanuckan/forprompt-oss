/**
 * Task prompt for prompt generation
 */

import { task_generation } from "../../../../../forprompt";

/**
 * Returns the generation task instructions
 */
export function getGenerationTaskPrompt(): string {
  return task_generation;
}
