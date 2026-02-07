/**
 * ForPrompt SDK
 *
 * Simple usage with auto-configuration:
 * @example
 * ```typescript
 * import { forprompt } from "@forprompt/sdk";
 *
 * // Auto-loads from FORPROMPT_API_KEY environment variable
 * const prompt = await forprompt.getPrompt("userContextPrompt");
 * console.log(prompt.systemPrompt);
 * ```
 *
 * @example With explicit configuration
 * ```typescript
 * import { createForPrompt } from "@forprompt/sdk";
 *
 * const client = createForPrompt({
 *   apiKey: "fp_xxx",
 * });
 *
 * const prompt = await client.getPrompt("userContextPrompt");
 * ```
 *
 * @example Using local prompts (after `npx forprompt deploy`)
 * ```typescript
 * import { userContextPrompt } from "./forprompt";
 *
 * // Or use getPrompt helper
 * import { getPrompt } from "./forprompt";
 * const prompt = getPrompt("userContextPrompt");
 * ```
 */

// Main client
export { ForPrompt, createForPrompt, forprompt } from "./client";

// Logger
export { ForPromptLogger, createLogger, logger } from "./trace";
export type { LogOptions, SingleRequestOptions } from "./trace";

// Types
export type { ForPromptConfig, Prompt, GetPromptOptions } from "./types";
export { ForPromptError } from "./types";
