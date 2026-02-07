/**
 * OpenAI Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider, createOpenAIProvider } from './openai';
import type { Message } from '../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new OpenAIProvider();
      expect(provider.name).toBe('openai');
    });

    it('should throw error if API key is not configured', () => {
      delete process.env.OPENAI_API_KEY;
      expect(() => new OpenAIProvider()).toThrow('API key not configured');
    });

    it('should use provided API key', () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider({ apiKey: 'custom-key' });
      expect(provider.name).toBe('openai');
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

      const provider = new OpenAIProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      const result = await provider.complete(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
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

    it('should use canonical model mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenAIProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'gpt-4o' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('gpt-4o');
    });

    it('should handle o1 models correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Hello!' }, finish_reason: 'stop' }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 100,
              total_tokens: 110,
              completion_tokens_details: { reasoning_tokens: 80 },
            },
          }),
      });

      const provider = new OpenAIProvider();
      const messages: Message[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hi' },
      ];

      await provider.complete(messages, { model: 'o1' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      // o1 should convert system messages to user messages
      expect(body.messages[0].role).toBe('user');
      // o1 should use max_completion_tokens instead of max_tokens
      expect(body.max_completion_tokens).toBeDefined();
      expect(body.max_tokens).toBeUndefined();
    });
  });

  describe('completeWithThinking', () => {
    it('should return thinking info for o1 models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Answer' }, finish_reason: 'stop' }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 100,
              total_tokens: 110,
              completion_tokens_details: { reasoning_tokens: 80 },
            },
          }),
      });

      const provider = new OpenAIProvider();
      const messages: Message[] = [{ role: 'user', content: 'Think' }];

      const result = await provider.completeWithThinking(messages, { model: 'o1' });

      expect(result.content).toBe('Answer');
      expect(result.thinking).toContain('80 reasoning tokens');
    });

    it('should not have thinking for non-reasoning models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: 'Answer' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
      });

      const provider = new OpenAIProvider();
      const messages: Message[] = [{ role: 'user', content: 'Think' }];

      const result = await provider.completeWithThinking(messages, { model: 'gpt-4o' });

      expect(result.thinking).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should return chat models from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'gpt-4o', object: 'model', created: 0, owned_by: 'openai' },
              { id: 'gpt-3.5-turbo', object: 'model', created: 0, owned_by: 'openai' },
              { id: 'text-embedding-ada-002', object: 'model', created: 0, owned_by: 'openai' },
            ],
          }),
      });

      const provider = new OpenAIProvider();
      const models = await provider.listModels();

      // Should filter out non-chat models
      expect(models).toHaveLength(2);
      expect(models.every((m) => m.id.includes('gpt'))).toBe(true);
    });

    it('should fallback to static list on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new OpenAIProvider();
      const models = await provider.listModels();

      expect(models.length).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create provider using factory', () => {
      const provider = createOpenAIProvider();
      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.name).toBe('openai');
    });
  });
});
