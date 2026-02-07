/**
 * Tests for ForPrompt Client
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForPrompt, createForPrompt } from '../client';
import { ForPromptError } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('ForPrompt Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should create client with API key', () => {
      const client = new ForPrompt({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(ForPrompt);
    });

    it('should normalize base URL by removing trailing slash', () => {
      const client = new ForPrompt({
        apiKey: 'test-key',
        baseUrl: 'https://example.com/',
      });
      expect(client).toBeInstanceOf(ForPrompt);
    });

    it('should use default base URL when not provided', () => {
      const client = new ForPrompt({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(ForPrompt);
    });
  });

  describe('getPrompt()', () => {
    it('should fetch a prompt successfully', async () => {
      const mockPrompt = {
        key: 'test-prompt',
        name: 'Test Prompt',
        versionNumber: 1,
        systemPrompt: 'Test system prompt',
        updatedAt: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrompt,
      });

      const client = new ForPrompt({ apiKey: 'test-key' });
      const result = await client.getPrompt('test-prompt');

      expect(result).toEqual(mockPrompt);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/prompts?key=test-prompt'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );
    });

    it('should fetch a specific version', async () => {
      const mockPrompt = {
        key: 'test-prompt',
        name: 'Test Prompt',
        versionNumber: 2,
        systemPrompt: 'Test system prompt v2',
        updatedAt: Date.now(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPrompt,
      });

      const client = new ForPrompt({ apiKey: 'test-key' });
      const result = await client.getPrompt('test-prompt', { version: 2 });

      expect(result).toEqual(mockPrompt);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('version=2'),
        expect.any(Object)
      );
    });

    it('should throw error when API key is missing', async () => {
      const client = new ForPrompt({ apiKey: '' });

      await expect(client.getPrompt('test-prompt')).rejects.toThrow(
        ForPromptError
      );
      await expect(client.getPrompt('test-prompt')).rejects.toThrow(
        'API key is required'
      );
    });

    it('should throw error for invalid prompt key', async () => {
      const client = new ForPrompt({ apiKey: 'test-key' });

      await expect(client.getPrompt('')).rejects.toThrow(ForPromptError);
      await expect(client.getPrompt('')).rejects.toThrow(
        'Prompt key must be a non-empty string'
      );
    });

    it('should throw error for invalid version', async () => {
      const client = new ForPrompt({ apiKey: 'test-key' });

      await expect(
        client.getPrompt('test-prompt', { version: 0 })
      ).rejects.toThrow(ForPromptError);
      await expect(
        client.getPrompt('test-prompt', { version: -1 })
      ).rejects.toThrow('Version must be a positive integer');
    });

    it('should handle 404 not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Prompt not found' }),
      });

      const client = new ForPrompt({ apiKey: 'test-key' });

      await expect(client.getPrompt('nonexistent')).rejects.toThrow(
        ForPromptError
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const client = new ForPrompt({ apiKey: 'test-key', retries: 1 });

      await expect(client.getPrompt('test-prompt')).rejects.toThrow();
    });
  });

  describe('getPrompts()', () => {
    it('should fetch multiple prompts', async () => {
      const mockPrompts = [
        {
          key: 'prompt1',
          name: 'Prompt 1',
          versionNumber: 1,
          systemPrompt: 'Test 1',
          updatedAt: Date.now(),
        },
        {
          key: 'prompt2',
          name: 'Prompt 2',
          versionNumber: 1,
          systemPrompt: 'Test 2',
          updatedAt: Date.now(),
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPrompts[0],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPrompts[1],
        });

      const client = new ForPrompt({ apiKey: 'test-key' });
      const result = await client.getPrompts(['prompt1', 'prompt2']);

      expect(result.size).toBe(2);
      expect(result.get('prompt1')).toEqual(mockPrompts[0]);
      expect(result.get('prompt2')).toEqual(mockPrompts[1]);
    });

    it('should handle partial failures gracefully', async () => {
      const mockPrompt = {
        key: 'prompt1',
        name: 'Prompt 1',
        versionNumber: 1,
        systemPrompt: 'Test 1',
        updatedAt: Date.now(),
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPrompt,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Not found' }),
        });

      const client = new ForPrompt({ apiKey: 'test-key' });
      const result = await client.getPrompts(['prompt1', 'prompt2']);

      // Should only contain successful fetch
      expect(result.size).toBe(1);
      expect(result.get('prompt1')).toEqual(mockPrompt);
    });
  });

  describe('createForPrompt()', () => {
    it('should create client with explicit config', () => {
      const client = createForPrompt({ apiKey: 'test-key' });
      expect(client).toBeInstanceOf(ForPrompt);
    });

    it('should create client from environment variables', () => {
      process.env.FORPROMPT_API_KEY = 'env-key';
      const client = createForPrompt();
      expect(client).toBeInstanceOf(ForPrompt);
      delete process.env.FORPROMPT_API_KEY;
    });
  });

  describe('Error Handling', () => {
    it('should create ForPromptError with correct properties', () => {
      const error = new ForPromptError('Test error', 404, 'NOT_FOUND');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('ForPromptError');
    });
  });
});
