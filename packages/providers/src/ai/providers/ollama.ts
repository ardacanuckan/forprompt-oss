/**
 * Ollama AI Provider
 *
 * Integration with Ollama for self-hosted LLM inference.
 * Supports Llama, Mistral, Codellama, and other open-source models.
 */

import type {
  AIProviderConfig,
  Message,
  CompletionOptions,
  CompletionResult,
  ThinkingOptions,
  ThinkingResult,
  StreamChunk,
  ModelInfo,
} from '../index';
import { BaseAIProvider } from './base';
import { MODEL_MAPPINGS, DEFAULT_MODELS } from '../models';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface OllamaModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model?: string;
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
  model_info?: {
    'general.context_length'?: number;
  };
}

export class OllamaProvider extends BaseAIProvider {
  readonly name = 'ollama';

  private baseUrl: string;
  private defaultModel: string;

  constructor(config: AIProviderConfig = {}) {
    super(config);
    this.baseUrl = config.baseUrl ?? process.env.OLLAMA_HOST ?? DEFAULT_OLLAMA_URL;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODELS.ollama;
    // Ollama doesn't require an API key by default
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
  }

  private resolveModel(model?: string): string {
    if (!model) return this.defaultModel;
    // If it's a canonical model ID, convert to Ollama format
    return MODEL_MAPPINGS.ollama[model] ?? model;
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const model = this.resolveModel(options?.model);

    const response = await this.makeRequest<OllamaResponse>(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: messages as OllamaMessage[],
          stream: false,
          options: {
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            temperature: options?.temperature,
            stop: options?.stopSequences,
          },
        }),
      }
    );

    return {
      content: response.message.content,
      usage: {
        promptTokens: response.prompt_eval_count ?? 0,
        completionTokens: response.eval_count ?? 0,
        totalTokens: (response.prompt_eval_count ?? 0) + (response.eval_count ?? 0),
      },
      finishReason: this.mapFinishReason(response.done_reason),
    };
  }

  async completeWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): Promise<ThinkingResult> {
    // Ollama doesn't support extended thinking, fall back to regular completion
    const result = await this.complete(messages, options);
    return {
      ...result,
      thinking: undefined,
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const model = this.resolveModel(options?.model);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: messages as OllamaMessage[],
          stream: true,
          options: {
            num_predict: options?.maxTokens ?? this.defaultMaxTokens,
            temperature: options?.temperature,
            stop: options?.stopSequences,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
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
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as OllamaStreamChunk;
              yield {
                content: chunk.message.content,
                isComplete: chunk.done,
              };
            } catch {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest<{ models: OllamaModel[] }>(
        `${this.baseUrl}/api/tags`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      const modelInfoPromises = response.models.map(async (model) => {
        // Try to get detailed model info
        let contextLength = 4096;
        try {
          const info = await this.makeRequest<OllamaModelInfo>(
            `${this.baseUrl}/api/show`,
            {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify({ name: model.name }),
            }
          );
          contextLength = info.model_info?.['general.context_length'] ?? 4096;
        } catch {
          // Use default context length
        }

        return {
          id: model.name,
          name: model.name,
          provider: 'ollama',
          contextLength,
          supportsThinking: false,
          supportsStreaming: true,
        };
      });

      return Promise.all(modelInfoPromises);
    } catch {
      // Return empty list if Ollama is not running
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to pull model: ${errorText}`);
    }

    // Stream through the pull response to completion
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
  }

  /**
   * Check if Ollama server is running
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private mapFinishReason(
    reason?: string
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      default:
        return 'stop';
    }
  }
}

export function createOllamaProvider(config?: AIProviderConfig): OllamaProvider {
  return new OllamaProvider(config);
}
