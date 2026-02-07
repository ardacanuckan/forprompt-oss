/**
 * Prompt version actions (OpenRouter API calls)
 * 
 * This file re-exports all AI-powered actions from the generators folder.
 * The actual implementation is organized into separate modules for better maintainability:
 * 
 * - utils/: Shared types and OpenRouter API client
 * - prompts/: AI prompt templates
 * - generators/: Action handlers
 */

export { testPrompt } from "./generators/testPrompt";
export { analyzePrompt } from "./generators/analyzePrompt";
export { generatePromptFromInfo } from "./generators/generatePrompt";
export { enhanceFieldText } from "./generators/enhanceField";
export { getEnhancementSuggestions } from "./generators/getEnhancementSuggestions";
export { editPrompt } from "./generators/editPrompt";
export { extractInfoFromPrompt } from "./generators/extractInfo";

// Re-export types for convenience
export type {
  TestPromptResult,
  AnalyzePromptResult,
  EnhancementSuggestion,
  GeneratePromptResult,
  EnhanceFieldResult,
  EnhancementSuggestionsResult,
  EditPromptResult,
} from "./utils/types";
