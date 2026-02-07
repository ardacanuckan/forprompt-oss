/**
 * OpenRouter AI Provider
 *
 * Provides access to multiple AI models through the OpenRouter API.
 * Supports Claude, GPT, Gemini, Llama, and many other models.
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

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_THINKING_BUDGET = 10000;

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterChoice {
  index: number;
  message: {
    role: string;
    content: string;
    reasoning?: string;
    reasoning_content?: string;
  };
  finish_reason: string;
}

interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: OpenRouterChoice[];
  usage: OpenRouterUsage;
}

interface OpenRouterStreamChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      content?: string;
      reasoning?: string;
    };
    finish_reason: string | null;
  }>;
}

interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export class OpenRouterProvider extends BaseAIProvider {
  readonly name = 'openrouter';

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private referer: string;
  private siteName: string;

  constructor(config: AIProviderConfig = {}) {
    super(config);
    this.apiKey = this.getApiKey('OPENROUTER_API_KEY');
    this.baseUrl = config.baseUrl ?? OPENROUTER_API_URL;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODELS.openrouter;
    this.referer = config.headers?.['HTTP-Referer'] ?? 'https://forprompt.dev';
    this.siteName = config.headers?.['X-Title'] ?? 'ForPrompt';
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': this.referer,
      'X-Title': this.siteName,
      ...this.config.headers,
    };
  }

  private resolveModel(model?: string): string {
    if (!model) return this.defaultModel;
    // If it's a canonical model ID, convert to OpenRouter format
    return MODEL_MAPPINGS.openrouter[model] ?? model;
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const model = this.resolveModel(options?.model);

    const response = await this.makeRequest<OpenRouterResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages: messages as OpenRouterMessage[],
          max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
          temperature: options?.temperature,
          stop: options?.stopSequences,
        }),
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
    const enableThinking = options?.enableThinking ?? true;

    // Check if model supports thinking
    const modelSupportsThinking = model.includes('claude-sonnet-4') ||
                                   model.includes('claude-opus-4');

    const requestBody: Record<string, unknown> = {
      model,
      messages: messages as OpenRouterMessage[],
      max_tokens: options?.maxTokens ?? 16000,
      temperature: options?.temperature,
      stop: options?.stopSequences,
    };

    if (enableThinking && modelSupportsThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: options?.thinkingBudget ?? DEFAULT_THINKING_BUDGET,
      };
    }

    const response = await this.makeRequest<OpenRouterResponse>(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    const message = response.choices[0]?.message;
    const thinking = message?.reasoning ?? message?.reasoning_content;

    return {
      content: message?.content ?? '',
      thinking,
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

    const streamGen = this.streamSSE(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model,
        messages: messages as OpenRouterMessage[],
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature,
        stop: options?.stopSequences,
        stream: true,
      }),
    });

    for await (const data of streamGen) {
      try {
        const chunk = JSON.parse(data) as OpenRouterStreamChunk;
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        yield {
          content: delta?.content ?? '',
          thinking: delta?.reasoning,
          isComplete: finishReason !== null,
        };
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  async *streamWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): AsyncIterable<StreamChunk> {
    const model = this.resolveModel(options?.model);
    const enableThinking = options?.enableThinking ?? true;

    const modelSupportsThinking = model.includes('claude-sonnet-4') ||
                                   model.includes('claude-opus-4');

    const requestBody: Record<string, unknown> = {
      model,
      messages: messages as OpenRouterMessage[],
      max_tokens: options?.maxTokens ?? 16000,
      temperature: options?.temperature,
      stop: options?.stopSequences,
      stream: true,
    };

    if (enableThinking && modelSupportsThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: options?.thinkingBudget ?? DEFAULT_THINKING_BUDGET,
      };
    }

    const streamGen = this.streamSSE(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    for await (const data of streamGen) {
      try {
        const chunk = JSON.parse(data) as OpenRouterStreamChunk;
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        yield {
          content: delta?.content ?? '',
          thinking: delta?.reasoning,
          isComplete: finishReason !== null,
        };
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.makeRequest<{ data: OpenRouterModel[] }>(
        `${this.baseUrl}/models`,
        {
          method: 'GET',
          headers: this.getHeaders(),
        }
      );

      return response.data.map((model) => {
        const canonicalId = toCanonicalModel(model.id, 'openrouter');
        const baseInfo = MODEL_INFO[canonicalId];

        return {
          id: model.id,
          name: model.name,
          provider: 'openrouter',
          contextLength: model.context_length,
          maxOutputTokens: baseInfo?.maxOutputTokens,
          supportsThinking: baseInfo?.supportsThinking ??
            (model.id.includes('claude-sonnet-4') || model.id.includes('claude-opus-4')),
          supportsStreaming: true,
          inputPricePerMillion: model.pricing ? parseFloat(model.pricing.prompt) * 1000000 : undefined,
          outputPricePerMillion: model.pricing ? parseFloat(model.pricing.completion) * 1000000 : undefined,
        };
      });
    } catch {
      // Fallback to static model list if API call fails
      return Object.entries(MODEL_MAPPINGS.openrouter).map(([canonical, providerId]) => {
        const info = MODEL_INFO[canonical];
        return {
          id: providerId,
          name: info?.name ?? providerId,
          provider: 'openrouter',
          contextLength: info?.contextLength ?? 4096,
          maxOutputTokens: info?.maxOutputTokens,
          supportsThinking: info?.supportsThinking,
          supportsStreaming: info?.supportsStreaming ?? true,
          inputPricePerMillion: info?.inputPricePerMillion,
          outputPricePerMillion: info?.outputPricePerMillion,
        };
      });
    }
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

export function createOpenRouterProvider(config?: AIProviderConfig): OpenRouterProvider {
  return new OpenRouterProvider(config);
}
