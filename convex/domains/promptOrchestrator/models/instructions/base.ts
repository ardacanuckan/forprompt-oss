/**
 * Base prompt for all prompt engineering tasks
 * Defines the core persona and guidelines that apply to all operations
 */

import { base_prompt_engineer } from "../../../../forprompt";

/**
 * Returns the base prompt engineer persona
 * This is the foundation for all prompt engineering tasks
 */
export function getBasePrompt(): string {
  return base_prompt_engineer;
}
