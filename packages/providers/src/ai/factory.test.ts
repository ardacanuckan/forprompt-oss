/**
 * AI Provider Factory Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createProvider,
  createProviderFromEnv,
  createProviderRegistry,
  getDefaultProvider,
  getDefaultProviderType,
  setDefaultProviderType,
  listProviderTypes,
  isValidProviderType,
  getProviderConfigFromEnv,
  clearDefaultProvider,
  openrouter,
  openai,
  anthropic,
  ollama,
} from './factory';
import { OpenRouterProvider } from './providers/openrouter';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';

describe('AI Provider Factory', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearDefaultProvider();
    // Set up all API keys
    process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    delete process.env.AI_PROVIDER;
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.AI_PROVIDER;
    delete process.env.AI_DEFAULT_MODEL;
    delete process.env.AI_DEFAULT_MAX_TOKENS;
    delete process.env.AI_TIMEOUT;
  });

  describe('createProvider', () => {
    it('should create OpenRouter provider by default', () => {
      const provider = createProvider();
      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });

    it('should create specified provider type', () => {
      expect(createProvider('openrouter')).toBeInstanceOf(OpenRouterProvider);
      expect(createProvider('openai')).toBeInstanceOf(OpenAIProvider);
      expect(createProvider('anthropic')).toBeInstanceOf(AnthropicProvider);
      expect(createProvider('ollama')).toBeInstanceOf(OllamaProvider);
    });

    it('should throw error for unknown provider type', () => {
      // @ts-expect-error Testing invalid type
      expect(() => createProvider('unknown')).toThrow('Unknown AI provider type');
    });

    it('should pass config to provider', () => {
      const provider = createProvider('openrouter', { defaultModel: 'custom-model' });
      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });
  });

  describe('getDefaultProviderType', () => {
    it('should return openrouter by default', () => {
      expect(getDefaultProviderType()).toBe('openrouter');
    });

    it('should return AI_PROVIDER from environment', () => {
      process.env.AI_PROVIDER = 'anthropic';
      expect(getDefaultProviderType()).toBe('anthropic');
    });

    it('should handle case-insensitive AI_PROVIDER', () => {
      process.env.AI_PROVIDER = 'OPENAI';
      expect(getDefaultProviderType()).toBe('openai');
    });

    it('should fallback to default for invalid AI_PROVIDER', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      process.env.AI_PROVIDER = 'invalid';

      // Need to call setDefault first to reset to openrouter
      setDefaultProviderType('openrouter');
      expect(getDefaultProviderType()).toBe('openrouter');

      consoleSpy.mockRestore();
    });
  });

  describe('setDefaultProviderType', () => {
    it('should set default provider type', () => {
      setDefaultProviderType('anthropic');
      delete process.env.AI_PROVIDER;
      expect(getDefaultProviderType()).toBe('anthropic');
    });

    it('should throw error for unknown type', () => {
      // @ts-expect-error Testing invalid type
      expect(() => setDefaultProviderType('unknown')).toThrow('Unknown AI provider type');
    });
  });

  describe('getDefaultProvider', () => {
    it('should return singleton provider', () => {
      const provider1 = getDefaultProvider();
      const provider2 = getDefaultProvider();
      expect(provider1).toBe(provider2);
    });

    it('should create new provider after clearDefaultProvider', () => {
      const provider1 = getDefaultProvider();
      clearDefaultProvider();
      const provider2 = getDefaultProvider();
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('listProviderTypes', () => {
    it('should return all available provider types', () => {
      const types = listProviderTypes();
      expect(types).toContain('openrouter');
      expect(types).toContain('openai');
      expect(types).toContain('anthropic');
      expect(types).toContain('ollama');
      expect(types.length).toBe(4);
    });
  });

  describe('isValidProviderType', () => {
    it('should return true for valid types', () => {
      expect(isValidProviderType('openrouter')).toBe(true);
      expect(isValidProviderType('openai')).toBe(true);
      expect(isValidProviderType('anthropic')).toBe(true);
      expect(isValidProviderType('ollama')).toBe(true);
    });

    it('should return false for invalid types', () => {
      expect(isValidProviderType('unknown')).toBe(false);
      expect(isValidProviderType('')).toBe(false);
    });
  });

  describe('getProviderConfigFromEnv', () => {
    it('should get OpenRouter config from env', () => {
      process.env.OPENROUTER_API_KEY = 'my-key';
      process.env.OPENROUTER_BASE_URL = 'https://custom.url';

      const config = getProviderConfigFromEnv('openrouter');

      expect(config.apiKey).toBe('my-key');
      expect(config.baseUrl).toBe('https://custom.url');
    });

    it('should get OpenAI config from env', () => {
      process.env.OPENAI_API_KEY = 'my-openai-key';
      process.env.OPENAI_ORGANIZATION = 'my-org';

      const config = getProviderConfigFromEnv('openai');

      expect(config.apiKey).toBe('my-openai-key');
      expect(config.headers?.['OpenAI-Organization']).toBe('my-org');
    });

    it('should get common config from env', () => {
      process.env.AI_DEFAULT_MODEL = 'custom-model';
      process.env.AI_DEFAULT_MAX_TOKENS = '4096';
      process.env.AI_TIMEOUT = '30000';

      const config = getProviderConfigFromEnv();

      expect(config.defaultModel).toBe('custom-model');
      expect(config.defaultMaxTokens).toBe(4096);
      expect(config.timeout).toBe(30000);
    });
  });

  describe('createProviderFromEnv', () => {
    it('should create provider with env config', () => {
      process.env.AI_PROVIDER = 'openai';
      process.env.OPENAI_API_KEY = 'my-key';

      const provider = createProviderFromEnv();

      expect(provider).toBeInstanceOf(OpenAIProvider);
    });
  });

  describe('convenience functions', () => {
    it('should create OpenRouter provider', () => {
      const provider = openrouter();
      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });

    it('should create OpenAI provider', () => {
      const provider = openai();
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should create Anthropic provider', () => {
      const provider = anthropic();
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it('should create Ollama provider', () => {
      const provider = ollama();
      expect(provider).toBeInstanceOf(OllamaProvider);
    });
  });

  describe('createProviderRegistry', () => {
    it('should create registry with all providers', () => {
      const registry = createProviderRegistry();
      const types = registry.listProviders();

      expect(types).toContain('openrouter');
      expect(types).toContain('openai');
      expect(types).toContain('anthropic');
      expect(types).toContain('ollama');
    });

    it('should create providers', () => {
      const registry = createProviderRegistry();

      const openrouterProvider = registry.create('openrouter');
      expect(openrouterProvider).toBeInstanceOf(OpenRouterProvider);
    });

    it('should get default provider', () => {
      const registry = createProviderRegistry();
      const provider = registry.getDefault();

      expect(provider).toBeInstanceOf(OpenRouterProvider);
    });

    it('should allow changing default', () => {
      const registry = createProviderRegistry();
      registry.setDefault('anthropic');

      const provider = registry.getDefault();
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });
  });
});
