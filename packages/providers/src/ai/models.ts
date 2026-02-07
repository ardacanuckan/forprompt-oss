/**
 * Model definitions and mappings between providers
 *
 * This module provides a unified model naming system and mappings
 * to translate between provider-specific model identifiers.
 */

import type { ModelInfo, AIProviderType } from './index';

// ============================================================================
// Canonical Model IDs (Provider-agnostic)
// ============================================================================

export const MODELS = {
  // Anthropic Claude
  CLAUDE_3_5_SONNET: 'claude-3-5-sonnet',
  CLAUDE_3_OPUS: 'claude-3-opus',
  CLAUDE_3_SONNET: 'claude-3-sonnet',
  CLAUDE_3_HAIKU: 'claude-3-haiku',
  CLAUDE_SONNET_4: 'claude-sonnet-4',
  CLAUDE_OPUS_4: 'claude-opus-4',

  // OpenAI GPT
  GPT_4_TURBO: 'gpt-4-turbo',
  GPT_4O: 'gpt-4o',
  GPT_4O_MINI: 'gpt-4o-mini',
  GPT_3_5_TURBO: 'gpt-3.5-turbo',
  O1: 'o1',
  O1_MINI: 'o1-mini',
  O1_PRO: 'o1-pro',
  O3_MINI: 'o3-mini',

  // Google
  GEMINI_PRO: 'gemini-pro',
  GEMINI_PRO_1_5: 'gemini-pro-1.5',
  GEMINI_FLASH: 'gemini-flash',

  // Meta Llama
  LLAMA_3_1_70B: 'llama-3.1-70b',
  LLAMA_3_1_8B: 'llama-3.1-8b',
  LLAMA_3_2_90B: 'llama-3.2-90b',

  // Mistral
  MISTRAL_LARGE: 'mistral-large',
  MISTRAL_MEDIUM: 'mistral-medium',
  MISTRAL_SMALL: 'mistral-small',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];

// ============================================================================
// Default Models per Provider
// ============================================================================

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  openrouter: 'anthropic/claude-3.5-sonnet',
  openai: 'gpt-4o',
  anthropic: 'claude-3-5-sonnet-latest',
  ollama: 'llama3.2',
};

export const DEFAULT_THINKING_MODELS: Record<AIProviderType, string> = {
  openrouter: 'anthropic/claude-sonnet-4',
  openai: 'o1',
  anthropic: 'claude-sonnet-4-20250514',
  ollama: 'llama3.2', // Ollama doesn't have thinking models
};

// ============================================================================
// Provider-specific Model Mappings
// ============================================================================

/**
 * Maps canonical model IDs to provider-specific model identifiers
 */
export const MODEL_MAPPINGS: Record<AIProviderType, Record<string, string>> = {
  openrouter: {
    // Anthropic via OpenRouter
    [MODELS.CLAUDE_3_5_SONNET]: 'anthropic/claude-3.5-sonnet',
    [MODELS.CLAUDE_3_OPUS]: 'anthropic/claude-3-opus',
    [MODELS.CLAUDE_3_SONNET]: 'anthropic/claude-3-sonnet',
    [MODELS.CLAUDE_3_HAIKU]: 'anthropic/claude-3-haiku',
    [MODELS.CLAUDE_SONNET_4]: 'anthropic/claude-sonnet-4',
    [MODELS.CLAUDE_OPUS_4]: 'anthropic/claude-opus-4',
    // OpenAI via OpenRouter
    [MODELS.GPT_4_TURBO]: 'openai/gpt-4-turbo',
    [MODELS.GPT_4O]: 'openai/gpt-4o',
    [MODELS.GPT_4O_MINI]: 'openai/gpt-4o-mini',
    [MODELS.GPT_3_5_TURBO]: 'openai/gpt-3.5-turbo',
    [MODELS.O1]: 'openai/o1',
    [MODELS.O1_MINI]: 'openai/o1-mini',
    [MODELS.O1_PRO]: 'openai/o1-pro',
    [MODELS.O3_MINI]: 'openai/o3-mini',
    // Google via OpenRouter
    [MODELS.GEMINI_PRO]: 'google/gemini-pro',
    [MODELS.GEMINI_PRO_1_5]: 'google/gemini-pro-1.5',
    [MODELS.GEMINI_FLASH]: 'google/gemini-flash',
    // Meta via OpenRouter
    [MODELS.LLAMA_3_1_70B]: 'meta-llama/llama-3.1-70b-instruct',
    [MODELS.LLAMA_3_1_8B]: 'meta-llama/llama-3.1-8b-instruct',
    [MODELS.LLAMA_3_2_90B]: 'meta-llama/llama-3.2-90b-vision-instruct',
    // Mistral via OpenRouter
    [MODELS.MISTRAL_LARGE]: 'mistralai/mistral-large',
    [MODELS.MISTRAL_MEDIUM]: 'mistralai/mistral-medium',
    [MODELS.MISTRAL_SMALL]: 'mistralai/mistral-small',
  },

  openai: {
    [MODELS.GPT_4_TURBO]: 'gpt-4-turbo',
    [MODELS.GPT_4O]: 'gpt-4o',
    [MODELS.GPT_4O_MINI]: 'gpt-4o-mini',
    [MODELS.GPT_3_5_TURBO]: 'gpt-3.5-turbo',
    [MODELS.O1]: 'o1',
    [MODELS.O1_MINI]: 'o1-mini',
    [MODELS.O1_PRO]: 'o1-pro',
    [MODELS.O3_MINI]: 'o3-mini',
  },

  anthropic: {
    [MODELS.CLAUDE_3_5_SONNET]: 'claude-3-5-sonnet-latest',
    [MODELS.CLAUDE_3_OPUS]: 'claude-3-opus-latest',
    [MODELS.CLAUDE_3_SONNET]: 'claude-3-sonnet-20240229',
    [MODELS.CLAUDE_3_HAIKU]: 'claude-3-haiku-20240307',
    [MODELS.CLAUDE_SONNET_4]: 'claude-sonnet-4-20250514',
    [MODELS.CLAUDE_OPUS_4]: 'claude-opus-4-20250514',
  },

  ollama: {
    [MODELS.LLAMA_3_1_70B]: 'llama3.1:70b',
    [MODELS.LLAMA_3_1_8B]: 'llama3.1:8b',
    [MODELS.LLAMA_3_2_90B]: 'llama3.2:90b',
    [MODELS.MISTRAL_LARGE]: 'mistral:latest',
    [MODELS.MISTRAL_SMALL]: 'mistral:7b',
  },
};

/**
 * Reverse mappings from provider-specific IDs to canonical IDs
 */
export const REVERSE_MODEL_MAPPINGS: Record<AIProviderType, Record<string, string>> = {
  openrouter: Object.fromEntries(
    Object.entries(MODEL_MAPPINGS.openrouter).map(([k, v]) => [v, k])
  ),
  openai: Object.fromEntries(
    Object.entries(MODEL_MAPPINGS.openai).map(([k, v]) => [v, k])
  ),
  anthropic: Object.fromEntries(
    Object.entries(MODEL_MAPPINGS.anthropic).map(([k, v]) => [v, k])
  ),
  ollama: Object.fromEntries(
    Object.entries(MODEL_MAPPINGS.ollama).map(([k, v]) => [v, k])
  ),
};

// ============================================================================
// Model Information Database
// ============================================================================

export const MODEL_INFO: Record<string, ModelInfo> = {
  // Anthropic Claude
  [MODELS.CLAUDE_3_5_SONNET]: {
    id: MODELS.CLAUDE_3_5_SONNET,
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 8192,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  [MODELS.CLAUDE_3_OPUS]: {
    id: MODELS.CLAUDE_3_OPUS,
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
  },
  [MODELS.CLAUDE_3_SONNET]: {
    id: MODELS.CLAUDE_3_SONNET,
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  [MODELS.CLAUDE_3_HAIKU]: {
    id: MODELS.CLAUDE_3_HAIKU,
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
  },
  [MODELS.CLAUDE_SONNET_4]: {
    id: MODELS.CLAUDE_SONNET_4,
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 16384,
    supportsThinking: true,
    supportsStreaming: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 15,
  },
  [MODELS.CLAUDE_OPUS_4]: {
    id: MODELS.CLAUDE_OPUS_4,
    name: 'Claude Opus 4',
    provider: 'anthropic',
    contextLength: 200000,
    maxOutputTokens: 16384,
    supportsThinking: true,
    supportsStreaming: true,
    inputPricePerMillion: 15,
    outputPricePerMillion: 75,
  },

  // OpenAI GPT
  [MODELS.GPT_4_TURBO]: {
    id: MODELS.GPT_4_TURBO,
    name: 'GPT-4 Turbo',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 10,
    outputPricePerMillion: 30,
  },
  [MODELS.GPT_4O]: {
    id: MODELS.GPT_4O,
    name: 'GPT-4o',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10,
  },
  [MODELS.GPT_4O_MINI]: {
    id: MODELS.GPT_4O_MINI,
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 16384,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  [MODELS.GPT_3_5_TURBO]: {
    id: MODELS.GPT_3_5_TURBO,
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    contextLength: 16384,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 0.5,
    outputPricePerMillion: 1.5,
  },
  [MODELS.O1]: {
    id: MODELS.O1,
    name: 'o1',
    provider: 'openai',
    contextLength: 200000,
    maxOutputTokens: 100000,
    supportsThinking: true,
    supportsStreaming: true,
    inputPricePerMillion: 15,
    outputPricePerMillion: 60,
  },
  [MODELS.O1_MINI]: {
    id: MODELS.O1_MINI,
    name: 'o1 Mini',
    provider: 'openai',
    contextLength: 128000,
    maxOutputTokens: 65536,
    supportsThinking: true,
    supportsStreaming: true,
    inputPricePerMillion: 3,
    outputPricePerMillion: 12,
  },
  [MODELS.O3_MINI]: {
    id: MODELS.O3_MINI,
    name: 'o3 Mini',
    provider: 'openai',
    contextLength: 200000,
    maxOutputTokens: 100000,
    supportsThinking: true,
    supportsStreaming: true,
    inputPricePerMillion: 1.1,
    outputPricePerMillion: 4.4,
  },

  // Meta Llama
  [MODELS.LLAMA_3_1_70B]: {
    id: MODELS.LLAMA_3_1_70B,
    name: 'Llama 3.1 70B',
    provider: 'meta',
    contextLength: 128000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
  },
  [MODELS.LLAMA_3_1_8B]: {
    id: MODELS.LLAMA_3_1_8B,
    name: 'Llama 3.1 8B',
    provider: 'meta',
    contextLength: 128000,
    maxOutputTokens: 4096,
    supportsThinking: false,
    supportsStreaming: true,
  },

  // Google Gemini
  [MODELS.GEMINI_PRO_1_5]: {
    id: MODELS.GEMINI_PRO_1_5,
    name: 'Gemini Pro 1.5',
    provider: 'google',
    contextLength: 2000000,
    maxOutputTokens: 8192,
    supportsThinking: false,
    supportsStreaming: true,
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a canonical model ID to a provider-specific model ID
 */
export function toProviderModel(
  canonicalId: string,
  provider: AIProviderType
): string {
  return MODEL_MAPPINGS[provider][canonicalId] ?? canonicalId;
}

/**
 * Convert a provider-specific model ID to a canonical model ID
 */
export function toCanonicalModel(
  providerModelId: string,
  provider: AIProviderType
): string {
  return REVERSE_MODEL_MAPPINGS[provider][providerModelId] ?? providerModelId;
}

/**
 * Get model info for a canonical model ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
  return MODEL_INFO[modelId];
}

/**
 * Check if a model supports extended thinking
 */
export function supportsThinking(modelId: string): boolean {
  return MODEL_INFO[modelId]?.supportsThinking ?? false;
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: AIProviderType): string {
  return DEFAULT_MODELS[provider];
}

/**
 * Get the default thinking model for a provider
 */
export function getDefaultThinkingModel(provider: AIProviderType): string {
  return DEFAULT_THINKING_MODELS[provider];
}
