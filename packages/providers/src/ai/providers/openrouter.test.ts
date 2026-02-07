/**
 * OpenRouter Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterProvider, createOpenRouterProvider } from './openrouter';
import type { Message } from '../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenRouterProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENROUTER_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new OpenRouterProvider();
      expect(provider.name).toBe('openrouter');
    });

    it('should throw error if API key is not configured', () => {
      delete process.env.OPENROUTER_API_KEY;
      expect(() => new OpenRouterProvider()).toThrow('API key not configured');
    });

    it('should use provided API key', () => {
      delete process.env.OPENROUTER_API_KEY;
      const provider = new OpenRouterProvider({ apiKey: 'custom-key' });
      expect(provider.name).toBe('openrouter');
    });

    it('should use custom base URL', () => {
      const provider = new OpenRouterProvider({ baseUrl: 'https://custom.api.com' });
      expect(provider.name).toBe('openrouter');
    });
  });

  describe('complete', () => {
    it('should send request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      const result = await provider.complete(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        })
      );

      expect(result.content).toBe('Hello!');
      expect(result.usage.totalTokens).toBe(15);
      expect(result.finishReason).toBe('stop');
    });

    it('should handle custom model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'openai/gpt-4' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('openai/gpt-4');
    });

    it('should handle canonical model mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'claude-3-5-sonnet' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('anthropic/claude-3.5-sonnet');
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await expect(provider.complete(messages)).rejects.toThrow('API error (401)');
    });
  });

  describe('completeWithThinking', () => {
    it('should enable thinking for supported models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content: 'Answer',
                  reasoning: 'Thinking process',
                },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 50, total_tokens: 60 },
          }),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Explain' }];

      const result = await provider.completeWithThinking(messages, {
        model: 'anthropic/claude-sonnet-4',
        enableThinking: true,
        thinkingBudget: 5000,
      });

      expect(result.thinking).toBe('Thinking process');
      expect(result.content).toBe('Answer');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 5000 });
    });

    it('should not enable thinking for unsupported models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Answer' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenRouterProvider();
      const messages: Message[] = [{ role: 'user', content: 'Explain' }];

      await provider.completeWithThinking(messages, {
        model: 'openai/gpt-4',
        enableThinking: true,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.thinking).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should return models from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'openai/gpt-4', name: 'GPT-4', context_length: 8192 },
              { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', context_length: 200000 },
            ],
          }),
      });

      const provider = new OpenRouterProvider();
      const models = await provider.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('openai/gpt-4');
      expect(models[1].contextLength).toBe(200000);
    });

    it('should fallback to static list on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new OpenRouterProvider();
      const models = await provider.listModels();

      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create provider using factory', () => {
      const provider = createOpenRouterProvider();
      expect(provider).toBeInstanceOf(OpenRouterProvider);
      expect(provider.name).toBe('openrouter');
    });

    it('should pass config to factory', () => {
      const provider = createOpenRouterProvider({ defaultModel: 'openai/gpt-4' });
      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });
  });
});
