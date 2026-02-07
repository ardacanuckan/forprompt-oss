/**
 * Task prompt for AI-powered prompt editing with conversation and interview modes
 */

import { task_edit } from "../../../../../forprompt";

/**
 * Returns the edit task instructions - supports edit, conversation, and interview modes
 */
export function getEditTaskPrompt(): string {
  return task_edit;
}
