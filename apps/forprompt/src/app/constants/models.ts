import type { Model } from "@/app/types";

export const DEFAULT_MODEL = "anthropic/claude-sonnet-4";
export const DEFAULT_EDITOR_MODEL = "anthropic/claude-sonnet-4";

// Provider categories for grouping
export type Provider = "Anthropic" | "OpenAI" | "Google" | "Meta" | "DeepSeek" | "Mistral" | "Qwen" | "xAI" | "Cohere";

// Models available for testing prompts - comprehensive list
export const AVAILABLE_MODELS: Model[] = [
  // ═══════════════════════════════════════════════════════════════
  // ANTHROPIC - Claude Models
  // ═══════════════════════════════════════════════════════════════
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Most capable, complex reasoning",
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Extended thinking, best balance",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Fast and highly capable",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "Anthropic",
    description: "Fastest, cost-effective",
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    provider: "Anthropic",
    description: "Previous flagship model",
  },

  // ═══════════════════════════════════════════════════════════════
  // OPENAI - GPT & Reasoning Models
  // ═══════════════════════════════════════════════════════════════
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description: "Latest GPT, improved coding",
  },
  {
    id: "openai/gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "OpenAI",
    description: "Compact, fast, affordable",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Multimodal, versatile",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "OpenAI",
    description: "Cost-effective multimodal",
  },
  {
    id: "openai/o3",
    name: "o3",
    provider: "OpenAI",
    description: "Advanced reasoning model",
  },
  {
    id: "openai/o3-mini",
    name: "o3 Mini",
    provider: "OpenAI",
    description: "Fast reasoning model",
  },
  {
    id: "openai/o1",
    name: "o1",
    provider: "OpenAI",
    description: "Deep reasoning, complex tasks",
  },
  {
    id: "openai/o1-mini",
    name: "o1 Mini",
    provider: "OpenAI",
    description: "Efficient reasoning",
  },

  // ═══════════════════════════════════════════════════════════════
  // GOOGLE - Gemini Models
  // ═══════════════════════════════════════════════════════════════
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Latest, ultra-fast responses",
  },
  {
    id: "google/gemini-2.0-flash-thinking-exp:free",
    name: "Gemini 2.0 Flash Thinking",
    provider: "Google",
    description: "Thinking enabled, free tier",
  },
  {
    id: "google/gemini-pro-1.5",
    name: "Gemini 1.5 Pro",
    provider: "Google",
    description: "1M context window",
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini 1.5 Flash",
    provider: "Google",
    description: "Fast with long context",
  },
  {
    id: "google/gemini-flash-1.5-8b",
    name: "Gemini 1.5 Flash 8B",
    provider: "Google",
    description: "Compact and efficient",
  },

  // ═══════════════════════════════════════════════════════════════
  // META - Llama Models
  // ═══════════════════════════════════════════════════════════════
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "Meta",
    description: "Latest Llama, multimodal",
  },
  {
    id: "meta-llama/llama-4-scout",
    name: "Llama 4 Scout",
    provider: "Meta",
    description: "Efficient Llama 4",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "Powerful open source",
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B",
    provider: "Meta",
    description: "Largest open model",
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "Meta",
    description: "Balanced performance",
  },

  // ═══════════════════════════════════════════════════════════════
  // DEEPSEEK - Chinese AI Leader
  // ═══════════════════════════════════════════════════════════════
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Top tier, extremely capable",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Advanced reasoning model",
  },
  {
    id: "deepseek/deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Llama 70B",
    provider: "DeepSeek",
    description: "Distilled reasoning",
  },
  {
    id: "deepseek/deepseek-coder",
    name: "DeepSeek Coder",
    provider: "DeepSeek",
    description: "Optimized for coding",
  },

  // ═══════════════════════════════════════════════════════════════
  // MISTRAL - European AI
  // ═══════════════════════════════════════════════════════════════
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large",
    provider: "Mistral",
    description: "Most capable Mistral",
  },
  {
    id: "mistralai/mistral-medium-3",
    name: "Mistral Medium",
    provider: "Mistral",
    description: "Balanced performance",
  },
  {
    id: "mistralai/mistral-small-3.1-24b-instruct",
    name: "Mistral Small 3.1",
    provider: "Mistral",
    description: "Fast and efficient",
  },
  {
    id: "mistralai/codestral-2501",
    name: "Codestral",
    provider: "Mistral",
    description: "Specialized for code",
  },
  {
    id: "mistralai/ministral-8b",
    name: "Ministral 8B",
    provider: "Mistral",
    description: "Compact, fast",
  },

  // ═══════════════════════════════════════════════════════════════
  // QWEN - Alibaba AI
  // ═══════════════════════════════════════════════════════════════
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    description: "Highly capable Chinese AI",
  },
  {
    id: "qwen/qwen-2.5-coder-32b-instruct",
    name: "Qwen 2.5 Coder 32B",
    provider: "Qwen",
    description: "Excellent for coding",
  },
  {
    id: "qwen/qwq-32b",
    name: "QwQ 32B",
    provider: "Qwen",
    description: "Reasoning focused",
  },

  // ═══════════════════════════════════════════════════════════════
  // XAI - Grok Models
  // ═══════════════════════════════════════════════════════════════
  {
    id: "x-ai/grok-3-beta",
    name: "Grok 3 Beta",
    provider: "xAI",
    description: "Latest Grok, very capable",
  },
  {
    id: "x-ai/grok-3-mini-beta",
    name: "Grok 3 Mini",
    provider: "xAI",
    description: "Fast reasoning",
  },
  {
    id: "x-ai/grok-2-1212",
    name: "Grok 2",
    provider: "xAI",
    description: "Balanced Grok model",
  },
  {
    id: "x-ai/grok-2-vision-1212",
    name: "Grok 2 Vision",
    provider: "xAI",
    description: "Multimodal Grok",
  },

  // ═══════════════════════════════════════════════════════════════
  // COHERE - Enterprise AI
  // ═══════════════════════════════════════════════════════════════
  {
    id: "cohere/command-r-plus",
    name: "Command R+",
    provider: "Cohere",
    description: "Enterprise, RAG optimized",
  },
  {
    id: "cohere/command-r",
    name: "Command R",
    provider: "Cohere",
    description: "Fast, efficient",
  },
];

// Models available for AI-powered prompt editing (best for editing tasks)
export const EDITOR_MODELS: Model[] = [
  // Top tier - best for editing
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude Sonnet 4",
    provider: "Anthropic",
    description: "Extended thinking, recommended",
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude Opus 4",
    provider: "Anthropic",
    description: "Most capable, complex tasks",
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Fast and capable",
  },
  
  // OpenAI options
  {
    id: "openai/gpt-4.1",
    name: "GPT-4.1",
    provider: "OpenAI",
    description: "Latest GPT model",
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "Multimodal, versatile",
  },
  {
    id: "openai/o3-mini",
    name: "o3 Mini",
    provider: "OpenAI",
    description: "Fast reasoning",
  },

  // Google
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Latest, ultra-fast",
  },
  {
    id: "google/gemini-2.0-flash-thinking-exp:free",
    name: "Gemini 2.0 Flash Thinking",
    provider: "Google",
    description: "Thinking enabled, free",
  },

  // DeepSeek - great value
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Excellent, affordable",
  },
  {
    id: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    provider: "DeepSeek",
    description: "Reasoning model",
  },

  // Meta
  {
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "Meta",
    description: "Latest Llama",
  },

  // Mistral
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large",
    provider: "Mistral",
    description: "Strong European AI",
  },

  // Qwen
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    provider: "Qwen",
    description: "Powerful open model",
  },

  // xAI
  {
    id: "x-ai/grok-3-beta",
    name: "Grok 3 Beta",
    provider: "xAI",
    description: "Latest Grok",
  },
];

// Models that support extended thinking/reasoning
export const THINKING_MODELS = [
  "anthropic/claude-sonnet-4",
  "anthropic/claude-opus-4",
  "openai/o3",
  "openai/o3-mini",
  "openai/o1",
  "openai/o1-mini",
  "google/gemini-2.0-flash-thinking-exp:free",
  "deepseek/deepseek-r1",
  "x-ai/grok-3-beta",
  "x-ai/grok-3-mini-beta",
  "qwen/qwq-32b",
];

// Helper to get models by provider
export function getModelsByProvider(provider: Provider): Model[] {
  return AVAILABLE_MODELS.filter(m => m.provider === provider);
}

// All unique providers
export const PROVIDERS: Provider[] = [
  "Anthropic",
  "OpenAI", 
  "Google",
  "Meta",
  "DeepSeek",
  "Mistral",
  "Qwen",
  "xAI",
  "Cohere",
];
