/**
 * Simple test script to verify AI providers work
 * Run with: node test-providers.mjs
 */

import assert from 'node:assert';
import {
  createProvider,
  getDefaultProviderType,
  listProviderTypes,
  isValidProviderType,
  MODELS,
  toProviderModel,
  MODEL_INFO,
} from './dist/index.js';

console.log('Testing AI Providers...\n');

// Test 1: Provider types
console.log('Test 1: List provider types');
const types = listProviderTypes();
assert.deepStrictEqual(types, ['openrouter', 'openai', 'anthropic', 'ollama']);
console.log('  ✅ Provider types:', types);

// Test 2: Valid provider type check
console.log('\nTest 2: Validate provider types');
assert.strictEqual(isValidProviderType('openrouter'), true);
assert.strictEqual(isValidProviderType('openai'), true);
assert.strictEqual(isValidProviderType('anthropic'), true);
assert.strictEqual(isValidProviderType('ollama'), true);
assert.strictEqual(isValidProviderType('invalid'), false);
console.log('  ✅ Provider type validation works');

// Test 3: Default provider type
console.log('\nTest 3: Default provider type');
const defaultType = getDefaultProviderType();
assert.strictEqual(defaultType, 'openrouter');
console.log('  ✅ Default provider type:', defaultType);

// Test 4: Model mappings
console.log('\nTest 4: Model mappings');
const claudeModel = toProviderModel('claude-3-5-sonnet', 'openrouter');
assert.strictEqual(claudeModel, 'anthropic/claude-3.5-sonnet');
console.log('  ✅ claude-3-5-sonnet -> openrouter:', claudeModel);

const gpt4oModel = toProviderModel('gpt-4o', 'openai');
assert.strictEqual(gpt4oModel, 'gpt-4o');
console.log('  ✅ gpt-4o -> openai:', gpt4oModel);

// Test 5: Model info
console.log('\nTest 5: Model info');
const claudeInfo = MODEL_INFO['claude-3-5-sonnet'];
assert.ok(claudeInfo);
assert.strictEqual(claudeInfo.name, 'Claude 3.5 Sonnet');
assert.strictEqual(claudeInfo.contextLength, 200000);
console.log('  ✅ Claude 3.5 Sonnet info:', claudeInfo.name, 'context:', claudeInfo.contextLength);

// Test 6: Create Ollama provider (doesn't require API key)
console.log('\nTest 6: Create Ollama provider');
const ollamaProvider = createProvider('ollama');
assert.strictEqual(ollamaProvider.name, 'ollama');
console.log('  ✅ Ollama provider created successfully');

// Test 7: Check all providers can be created with API keys
console.log('\nTest 7: Create providers with mock API keys');
process.env.OPENROUTER_API_KEY = 'test-key';
process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';

const openrouterProvider = createProvider('openrouter');
assert.strictEqual(openrouterProvider.name, 'openrouter');
console.log('  ✅ OpenRouter provider created');

const openaiProvider = createProvider('openai');
assert.strictEqual(openaiProvider.name, 'openai');
console.log('  ✅ OpenAI provider created');

const anthropicProvider = createProvider('anthropic');
assert.strictEqual(anthropicProvider.name, 'anthropic');
console.log('  ✅ Anthropic provider created');

console.log('\n✅ All tests passed!');
