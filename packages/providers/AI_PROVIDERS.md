# AI Providers

The `@forprompt/providers` package provides a unified interface for multiple AI/LLM providers. This allows ForPrompt to support direct API calls to various LLM providers without requiring OpenRouter.

## Supported Providers

| Provider | Environment Variable | Features |
|----------|---------------------|----------|
| **OpenRouter** | `OPENROUTER_API_KEY` | Access to 100+ models via single API |
| **OpenAI** | `OPENAI_API_KEY` | GPT-4, GPT-4o, o1, o3 models |
| **Anthropic** | `ANTHROPIC_API_KEY` | Claude 3, Claude 3.5, Claude 4 models |
| **Ollama** | `OLLAMA_HOST` (optional) | Self-hosted open-source models |

## Quick Start

### Installation

```typescript
import { createProvider, openai, anthropic } from '@forprompt/providers';

// Create provider using factory (uses AI_PROVIDER env var)
const ai = createProvider();

// Or create specific provider
const openaiProvider = openai();
const anthropicProvider = anthropic();
```

### Basic Usage

```typescript
import { createProvider, type Message } from '@forprompt/providers';

const ai = createProvider('anthropic', { apiKey: 'sk-...' });

const messages: Message[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Hello!' }
];

// Complete
const result = await ai.complete(messages, {
  model: 'claude-3-5-sonnet',
  maxTokens: 1024
});
console.log(result.content);

// Stream
for await (const chunk of ai.stream(messages)) {
  process.stdout.write(chunk.content);
}
```

## Configuration

### Environment Variables

```bash
# Provider Selection
AI_PROVIDER=openrouter  # Default: openrouter. Options: openrouter, openai, anthropic, ollama

# Provider-specific API Keys
OPENROUTER_API_KEY=sk-or-...
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Custom base URLs
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENAI_BASE_URL=https://api.openai.com/v1
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
OLLAMA_HOST=http://localhost:11434

# Common settings
AI_DEFAULT_MODEL=claude-3-5-sonnet
AI_DEFAULT_MAX_TOKENS=2048
AI_TIMEOUT=60000
```

### Programmatic Configuration

```typescript
import { createProvider, type AIProviderConfig } from '@forprompt/providers';

const config: AIProviderConfig = {
  apiKey: 'sk-...',
  baseUrl: 'https://api.openai.com/v1',
  defaultModel: 'gpt-4o',
  defaultMaxTokens: 4096,
  timeout: 30000,
  headers: {
    'OpenAI-Organization': 'org-...'
  }
};

const ai = createProvider('openai', config);
```

## Extended Thinking

Some models support extended thinking (reasoning), which allows the model to show its thought process.

```typescript
import { createProvider } from '@forprompt/providers';

const ai = createProvider('anthropic');

const result = await ai.completeWithThinking(messages, {
  model: 'claude-sonnet-4',
  enableThinking: true,
  thinkingBudget: 10000  // Token budget for thinking
});

console.log('Thinking:', result.thinking);
console.log('Answer:', result.content);
```

### Models with Thinking Support

| Provider | Models |
|----------|--------|
| Anthropic | Claude Sonnet 4, Claude Opus 4 |
| OpenAI | o1, o1-mini, o1-pro, o3-mini |
| OpenRouter | Any model that supports thinking |

## Model Mapping

The package uses canonical model IDs that are automatically mapped to provider-specific identifiers.

```typescript
import { toProviderModel, toCanonicalModel, MODELS } from '@forprompt/providers';

// Canonical ID -> Provider-specific ID
toProviderModel('claude-3-5-sonnet', 'anthropic');  // 'claude-3-5-sonnet-latest'
toProviderModel('claude-3-5-sonnet', 'openrouter'); // 'anthropic/claude-3.5-sonnet'

// Provider-specific ID -> Canonical ID
toCanonicalModel('gpt-4o', 'openai');  // 'gpt-4o'

// Use canonical model names
const result = await ai.complete(messages, {
  model: MODELS.CLAUDE_3_5_SONNET
});
```

### Available Canonical Models

```typescript
MODELS.CLAUDE_3_5_SONNET   // claude-3-5-sonnet
MODELS.CLAUDE_3_OPUS       // claude-3-opus
MODELS.CLAUDE_SONNET_4     // claude-sonnet-4
MODELS.CLAUDE_OPUS_4       // claude-opus-4
MODELS.GPT_4O              // gpt-4o
MODELS.GPT_4O_MINI         // gpt-4o-mini
MODELS.O1                  // o1
MODELS.O3_MINI             // o3-mini
MODELS.LLAMA_3_1_70B       // llama-3.1-70b
MODELS.GEMINI_PRO_1_5      // gemini-pro-1.5
```

## Provider-Specific Features

### OpenRouter

Access 100+ models from various providers through a single API.

```typescript
import { openrouter } from '@forprompt/providers';

const ai = openrouter({
  headers: {
    'HTTP-Referer': 'https://myapp.com',
    'X-Title': 'My App'
  }
});

// Use any model available on OpenRouter
await ai.complete(messages, { model: 'anthropic/claude-3.5-sonnet' });
await ai.complete(messages, { model: 'openai/gpt-4o' });
await ai.complete(messages, { model: 'google/gemini-pro-1.5' });
```

### OpenAI

Direct access to OpenAI's models including reasoning models.

```typescript
import { openai } from '@forprompt/providers';

const ai = openai({
  headers: {
    'OpenAI-Organization': 'org-...'
  }
});

// Regular completion
await ai.complete(messages, { model: 'gpt-4o' });

// Reasoning model (o1/o3)
await ai.completeWithThinking(messages, {
  model: 'o1',
  maxTokens: 16000
});
```

**Note:** o1/o3 models automatically convert system messages to user messages as these models don't support the system role.

### Anthropic

Direct access to Claude models with native thinking support.

```typescript
import { anthropic } from '@forprompt/providers';

const ai = anthropic();

// Claude 4 with thinking
const result = await ai.completeWithThinking(messages, {
  model: 'claude-sonnet-4',
  enableThinking: true,
  thinkingBudget: 5000
});

// Stream with thinking
for await (const chunk of ai.streamWithThinking(messages, options)) {
  if (chunk.thinking) console.log('Thinking:', chunk.thinking);
  if (chunk.content) console.log('Content:', chunk.content);
}
```

### Ollama

Self-hosted LLM inference with local models.

```typescript
import { ollama } from '@forprompt/providers';

const ai = ollama({
  baseUrl: 'http://localhost:11434'
});

// Check if Ollama is running
if (await ai.isAvailable()) {
  // List available models
  const models = await ai.listModels();

  // Pull a model if needed
  await ai.pullModel('llama3.2');

  // Use local model
  await ai.complete(messages, { model: 'llama3.2' });
}
```

## API Reference

### AIProvider Interface

```typescript
interface AIProvider {
  readonly name: string;

  complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult>;
  completeWithThinking(messages: Message[], options?: ThinkingOptions): Promise<ThinkingResult>;
  stream(messages: Message[], options?: CompletionOptions): AsyncIterable<StreamChunk>;
  streamWithThinking?(messages: Message[], options?: ThinkingOptions): AsyncIterable<StreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  isModelAvailable(modelId: string): Promise<boolean>;
  getModelInfo(modelId: string): Promise<ModelInfo | null>;
}
```

### Types

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface ThinkingOptions extends CompletionOptions {
  enableThinking?: boolean;
  thinkingBudget?: number;
}

interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

interface ThinkingResult extends CompletionResult {
  thinking?: string;
}

interface StreamChunk {
  content: string;
  thinking?: string;
  isComplete: boolean;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  maxOutputTokens?: number;
  supportsThinking?: boolean;
  supportsStreaming?: boolean;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
}
```

## Provider Registry

For applications that need to manage multiple providers:

```typescript
import { createProviderRegistry } from '@forprompt/providers';

const registry = createProviderRegistry();

// Set default provider
registry.setDefault('anthropic');

// Create providers as needed
const openaiProvider = registry.create('openai', { apiKey: '...' });
const anthropicProvider = registry.create('anthropic', { apiKey: '...' });

// Get default provider
const defaultProvider = registry.getDefault();

// List available providers
const providers = registry.listProviders();
// ['openrouter', 'openai', 'anthropic', 'ollama']
```

## Migration from convex/lib/ai.ts

If you're migrating from the existing `convex/lib/ai.ts`:

```typescript
// Before (convex/lib/ai.ts)
import { chat, chatWithUsage, chatWithThinking } from '../lib/ai';

const response = await chat({ messages, model: 'anthropic/claude-3.5-sonnet' });

// After (@forprompt/providers)
import { createProvider, MODELS } from '@forprompt/providers';

const ai = createProvider();
const result = await ai.complete(messages, { model: MODELS.CLAUDE_3_5_SONNET });
const response = result.content;
```

### Mapping Old Functions

| Old Function | New Method |
|--------------|------------|
| `chat()` | `provider.complete()` |
| `chatWithUsage()` | `provider.complete()` (result includes usage) |
| `chatWithThinking()` | `provider.completeWithThinking()` |
