/**
 * @forprompt/providers
 *
 * Provider abstractions for ForPrompt, enabling support for multiple
 * backends (Convex/PostgreSQL) and auth providers (Clerk/NextAuth).
 */

// Auth provider types
export type {
  User,
  Session,
  AuthProvider,
  AuthProviderFactory,
} from './auth/index.js';

// Data provider types
export type {
  QueryOptions,
  PaginatedResult,
  DataProvider,
  DataProviderFactory,
} from './data/index.js';

// AI provider types
export type {
  Message,
  MessageWithThinking,
  CompletionOptions,
  ThinkingOptions,
  CompletionResult,
  ThinkingResult,
  StreamChunk,
  ModelInfo,
  AIProviderConfig,
  AIProvider,
  AIProviderFactory,
  AIProviderType,
  AIProviderRegistry,
} from './ai/index.js';

// AI provider implementations
export {
  BaseAIProvider,
  OpenRouterProvider,
  OpenAIProvider,
  AnthropicProvider,
  OllamaProvider,
  createOpenRouterProvider,
  createOpenAIProvider,
  createAnthropicProvider,
  createOllamaProvider,
} from './ai/index.js';

// AI provider factory
export {
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
} from './ai/index.js';

// Model utilities
export {
  MODELS,
  MODEL_MAPPINGS,
  MODEL_INFO,
  DEFAULT_MODELS,
  DEFAULT_THINKING_MODELS,
  toProviderModel,
  toCanonicalModel,
  getModelInfo,
  supportsThinking,
  getDefaultModel,
  getDefaultThinkingModel,
} from './ai/index.js';

export type { ModelId } from './ai/index.js';
