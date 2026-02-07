/**
 * JSON format generator
 */

import type { Prompt } from "../types";

/**
 * Generate JSON file content from prompts
 */
export function generateJSON(prompts: Prompt[], syncedAt: number, projectId: string): string {
  const timestamp = new Date(syncedAt).toISOString();

  const promptsMap: Record<string, Prompt> = {};
  for (const prompt of prompts) {
    promptsMap[prompt.key] = prompt;
  }

  const output = {
    _meta: {
      syncedAt,
      syncedAtISO: timestamp,
      projectId,
      promptCount: prompts.length,
    },
    prompts: promptsMap,
  };

  return JSON.stringify(output, null, 2);
}

