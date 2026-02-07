/**
 * AI provider abstractions
 *
 * This module defines interfaces for AI/LLM providers,
 * allowing ForPrompt to support multiple AI backends (OpenAI, Anthropic, OpenRouter, Ollama)
 */

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MessageWithThinking extends Message {
  thinking?: string;
}

// ============================================================================
// Completion Options & Results
// ============================================================================

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface ThinkingOptions extends CompletionOptions {
  /** Enable extended thinking (only supported by some providers/models) */
  enableThinking?: boolean;
  /** Token budget for thinking (default varies by provider) */
  thinkingBudget?: number;
}

export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

export interface ThinkingResult extends CompletionResult {
  /** The model's thinking/reasoning process (if available) */
  thinking?: string;
}

export interface StreamChunk {
  content: string;
  thinking?: string;
  isComplete: boolean;
}

// ============================================================================
// Model Information
// ============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  maxOutputTokens?: number;
  supportsThinking?: boolean;
  supportsStreaming?: boolean;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
}

// ============================================================================
// Provider Configuration
// ============================================================================

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultMaxTokens?: number;
  headers?: Record<string, string>;
  timeout?: number;
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface AIProvider {
  /** Provider name identifier */
  readonly name: string;

  /**
   * Generate a completion from messages
   */
  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;

  /**
   * Generate a completion with extended thinking support
   * Falls back to regular completion if thinking not supported
   */
  completeWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): Promise<ThinkingResult>;

  /**
   * Stream a completion from messages
   */
  stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk>;

  /**
   * Stream a completion with extended thinking support
   */
  streamWithThinking?(
    messages: Message[],
    options?: ThinkingOptions
  ): AsyncIterable<StreamChunk>;

  /**
   * List available models for this provider
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Check if a specific model is available
   */
  isModelAvailable(modelId: string): Promise<boolean>;

  /**
   * Get information about a specific model
   */
  getModelInfo(modelId: string): Promise<ModelInfo | null>;
}

// ============================================================================
// Factory Types
// ============================================================================

export type AIProviderFactory = (config?: AIProviderConfig) => AIProvider;

export type AIProviderType = 'openrouter' | 'openai' | 'anthropic' | 'ollama';

export interface AIProviderRegistry {
  register(type: AIProviderType, factory: AIProviderFactory): void;
  create(type: AIProviderType, config?: AIProviderConfig): AIProvider;
  getDefault(): AIProvider;
  setDefault(type: AIProviderType): void;
  listProviders(): AIProviderType[];
}

// ============================================================================
// Re-exports
// ============================================================================

export * from './providers/index';
export * from './models';
export * from './factory';
