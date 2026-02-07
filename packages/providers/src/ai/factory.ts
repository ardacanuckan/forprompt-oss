/**
 * AI Provider Factory
 *
 * Factory for creating AI provider instances based on configuration.
 * Supports selection via AI_PROVIDER environment variable.
 */

import type {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  AIProviderRegistry,
  AIProviderFactory,
} from './index';
import {
  createOpenRouterProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createOllamaProvider,
} from './providers/index';

// ============================================================================
// Provider Registry
// ============================================================================

const providerFactories = new Map<AIProviderType, AIProviderFactory>();
providerFactories.set('openrouter', createOpenRouterProvider);
providerFactories.set('openai', createOpenAIProvider);
providerFactories.set('anthropic', createAnthropicProvider);
providerFactories.set('ollama', createOllamaProvider);

let defaultProviderType: AIProviderType = 'openrouter';
let cachedDefaultProvider: AIProvider | null = null;

/**
 * Create an AI provider registry for managing multiple providers
 */
export function createProviderRegistry(): AIProviderRegistry {
  const providers = new Map<AIProviderType, AIProvider>();
  let registryDefaultType: AIProviderType = 'openrouter';

  return {
    register(type: AIProviderType, factory: AIProviderFactory): void {
      providerFactories.set(type, factory);
    },

    create(type: AIProviderType, config?: AIProviderConfig): AIProvider {
      const factory = providerFactories.get(type);
      if (!factory) {
        throw new Error(`Unknown AI provider type: ${type}`);
      }

      const provider = factory(config);
      providers.set(type, provider);
      return provider;
    },

    getDefault(): AIProvider {
      let provider = providers.get(registryDefaultType);
      if (!provider) {
        provider = this.create(registryDefaultType);
      }
      return provider;
    },

    setDefault(type: AIProviderType): void {
      if (!providerFactories.has(type)) {
        throw new Error(`Unknown AI provider type: ${type}`);
      }
      registryDefaultType = type;
    },

    listProviders(): AIProviderType[] {
      return Array.from(providerFactories.keys());
    },
  };
}

// ============================================================================
// Simple Factory Functions
// ============================================================================

/**
 * Get the default provider type from environment or configuration
 */
export function getDefaultProviderType(): AIProviderType {
  const envProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (envProvider) {
    if (isValidProviderType(envProvider)) {
      return envProvider;
    }
    console.warn(
      `Invalid AI_PROVIDER value: ${envProvider}. Using default: ${defaultProviderType}`
    );
  }

  return defaultProviderType;
}

/**
 * Set the default provider type
 */
export function setDefaultProviderType(type: AIProviderType): void {
  if (!providerFactories.has(type)) {
    throw new Error(`Unknown AI provider type: ${type}`);
  }
  defaultProviderType = type;
  cachedDefaultProvider = null;
}

/**
 * Check if a string is a valid provider type
 */
export function isValidProviderType(type: string): type is AIProviderType {
  return providerFactories.has(type as AIProviderType);
}

/**
 * Create an AI provider instance
 */
export function createProvider(
  type?: AIProviderType,
  config?: AIProviderConfig
): AIProvider {
  const providerType = type ?? getDefaultProviderType();
  const factory = providerFactories.get(providerType);

  if (!factory) {
    throw new Error(`Unknown AI provider type: ${providerType}`);
  }

  return factory(config);
}

/**
 * Get the default AI provider instance (singleton)
 */
export function getDefaultProvider(config?: AIProviderConfig): AIProvider {
  if (!cachedDefaultProvider) {
    cachedDefaultProvider = createProvider(undefined, config);
  }
  return cachedDefaultProvider;
}

/**
 * Clear the cached default provider
 */
export function clearDefaultProvider(): void {
  cachedDefaultProvider = null;
}

/**
 * List all available provider types
 */
export function listProviderTypes(): AIProviderType[] {
  return Array.from(providerFactories.keys());
}

// ============================================================================
// Environment-based Configuration
// ============================================================================

/**
 * Get provider configuration from environment variables
 */
export function getProviderConfigFromEnv(type?: AIProviderType): AIProviderConfig {
  const providerType = type ?? getDefaultProviderType();

  const config: AIProviderConfig = {};

  switch (providerType) {
    case 'openrouter':
      config.apiKey = process.env.OPENROUTER_API_KEY;
      config.baseUrl = process.env.OPENROUTER_BASE_URL;
      break;
    case 'openai':
      config.apiKey = process.env.OPENAI_API_KEY;
      config.baseUrl = process.env.OPENAI_BASE_URL;
      if (process.env.OPENAI_ORGANIZATION) {
        config.headers = { 'OpenAI-Organization': process.env.OPENAI_ORGANIZATION };
      }
      break;
    case 'anthropic':
      config.apiKey = process.env.ANTHROPIC_API_KEY;
      config.baseUrl = process.env.ANTHROPIC_BASE_URL;
      break;
    case 'ollama':
      config.baseUrl = process.env.OLLAMA_HOST ?? process.env.OLLAMA_BASE_URL;
      break;
  }

  // Common config
  if (process.env.AI_DEFAULT_MODEL) {
    config.defaultModel = process.env.AI_DEFAULT_MODEL;
  }

  if (process.env.AI_DEFAULT_MAX_TOKENS) {
    config.defaultMaxTokens = parseInt(process.env.AI_DEFAULT_MAX_TOKENS, 10);
  }

  if (process.env.AI_TIMEOUT) {
    config.timeout = parseInt(process.env.AI_TIMEOUT, 10);
  }

  return config;
}

/**
 * Create a provider with configuration from environment variables
 */
export function createProviderFromEnv(type?: AIProviderType): AIProvider {
  const providerType = type ?? getDefaultProviderType();
  const config = getProviderConfigFromEnv(providerType);
  return createProvider(providerType, config);
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create an OpenRouter provider
 */
export function openrouter(config?: AIProviderConfig): AIProvider {
  return createProvider('openrouter', config);
}

/**
 * Create an OpenAI provider
 */
export function openai(config?: AIProviderConfig): AIProvider {
  return createProvider('openai', config);
}

/**
 * Create an Anthropic provider
 */
export function anthropic(config?: AIProviderConfig): AIProvider {
  return createProvider('anthropic', config);
}

/**
 * Create an Ollama provider
 */
export function ollama(config?: AIProviderConfig): AIProvider {
  return createProvider('ollama', config);
}
