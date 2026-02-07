/**
 * Tests for ForPrompt Logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForPromptLogger, createLogger } from '../trace';
import { ForPromptError } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ForPrompt Logger', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('Constructor', () => {
    it('should create logger with API key', () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      expect(logger).toBeInstanceOf(ForPromptLogger);
    });

    it('should use environment variable when API key not provided', () => {
      process.env.FORPROMPT_API_KEY = 'env-key';
      const logger = new ForPromptLogger();
      expect(logger).toBeInstanceOf(ForPromptLogger);
      delete process.env.FORPROMPT_API_KEY;
    });
  });

  describe('startTrace()', () => {
    it('should start a new trace with generated ID', () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      const traceId = logger.startTrace('test-prompt');

      expect(traceId).toBeTruthy();
      expect(typeof traceId).toBe('string');
      expect(logger.getTraceId()).toBe(traceId);
      expect(logger.isTracing()).toBe(true);
    });

    it('should start trace with custom ID', () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      const customId = 'custom-trace-id';
      const traceId = logger.startTrace('test-prompt', { traceId: customId });

      expect(traceId).toBe(customId);
      expect(logger.getTraceId()).toBe(customId);
    });

    it('should store version number', () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      logger.startTrace('test-prompt', { versionNumber: 2 });

      expect(logger.getVersionNumber()).toBe(2);
    });
  });

  describe('log()', () => {
    it('should log a user message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      logger.startTrace('test-prompt');

      await logger.log({
        role: 'user',
        content: 'Hello',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/log'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
          body: expect.stringContaining('Hello'),
        })
      );
    });

    it('should log an assistant message with metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      logger.startTrace('test-prompt', { versionNumber: 2 });

      await logger.log({
        role: 'assistant',
        content: 'Response',
        model: 'gpt-4o',
        tokens: { input: 10, output: 50 },
        durationMs: 1200,
        metadata: { temperature: 0.7 },
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.role).toBe('assistant');
      expect(body.model).toBe('gpt-4o');
      expect(body.inputTokens).toBe(10);
      expect(body.outputTokens).toBe(50);
      expect(body.durationMs).toBe(1200);
      expect(body.versionNumber).toBe(2);
    });

    it('should auto-generate trace ID if not started', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });

      await logger.log({
        role: 'user',
        content: 'Test',
      });

      expect(logger.getTraceId()).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error when API key is missing', async () => {
      const logger = new ForPromptLogger({ apiKey: '' });

      await expect(
        logger.log({ role: 'user', content: 'Test' })
      ).rejects.toThrow(ForPromptError);
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      logger.startTrace('test-prompt');

      await expect(
        logger.log({ role: 'user', content: 'Test' })
      ).rejects.toThrow(ForPromptError);
    });
  });

  describe('logRequest()', () => {
    it('should log a single request/response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });

      const result = await logger.logRequest({
        promptKey: 'test-prompt',
        versionNumber: 2,
        input: 'How do I learn Python?',
        output: 'Here are 5 steps...',
        model: 'gpt-4o',
        tokens: { input: 10, output: 150 },
        durationMs: 1200,
      });

      expect(result.traceId).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(2); // Input + output

      // Check input log
      const inputCall = mockFetch.mock.calls[0];
      const inputBody = JSON.parse(inputCall[1].body);
      expect(inputBody.role).toBe('user');
      expect(inputBody.content).toBe('How do I learn Python?');
      expect(inputBody.promptKey).toBe('test-prompt');

      // Check output log
      const outputCall = mockFetch.mock.calls[1];
      const outputBody = JSON.parse(outputCall[1].body);
      expect(outputBody.role).toBe('assistant');
      expect(outputBody.content).toBe('Here are 5 steps...');
      expect(outputBody.model).toBe('gpt-4o');
    });

    it('should use custom trace ID', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        });

      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      const customId = 'custom-id';

      const result = await logger.logRequest({
        promptKey: 'test-prompt',
        traceId: customId,
        input: 'Input',
        output: 'Output',
      });

      expect(result.traceId).toBe(customId);
    });

    it('should throw error when API key is missing', async () => {
      const logger = new ForPromptLogger({ apiKey: '' });

      await expect(
        logger.logRequest({
          promptKey: 'test-prompt',
          input: 'Input',
          output: 'Output',
        })
      ).rejects.toThrow(ForPromptError);
    });
  });

  describe('endTrace()', () => {
    it('should clear trace state', async () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });
      logger.startTrace('test-prompt', { versionNumber: 2 });

      expect(logger.isTracing()).toBe(true);

      await logger.endTrace();

      expect(logger.isTracing()).toBe(false);
      expect(logger.getTraceId()).toBeNull();
      expect(logger.getVersionNumber()).toBeNull();
    });

    it('should handle endTrace when not tracing', async () => {
      const logger = new ForPromptLogger({ apiKey: 'test-key' });

      await expect(logger.endTrace()).resolves.not.toThrow();
    });
  });

  describe('createLogger()', () => {
    it('should create logger instance', () => {
      const logger = createLogger({ apiKey: 'test-key' });
      expect(logger).toBeInstanceOf(ForPromptLogger);
    });

    it('should create logger from environment', () => {
      process.env.FORPROMPT_API_KEY = 'env-key';
      const logger = createLogger();
      expect(logger).toBeInstanceOf(ForPromptLogger);
      delete process.env.FORPROMPT_API_KEY;
    });
  });
});
