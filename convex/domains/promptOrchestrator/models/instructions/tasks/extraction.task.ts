/**
 * Task prompt for prompt information extraction
 */

import { task_extraction } from "../../../../../forprompt";

/**
 * Returns the extraction task instructions
 */
export function getExtractionTaskPrompt(): string {
  return task_extraction;
}
