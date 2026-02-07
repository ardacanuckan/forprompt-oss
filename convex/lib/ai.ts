/**
 * Centralized AI Service
 * All AI/LLM API calls go through this module
 */

// ============================================================================
// Types
// ============================================================================

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequestOptions {
  messages: AIMessage[];
  model?: string;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
}

export interface AIResponseWithUsage extends AIResponse {
  tokens: number;
}

/** Response from Claude with extended thinking */
export interface AIResponseWithThinking extends AIResponse {
  thinking: string;
  tokens: number;
}

/** Options for extended thinking requests */
export interface ThinkingRequestOptions {
  systemPrompt: string;
  userMessage: string;
  budgetTokens?: number;
  maxTokens?: number;
}

interface OpenRouterAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

export const AI_MODELS = {
  // Anthropic (OpenRouter)
  CLAUDE_3_5_SONNET: "anthropic/claude-3.5-sonnet",
  CLAUDE_3_OPUS: "anthropic/claude-3-opus",
  CLAUDE_3_SONNET: "anthropic/claude-3-sonnet",
  CLAUDE_3_HAIKU: "anthropic/claude-3-haiku",
  CLAUDE_SONNET_4_5: "anthropic/claude-sonnet-4.5",
  // OpenAI
  GPT_4_TURBO: "openai/gpt-4-turbo",
  GPT_4O: "openai/gpt-4o",
  GPT_4O_MINI: "openai/gpt-4o-mini",
  GPT_3_5_TURBO: "openai/gpt-3.5-turbo",
  // Others
  GEMINI_PRO: "google/gemini-pro-1.5",
  LLAMA_3_70B: "meta-llama/llama-3.1-70b-instruct",
} as const;

export const DEFAULT_MODEL = AI_MODELS.CLAUDE_3_5_SONNET;
export const DEFAULT_THINKING_MODEL = AI_MODELS.CLAUDE_SONNET_4_5;
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_THINKING_BUDGET = 10000;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Get OpenRouter API key from environment
 */
function getOpenRouterApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }
  return apiKey;
}

/**
 * Make a request to OpenRouter API
 */
async function makeRequest(
  options: AIRequestOptions,
): Promise<OpenRouterAPIResponse> {
  const apiKey = getOpenRouterApiKey();

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://forprompt.dev",
      "X-Title": "ForPrompt",
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      messages: options.messages,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI API error: ${errorText}`);
  }

  return response.json();
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Send a chat request to the AI
 * @returns The response content as a string
 */
export async function chat(options: AIRequestOptions): Promise<string> {
  const data = await makeRequest(options);
  return data.choices?.[0]?.message?.content ?? "";
}

/**
 * Send a chat request and get response with token usage
 * @returns Object with content and token count
 */
export async function chatWithUsage(
  options: AIRequestOptions,
): Promise<AIResponseWithUsage> {
  const data = await makeRequest(options);
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    tokens: data.usage?.total_tokens ?? 0,
  };
}

/**
 * Send a chat request with extended thinking (Claude Sonnet 4.5 via OpenRouter)
 * @returns Object with content, thinking process, and token count
 */
export async function chatWithThinking(
  options: ThinkingRequestOptions,
): Promise<AIResponseWithThinking> {
  const apiKey = getOpenRouterApiKey();
  const maxTokens = options.maxTokens ?? 16000;

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://forprompt.dev",
      "X-Title": "ForPrompt",
    },
    body: JSON.stringify({
      model: DEFAULT_THINKING_MODEL,
      max_tokens: maxTokens,
      thinking: {
        type: "enabled",
        budget_tokens: options.budgetTokens ?? DEFAULT_THINKING_BUDGET,
      },
      messages: [
        {
          role: "system",
          content: options.systemPrompt,
        },
        {
          role: "user",
          content: options.userMessage,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${errorText}`);
  }

  const data = await response.json();

  // Extract reasoning and content from response
  // OpenRouter may return reasoning in different fields depending on the model
  const message = data.choices?.[0]?.message;
  const thinking = message?.reasoning ?? message?.reasoning_content ?? "";
  const content = message?.content ?? "";
  const totalTokens = data.usage?.total_tokens ?? 0;

  return {
    content,
    thinking,
    tokens: totalTokens,
  };
}

// ============================================================================
// JSON Response Helpers
// ============================================================================

/**
 * Parse JSON from AI response with robust fallbacks
 */
export function parseJSONResponse<T>(content: string): T | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(content);
  } catch {
    // Continue to other strategies
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Try next match
    }
  }

  // Strategy 3: Find JSON object in text
  const firstOpen = content.indexOf("{");
  const lastClose = content.lastIndexOf("}");

  if (firstOpen !== -1 && lastClose > firstOpen) {
    let currentClose = lastClose;
    while (currentClose > firstOpen) {
      try {
        return JSON.parse(content.substring(firstOpen, currentClose + 1));
      } catch {
        currentClose = content.lastIndexOf("}", currentClose - 1);
      }
    }
  }

  return null;
}
