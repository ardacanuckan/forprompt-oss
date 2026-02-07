/**
 * Ollama Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider, createOllamaProvider } from './ollama';
import type { Message } from '../index';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.OLLAMA_HOST;
  });

  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    it('should not require API key', () => {
      // Ollama doesn't need an API key by default
      expect(() => new OllamaProvider()).not.toThrow();
    });

    it('should use OLLAMA_HOST from environment', () => {
      process.env.OLLAMA_HOST = 'http://custom-host:11434';
      const provider = new OllamaProvider();
      expect(provider.name).toBe('ollama');
    });

    it('should use custom base URL from config', () => {
      const provider = new OllamaProvider({ baseUrl: 'http://my-ollama:11434' });
      expect(provider.name).toBe('ollama');
    });
  });

  describe('complete', () => {
    it('should send request with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            done_reason: 'stop',
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      });

      const provider = new OllamaProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      const result = await provider.complete(messages);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result.content).toBe('Hello!');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);
      expect(result.finishReason).toBe('stop');
    });

    it('should handle custom model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      });

      const provider = new OllamaProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'codellama:13b' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('codellama:13b');
    });

    it('should handle canonical model mapping', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      });

      const provider = new OllamaProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages, { model: 'llama-3.1-70b' });

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.model).toBe('llama3.1:70b');
    });

    it('should set stream to false for non-streaming requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      });

      const provider = new OllamaProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      await provider.complete(messages);

      const [, options] = mockFetch.mock.calls[0];
      const body = JSON.parse(options.body);
      expect(body.stream).toBe(false);
    });
  });

  describe('completeWithThinking', () => {
    it('should fall back to regular completion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            message: { role: 'assistant', content: 'Hello!' },
            done: true,
            prompt_eval_count: 10,
            eval_count: 5,
          }),
      });

      const provider = new OllamaProvider();
      const messages: Message[] = [{ role: 'user', content: 'Hi' }];

      const result = await provider.completeWithThinking(messages, {
        enableThinking: true,
      });

      expect(result.content).toBe('Hello!');
      expect(result.thinking).toBeUndefined();
    });
  });

  describe('listModels', () => {
    it('should return models from Ollama API', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              models: [
                {
                  name: 'llama3.2:latest',
                  model: 'llama3.2:latest',
                  size: 2000000000,
                  details: { family: 'llama', parameter_size: '3B' },
                },
                {
                  name: 'mistral:7b',
                  model: 'mistral:7b',
                  size: 4000000000,
                  details: { family: 'mistral', parameter_size: '7B' },
                },
              ],
            }),
        })
        // Mock show calls for context length
        .mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              model_info: { 'general.context_length': 8192 },
            }),
        });

      const provider = new OllamaProvider();
      const models = await provider.listModels();

      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('llama3.2:latest');
      expect(models[1].id).toBe('mistral:7b');
      expect(models.every((m) => m.supportsThinking === false)).toBe(true);
    });

    it('should return empty list if Ollama is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const provider = new OllamaProvider();
      const models = await provider.listModels();

      expect(models).toEqual([]);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is running', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ models: [] }),
      });

      const provider = new OllamaProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when Ollama is not running', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const provider = new OllamaProvider();
      const available = await provider.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('factory function', () => {
    it('should create provider using factory', () => {
      const provider = createOllamaProvider();
      expect(provider).toBeInstanceOf(OllamaProvider);
      expect(provider.name).toBe('ollama');
    });
  });
});
