/**
 * Shared type definitions for prompt version actions
 */

/**
 * Result from testing a prompt with OpenRouter
 */
export interface TestPromptResult {
  response: string;
  tokens: number;
  responseTime: number;
  model: string;
}

/**
 * Result from analyzing a prompt
 */
export interface AnalyzePromptResult {
  clarityScore: number;
  improvements: string[];
  edgeCases: string[];
  optimizations: string[];
  overallAssessment: string;
  alignmentCheck?: {
    purposeAlignment: { score: number; feedback: string };
    behaviorAlignment: { score: number; feedback: string };
    constraintsAlignment: { score: number; feedback: string };
  };
  toolUsageAnalysis?: {
    tools: Array<{
      name: string;
      isProperlyInstructed: boolean;
      issues: string[];
      suggestions: string[];
    }>;
    overallToolUsage: string;
  };
}

/**
 * A single enhancement suggestion
 */
export interface EnhancementSuggestion {
  id: string;
  issue: string;
  suggestion: string;
  enhancedText: string;
  priority: "high" | "medium" | "low";
}

/**
 * Result from generating a prompt
 */
export interface GeneratePromptResult {
  generatedPrompt: string;
  explanation: string;
}

/**
 * Result from enhancing field text
 */
export interface EnhanceFieldResult {
  enhancedText: string;
}

/**
 * Result from getting enhancement suggestions
 */
export interface EnhancementSuggestionsResult {
  suggestions: EnhancementSuggestion[];
}

/**
 * Result from editing a prompt via AI
 */
export interface EditPromptResult {
  editedPrompt: string;
  explanation: string;
  thinking?: string;
  isError?: boolean;
}
