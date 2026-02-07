/**
 * OpenAI AI Provider
 *
 * Direct integration with OpenAI's API for GPT models.
 * Supports GPT-4, GPT-4o, o1, o3, and other OpenAI models.
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
import { MODEL_MAPPINGS, MODEL_INFO, DEFAULT_MODELS, toCanonicalModel } from '../models';

const OPENAI_API_URL = 'https://api.openai.com/v1';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  };
}

interface OpenAIResponse {
  id: string;
  model: string;
  choices: OpenAIChoice[];
  usage: OpenAIUsage;
}

interface OpenAIStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }>;
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai';

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private organization?: string;

  constructor(config: AIProviderConfig = {}) {
    super(config);
    this.apiKey = this.getApiKey('OPENAI_API_KEY');
    this.baseUrl = config.baseUrl ?? OPENAI_API_URL;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODELS.openai;
    this.organization = config.headers?.['OpenAI-Organization'];
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    return { ...headers, ...this.config.headers };
  }

  private resolveModel(model?: string): string {
    if (!model) return this.defaultModel;
    // If it's a canonical model ID, convert to OpenAI format
    return MODEL_MAPPINGS.openai[model] ?? model;
  }

  private isO1Family(model: string): boolean {
    return model.startsWith('o1') || model.startsWith('o3');
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const model = this.resolveModel(options?.model);
    const isReasoning = this.isO1Family(model);

    // o1/o3 models don't support system messages or temperature
    const processedMessages = isReasoning
      ? this.convertSystemToUser(messages)
      : messages;

    const requestBody: Record<string, unknown> = {
      model,
      messages: processedMessages as OpenAIMessage[],
    };

    // o1/o3 models use max_completion_tokens instead of max_tokens
    if (isReasoning) {
      requestBody.max_completion_tokens = options?.maxTokens ?? this.defaultMaxTokens;
    } else {
      requestBody.max_tokens = options?.maxTokens ?? this.defaultMaxTokens;
      if (options?.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options?.stopSequences) {
        requestBody.stop = options.stopSequences;
      }
    }

    const response = await this.makeRequest<OpenAIResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    return {
      content: response.choices[0]?.message.content ?? '',
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: this.mapFinishReason(response.choices[0]?.finish_reason ?? 'stop'),
    };
  }

  async completeWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): Promise<ThinkingResult> {
    const model = this.resolveModel(options?.model);
    const isReasoning = this.isO1Family(model);

    const processedMessages = isReasoning
      ? this.convertSystemToUser(messages)
      : messages;

    const requestBody: Record<string, unknown> = {
      model,
      messages: processedMessages as OpenAIMessage[],
    };

    if (isReasoning) {
      requestBody.max_completion_tokens = options?.maxTokens ?? 16000;
      // Request reasoning tokens in the response
      if (options?.enableThinking !== false) {
        requestBody.reasoning_effort = 'high';
      }
    } else {
      requestBody.max_tokens = options?.maxTokens ?? this.defaultMaxTokens;
      if (options?.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options?.stopSequences) {
        requestBody.stop = options.stopSequences;
      }
    }

    const response = await this.makeRequest<OpenAIResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    // OpenAI doesn't expose reasoning content directly,
    // but we can report reasoning tokens used
    const reasoningTokens = response.usage.completion_tokens_details?.reasoning_tokens;

    return {
      content: response.choices[0]?.message.content ?? '',
      thinking: reasoningTokens ? `[${reasoningTokens} reasoning tokens used]` : undefined,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      finishReason: this.mapFinishReason(response.choices[0]?.finish_reason ?? 'stop'),
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const model = this.resolveModel(options?.model);
    const isReasoning = this.isO1Family(model);

    const processedMessages = isReasoning
      ? this.convertSystemToUser(messages)
      : messages;

    const requestBody: Record<string, unknown> = {
      model,
      messages: processedMessages as OpenAIMessage[],
      stream: true,
    };

    if (isReasoning) {
      requestBody.max_completion_tokens = options?.maxTokens ?? this.defaultMaxTokens;
    } else {
      requestBody.max_tokens = options?.maxTokens ?? this.defaultMaxTokens;
      if (options?.temperature !== undefined) {
        requestBody.temperature = options.temperature;
      }
      if (options?.stopSequences) {
        requestBody.stop = options.stopSequences;
      }
    }

    const streamGen = this.streamSSE(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    for await (const data of streamGen) {
      try {
        const chunk = JSON.parse(data) as OpenAIStreamChunk;
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        yield {
          content: delta?.content ?? '',
          isComplete: finishReason !== null,
        };
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest<{ data: OpenAIModel[] }>(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      // Filter to only chat models
      const chatModels = response.data.filter(
        (m) =>
          m.id.includes('gpt') ||
          m.id.startsWith('o1') ||
          m.id.startsWith('o3')
      );

      return chatModels.map((model) => {
        const canonicalId = toCanonicalModel(model.id, 'openai');
        const baseInfo = MODEL_INFO[canonicalId];

        return {
          id: model.id,
          name: baseInfo?.name ?? model.id,
          provider: 'openai',
          contextLength: baseInfo?.contextLength ?? 4096,
          maxOutputTokens: baseInfo?.maxOutputTokens,
          supportsThinking: this.isO1Family(model.id),
          supportsStreaming: true,
          inputPricePerMillion: baseInfo?.inputPricePerMillion,
          outputPricePerMillion: baseInfo?.outputPricePerMillion,
        };
      });
    } catch {
      // Fallback to static model list if API call fails
      return Object.entries(MODEL_MAPPINGS.openai).map(([canonical, providerId]) => {
        const info = MODEL_INFO[canonical];
        return {
          id: providerId,
          name: info?.name ?? providerId,
          provider: 'openai',
          contextLength: info?.contextLength ?? 4096,
          maxOutputTokens: info?.maxOutputTokens,
          supportsThinking: this.isO1Family(providerId),
          supportsStreaming: info?.supportsStreaming ?? true,
          inputPricePerMillion: info?.inputPricePerMillion,
          outputPricePerMillion: info?.outputPricePerMillion,
        };
      });
    }
  }

  /**
   * Convert system messages to user messages for o1/o3 models
   * These models don't support system role
   */
  private convertSystemToUser(messages: Message[]): Message[] {
    return messages.map((msg) =>
      msg.role === 'system' ? { ...msg, role: 'user' as const } : msg
    );
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      case 'tool_calls':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }
}

export function createOpenAIProvider(config?: AIProviderConfig): OpenAIProvider {
  return new OpenAIProvider(config);
}
