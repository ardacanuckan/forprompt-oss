/**
 * Base AI Provider
 *
 * Abstract base class with shared functionality for all AI providers.
 */

import type {
  AIProvider,
  AIProviderConfig,
  Message,
  CompletionOptions,
  CompletionResult,
  ThinkingOptions,
  ThinkingResult,
  StreamChunk,
  ModelInfo,
} from '../index';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;

  protected config: AIProviderConfig;
  protected defaultMaxTokens: number;
  protected timeout: number;

  constructor(config: AIProviderConfig = {}) {
    this.config = config;
    this.defaultMaxTokens = config.defaultMaxTokens ?? 2048;
    this.timeout = config.timeout ?? 60000;
  }

  /**
   * Generate a completion from messages
   */
  abstract complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  /**
   * Generate a completion with extended thinking support
   * Default implementation falls back to regular completion
   */
  async completeWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): Promise<ThinkingResult> {
    const result = await this.complete(messages, options);
    return {
      ...result,
      thinking: undefined,
    };
  }

  /**
   * Stream a completion from messages
   */
  abstract stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk>;

  /**
   * List available models for this provider
   */
  abstract listModels(): Promise<ModelInfo[]>;

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelId: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some((m) => m.id === modelId);
  }

  /**
   * Get information about a specific model
   */
  async getModelInfo(modelId: string): Promise<ModelInfo | null> {
    const models = await this.listModels();
    return models.find((m) => m.id === modelId) ?? null;
  }

  /**
   * Helper to get API key from config or environment
   */
  protected getApiKey(envVar: string): string {
    const key = this.config.apiKey ?? process.env[envVar];
    if (!key) {
      throw new Error(`API key not configured. Set ${envVar} or provide apiKey in config.`);
    }
    return key;
  }

  /**
   * Helper to make HTTP requests with timeout and error handling
   */
  protected async makeRequest<T>(
    url: string,
    options: RequestInit
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Helper for SSE streaming
   */
  protected async *streamSSE(
    url: string,
    options: RequestInit
  ): AsyncIterable<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data && data !== '[DONE]') {
              yield data;
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
