/**
 * Tests for Type Definitions and Validation
 */

import { describe, it, expect } from 'vitest';
import { ForPromptError } from '../types';
import type {
  ForPromptConfig,
  Prompt,
  GetPromptOptions,
  SyncConfig,
  WebhookEvent,
  SyncResponse,
} from '../types';

describe('Type Definitions', () => {
  describe('ForPromptError', () => {
    it('should create error with all properties', () => {
      const error = new ForPromptError('Test message', 404, 'NOT_FOUND');

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.name).toBe('ForPromptError');
    });

    it('should have correct prototype chain', () => {
      const error = new ForPromptError('Test', 500, 'ERROR');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ForPromptError).toBe(true);
    });

    it('should be catchable as Error', () => {
      try {
        throw new ForPromptError('Test', 400, 'BAD_REQUEST');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ForPromptError);
        if (error instanceof ForPromptError) {
          expect(error.statusCode).toBe(400);
        }
      }
    });
  });

  describe('Type Interfaces', () => {
    it('should validate ForPromptConfig structure', () => {
      const config: ForPromptConfig = {
        apiKey: 'test-key',
        baseUrl: 'https://example.com',
      };

      expect(config.apiKey).toBe('test-key');
      expect(config.baseUrl).toBe('https://example.com');
    });

    it('should validate Prompt structure', () => {
      const prompt: Prompt = {
        key: 'test-prompt',
        name: 'Test Prompt',
        versionNumber: 1,
        systemPrompt: 'System prompt content',
        updatedAt: Date.now(),
        purpose: 'Testing',
        expectedBehavior: 'Should behave correctly',
      };

      expect(prompt.key).toBe('test-prompt');
      expect(prompt.versionNumber).toBe(1);
      expect(prompt.systemPrompt).toBeTruthy();
    });

    it('should allow optional Prompt fields', () => {
      const minimalPrompt: Prompt = {
        key: 'minimal',
        name: 'Minimal',
        versionNumber: 1,
        systemPrompt: 'Content',
        updatedAt: Date.now(),
      };

      expect(minimalPrompt.purpose).toBeUndefined();
      expect(minimalPrompt.description).toBeUndefined();
    });

    it('should validate GetPromptOptions', () => {
      const options: GetPromptOptions = {
        version: 2,
      };

      expect(options.version).toBe(2);
    });

    it('should validate SyncConfig structure', () => {
      const config: SyncConfig = {
        baseUrl: 'https://example.com',
        projectId: 'project-123',
        apiKey: 'test-key',
        outputDir: './prompts',
        format: 'typescript',
      };

      expect(config.projectId).toBe('project-123');
      expect(config.format).toBe('typescript');
    });

    it('should validate WebhookEvent structure', () => {
      const event: WebhookEvent = {
        event: 'prompt.updated',
        timestamp: Date.now(),
        projectId: 'project-123',
        data: {
          promptId: 'prompt-456',
          promptKey: 'test-prompt',
          versionNumber: 2,
        },
      };

      expect(event.event).toBe('prompt.updated');
      expect(event.data.promptKey).toBe('test-prompt');
    });

    it('should validate SyncResponse structure', () => {
      const response: SyncResponse = {
        projectId: 'project-123',
        syncedAt: Date.now(),
        prompts: [
          {
            key: 'prompt1',
            name: 'Prompt 1',
            versionNumber: 1,
            systemPrompt: 'Content',
            updatedAt: Date.now(),
          },
        ],
      };

      expect(response.prompts.length).toBe(1);
      expect(response.prompts[0]?.key).toBe('prompt1');
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ForPromptConfig to be partial', () => {
      const minimalConfig: Pick<ForPromptConfig, 'apiKey'> = {
        apiKey: 'test',
      };

      expect(minimalConfig.apiKey).toBe('test');
    });

    it('should support extended Prompt types', () => {
      interface ExtendedPrompt extends Prompt {
        customField: string;
      }

      const extended: ExtendedPrompt = {
        key: 'test',
        name: 'Test',
        versionNumber: 1,
        systemPrompt: 'Content',
        updatedAt: Date.now(),
        customField: 'custom',
      };

      expect(extended.customField).toBe('custom');
    });
  });
});
