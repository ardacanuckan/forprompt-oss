/**
 * ForPrompt Client
 *
 * Simple usage with auto-configuration:
 * @example
 * ```typescript
 * import { forprompt } from "@forprompt/sdk";
 *
 * // Auto-loads from FORPROMPT_API_KEY env variable
 * const prompt = await forprompt.getPrompt("userContextPrompt");
 * ```
 */

import type { ForPromptConfig, Prompt, GetPromptOptions } from "./types";
import { ForPromptError } from "./types";

const DEFAULT_BASE_URL = "https://wooden-fox-811.convex.site";
const DEFAULT_TIMEOUT = 30_000; // 30 seconds
const DEFAULT_RETRIES = 3;

/**
 * Extended client configuration with security options
 */
export interface ForPromptClientConfig {
  /** Project API key (required) */
  apiKey: string;
  /** Base URL for API (default: https://wooden-fox-811.convex.site) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function getBackoffDelay(attempt: number): number {
  const baseDelay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s, ...
  const jitter = Math.random() * 500; // 0-500ms random jitter
  return Math.min(baseDelay + jitter, 30_000); // Max 30s
}

export class ForPrompt {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retries: number;

  constructor(config: ForPromptClientConfig | ForPromptConfig | { apiKey: string; baseUrl?: string }) {
    this.apiKey = config.apiKey || "";
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.timeout = (config as ForPromptClientConfig).timeout ?? DEFAULT_TIMEOUT;
    this.retries = (config as ForPromptClientConfig).retries ?? DEFAULT_RETRIES;
  }

  /**
   * Fetch with timeout support using AbortController
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new ForPromptError(
          `Request timeout after ${this.timeout}ms`,
          408,
          "TIMEOUT"
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Fetch with retry and exponential backoff
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options);

        // Don't retry client errors (4xx) - they won't succeed on retry
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Success
        if (response.ok) {
          return response;
        }

        // Server error (5xx) - will retry
        lastError = new ForPromptError(
          `Server error: ${response.status}`,
          response.status,
          "SERVER_ERROR"
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry timeout errors
        if (error instanceof ForPromptError && error.code === "TIMEOUT") {
          throw error;
        }
      }

      // Wait before retrying (unless this is the last attempt)
      if (attempt < this.retries - 1) {
        const delay = getBackoffDelay(attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new ForPromptError(
      "Request failed after retries",
      500,
      "RETRY_EXHAUSTED"
    );
  }

  /**
   * Get a prompt by its key
   *
   * @example
   * ```typescript
   * const prompt = await forprompt.getPrompt("userContextPrompt");
   * console.log(prompt.systemPrompt);
   * ```
   *
   * @example With specific version
   * ```typescript
   * const prompt = await forprompt.getPrompt("userContextPrompt", { version: 2 });
   * ```
   */
  async getPrompt(key: string, options?: GetPromptOptions): Promise<Prompt> {
    if (!this.apiKey) {
      throw new ForPromptError(
        "API key is required. Set FORPROMPT_API_KEY environment variable or pass apiKey in config.",
        401,
        "MISSING_API_KEY"
      );
    }

    // Input validation
    if (!key || typeof key !== "string") {
      throw new ForPromptError(
        "Prompt key must be a non-empty string",
        400,
        "INVALID_INPUT"
      );
    }

    if (key.length > 256) {
      throw new ForPromptError(
        "Prompt key must be 256 characters or less",
        400,
        "INVALID_INPUT"
      );
    }

    if (options?.version !== undefined) {
      if (!Number.isInteger(options.version) || options.version < 1) {
        throw new ForPromptError(
          "Version must be a positive integer",
          400,
          "INVALID_INPUT"
        );
      }
    }

    const url = new URL(`${this.baseUrl}/api/prompts`);
    url.searchParams.set("key", key);

    if (options?.version !== undefined) {
      url.searchParams.set("version", String(options.version));
    }

    const response = await this.fetchWithRetry(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new ForPromptError(
        errorData.error || `Failed to fetch prompt: ${key}`,
        response.status,
        response.status === 404 ? "PROMPT_NOT_FOUND" : "API_ERROR"
      );
    }

    return response.json() as Promise<Prompt>;
  }

  /**
   * Get multiple prompts by their keys
   *
   * Requests are made in parallel with concurrency limit to avoid overwhelming the server.
   *
   * @example
   * ```typescript
   * const prompts = await forprompt.getPrompts(["userContext", "chatDefault"]);
   * ```
   */
  async getPrompts(
    keys: string[],
    options?: GetPromptOptions
  ): Promise<Map<string, Prompt>> {
    // Limit concurrent requests to avoid overwhelming the server
    const CONCURRENCY_LIMIT = 5;
    const promptMap = new Map<string, Prompt>();

    // Process in batches
    for (let i = 0; i < keys.length; i += CONCURRENCY_LIMIT) {
      const batch = keys.slice(i, i + CONCURRENCY_LIMIT);

      const results = await Promise.allSettled(
        batch.map((key) => this.getPrompt(key, options))
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          promptMap.set(batch[index]!, result.value);
        }
      });
    }

    return promptMap;
  }
}

/**
 * Create a ForPrompt client instance
 *
 * @example With explicit config
 * ```typescript
 * import { createForPrompt } from "@forprompt/sdk";
 *
 * const client = createForPrompt({
 *   apiKey: "fp_xxx",
 * });
 *
 * const prompt = await client.getPrompt("userContextPrompt");
 * ```
 *
 * @example With timeout and retry config
 * ```typescript
 * const client = createForPrompt({
 *   apiKey: "fp_xxx",
 *   timeout: 10000, // 10 seconds
 *   retries: 5,
 * });
 * ```
 *
 * @example Auto-config from environment
 * ```typescript
 * import { forprompt } from "@forprompt/sdk";
 *
 * // Uses FORPROMPT_API_KEY from environment
 * const prompt = await forprompt.getPrompt("userContextPrompt");
 * ```
 */
export function createForPrompt(config?: Partial<ForPromptClientConfig>): ForPrompt {
  const apiKey = config?.apiKey || process.env.FORPROMPT_API_KEY || "";
  const baseUrl = config?.baseUrl || process.env.FORPROMPT_BASE_URL;

  return new ForPrompt({
    apiKey,
    baseUrl,
    timeout: config?.timeout,
    retries: config?.retries,
  });
}

/**
 * Default ForPrompt client instance
 *
 * Auto-configured from environment variables:
 * - FORPROMPT_API_KEY: Your project API key
 * - FORPROMPT_BASE_URL: Custom base URL (optional)
 *
 * @example
 * ```typescript
 * import { forprompt } from "@forprompt/sdk";
 *
 * const prompt = await forprompt.getPrompt("userContextPrompt");
 * console.log(prompt.systemPrompt);
 * ```
 */
export const forprompt = createForPrompt();
