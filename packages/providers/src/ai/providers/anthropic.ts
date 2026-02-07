/**
 * Anthropic AI Provider
 *
 * Direct integration with Anthropic's API for Claude models.
 * Supports Claude 3.5, Claude 3, and Claude 4 with extended thinking.
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

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_THINKING_BUDGET = 10000;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: 'text' | 'thinking';
  text?: string;
  thinking?: string;
}

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

interface AnthropicContent {
  type: 'text' | 'thinking';
  text?: string;
  thinking?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContent[];
  model: string;
  stop_reason: string;
  usage: AnthropicUsage;
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  content_block?: {
    type: string;
    text?: string;
    thinking?: string;
  };
  delta?: {
    type: string;
    text?: string;
    thinking?: string;
    stop_reason?: string;
  };
  message?: {
    usage?: AnthropicUsage;
  };
}

interface AnthropicModel {
  id: string;
  name: string;
  description: string;
  max_tokens: number;
}

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic';

  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private apiVersion: string;

  constructor(config: AIProviderConfig = {}) {
    super(config);
    this.apiKey = this.getApiKey('ANTHROPIC_API_KEY');
    this.baseUrl = config.baseUrl ?? ANTHROPIC_API_URL;
    this.defaultModel = config.defaultModel ?? DEFAULT_MODELS.anthropic;
    this.apiVersion = ANTHROPIC_API_VERSION;
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': this.apiVersion,
      ...this.config.headers,
    };
  }

  private resolveModel(model?: string): string {
    if (!model) return this.defaultModel;
    // If it's a canonical model ID, convert to Anthropic format
    return MODEL_MAPPINGS.anthropic[model] ?? model;
  }

  private supportsThinking(model: string): boolean {
    return model.includes('sonnet-4') || model.includes('opus-4');
  }

  /**
   * Convert messages to Anthropic format
   * Anthropic uses system prompt separately, not in messages array
   */
  private prepareMessages(messages: Message[]): {
    system: string | undefined;
    messages: AnthropicMessage[];
  } {
    let systemPrompt: string | undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = (systemPrompt ? systemPrompt + '\n\n' : '') + msg.content;
      } else {
        anthropicMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Ensure first message is from user (Anthropic requirement)
    const firstMessage = anthropicMessages[0];
    if (anthropicMessages.length > 0 && firstMessage && firstMessage.role === 'assistant') {
      // Prepend empty user message if needed
      anthropicMessages.unshift({ role: 'user', content: '' });
    }

    return { system: systemPrompt, messages: anthropicMessages };
  }

  async complete(
    messages: Message[],
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const model = this.resolveModel(options?.model);
    const { system, messages: anthropicMessages } = this.prepareMessages(messages);

    const requestBody: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
    };

    if (system) {
      requestBody.system = system;
    }

    if (options?.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const response = await this.makeRequest<AnthropicResponse>(
      `${this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    return {
      content: textContent,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapFinishReason(response.stop_reason),
    };
  }

  async completeWithThinking(
    messages: Message[],
    options?: ThinkingOptions
  ): Promise<ThinkingResult> {
    const model = this.resolveModel(options?.model);
    const { system, messages: anthropicMessages } = this.prepareMessages(messages);
    const enableThinking = options?.enableThinking !== false && this.supportsThinking(model);

    const requestBody: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 16000,
    };

    if (system) {
      requestBody.system = system;
    }

    if (enableThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: options?.thinkingBudget ?? DEFAULT_THINKING_BUDGET,
      };
    }

    if (options?.temperature !== undefined && !enableThinking) {
      // Temperature not supported with thinking enabled
      requestBody.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const response = await this.makeRequest<AnthropicResponse>(
      `${this.baseUrl}/messages`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(requestBody),
      }
    );

    const textContent = response.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('');

    const thinkingContent = response.content
      .filter((c) => c.type === 'thinking')
      .map((c) => c.thinking)
      .join('');

    return {
      content: textContent,
      thinking: thinkingContent || undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapFinishReason(response.stop_reason),
    };
  }

  async *stream(
    messages: Message[],
    options?: CompletionOptions
  ): AsyncIterable<StreamChunk> {
    const model = this.resolveModel(options?.model);
    const { system, messages: anthropicMessages } = this.prepareMessages(messages);

    const requestBody: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
      stream: true,
    };

    if (system) {
      requestBody.system = system;
    }

    if (options?.temperature !== undefined) {
      requestBody.temperature = options.temperature;
    }

    if (options?.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const streamGen = this.streamSSE(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    for await (const data of streamGen) {
      try {
        const event = JSON.parse(data) as AnthropicStreamEvent;

        if (event.type === 'content_block_delta' && event.delta) {
          yield {
            content: event.delta.text ?? '',
            isComplete: false,
          };
        } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
          yield {
            content: '',
            isComplete: true,
          };
        }
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
    const { system, messages: anthropicMessages } = this.prepareMessages(messages);
    const enableThinking = options?.enableThinking !== false && this.supportsThinking(model);

    const requestBody: Record<string, unknown> = {
      model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 16000,
      stream: true,
    };

    if (system) {
      requestBody.system = system;
    }

    if (enableThinking) {
      requestBody.thinking = {
        type: 'enabled',
        budget_tokens: options?.thinkingBudget ?? DEFAULT_THINKING_BUDGET,
      };
    }

    if (options?.stopSequences) {
      requestBody.stop_sequences = options.stopSequences;
    }

    const streamGen = this.streamSSE(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(requestBody),
    });

    let currentBlockType: 'text' | 'thinking' | null = null;

    for await (const data of streamGen) {
      try {
        const event = JSON.parse(data) as AnthropicStreamEvent;

        if (event.type === 'content_block_start' && event.content_block) {
          currentBlockType = event.content_block.type as 'text' | 'thinking';
        } else if (event.type === 'content_block_delta' && event.delta) {
          yield {
            content: currentBlockType === 'text' ? (event.delta.text ?? '') : '',
            thinking: currentBlockType === 'thinking' ? (event.delta.thinking ?? '') : undefined,
            isComplete: false,
          };
        } else if (event.type === 'content_block_stop') {
          currentBlockType = null;
        } else if (event.type === 'message_delta' && event.delta?.stop_reason) {
          yield {
            content: '',
            isComplete: true,
          };
        }
      } catch {
        // Skip invalid JSON chunks
      }
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    // Anthropic doesn't have a public models endpoint, use static list
    return Object.entries(MODEL_MAPPINGS.anthropic).map(([canonical, providerId]) => {
      const info = MODEL_INFO[canonical];
      return {
        id: providerId,
        name: info?.name ?? providerId,
        provider: 'anthropic',
        contextLength: info?.contextLength ?? 200000,
        maxOutputTokens: info?.maxOutputTokens,
        supportsThinking: this.supportsThinking(providerId),
        supportsStreaming: true,
        inputPricePerMillion: info?.inputPricePerMillion,
        outputPricePerMillion: info?.outputPricePerMillion,
      };
    });
  }

  private mapFinishReason(
    reason: string
  ): 'stop' | 'length' | 'content_filter' | 'tool_calls' {
    switch (reason) {
      case 'end_turn':
      case 'stop_sequence':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'tool_use':
        return 'tool_calls';
      default:
        return 'stop';
    }
  }
}

export function createAnthropicProvider(config?: AIProviderConfig): AnthropicProvider {
  return new AnthropicProvider(config);
}
