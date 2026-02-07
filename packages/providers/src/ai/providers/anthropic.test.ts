/**
 * Anthropic Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnthropicProvider, createAnthropicProvider } from './anthropic';
import type { Message } from '../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('AnthropicProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new AnthropicProvider();
      expect(provider.name).toBe('anthropic');
    });

    it('should throw error if API key is not configured', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(() => new AnthropicProvider()).toThrow('API key not configured');
    });

    it('should use provided API key', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const provider = new AnthropicProvider({ apiKey: 'custom-key' });
      expect(provider.name).toBe('anthropic');
    });
  });

  describe('complete', () => {
    it('should send request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: 'Hello!' }],
            usage: { input_tokens: 10, output_tokens: 5 },
            stop_reason: 'end_turn',
          }),
      });

      const provider = new AnthropicProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      const result = await provider.complete(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );

      expect(result.content).toBe('Hello!');
      expect(result.usage.totalTokens).toBe(15);
      expect(result.finishReason).toBe('stop');
    });

    it('should extract system prompt from messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: 'Hello!' }],
            usage: { input_tokens: 10, output_tokens: 5 },
            stop_reason: 'end_turn',
          }),
      });

      const provider = new AnthropicProvider();
      const messages: Message[] = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hi' },
      ];

      await provider.complete(messages);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);

      expect(body.system).toBe('You are helpful');
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('should handle canonical model mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: 'Hello!' }],
            usage: { input_tokens: 10, output_tokens: 5 },
            stop_reason: 'end_turn',
          }),
      });

      const provider = new AnthropicProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'claude-3-5-sonnet' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('claude-3-5-sonnet-latest');
    });
  });

  describe('completeWithThinking', () => {
    it('should enable thinking for Claude 4 models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [
              { type: 'thinking', thinking: 'Let me think...' },
              { type: 'text', text: 'Answer' },
            ],
            usage: { input_tokens: 10, output_tokens: 100 },
            stop_reason: 'end_turn',
          }),
      });

      const provider = new AnthropicProvider();
      const messages: Message[] = [{ role: 'user', content: 'Think' }];

      const result = await provider.completeWithThinking(messages, {
        model: 'claude-sonnet-4',
        enableThinking: true,
        thinkingBudget: 5000,
      });

      expect(result.thinking).toBe('Let me think...');
      expect(result.content).toBe('Answer');

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.thinking).toEqual({ type: 'enabled', budget_tokens: 5000 });
    });

    it('should not enable thinking for non-Claude 4 models', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            content: [{ type: 'text', text: 'Answer' }],
            usage: { input_tokens: 10, output_tokens: 5 },
            stop_reason: 'end_turn',
          }),
      });

      const provider = new AnthropicProvider();
      const messages: Message[] = [{ role: 'user', content: 'Think' }];

      await provider.completeWithThinking(messages, {
        model: 'claude-3-5-sonnet',
        enableThinking: true,
      });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.thinking).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should return static list of Claude models', async () => {
      const provider = new AnthropicProvider();
      const models = await provider.listModels();

      expect(models.length).toBeGreaterThan(0);
      expect(models.every((m) => m.provider === 'anthropic')).toBe(true);
      expect(models.some((m) => m.id.includes('claude'))).toBe(true);
    });

    it('should include thinking support info', async () => {
      const provider = new AnthropicProvider();
      const models = await provider.listModels();

      const sonnet4 = models.find((m) => m.id.includes('sonnet-4'));
      const sonnet35 = models.find((m) => m.id.includes('3-5-sonnet'));

      expect(sonnet4?.supportsThinking).toBe(true);
      expect(sonnet35?.supportsThinking).toBe(false);
    });
  });

  describe('factory function', () => {
    it('should create provider using factory', () => {
      const provider = createAnthropicProvider();
      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.name).toBe('anthropic');
    });
  });
});
