/**
 * Browser-specific ForPrompt client with IndexedDB caching
 */

import type { ForPromptConfig, Prompt, GetPromptOptions } from "./types";
import { ForPromptError } from "./types";
import { IndexedDBStorage } from "./storage/IndexedDBStorage";

export class ForPromptBrowser {
  private baseUrl: string;
  private projectId: string;
  private apiKey?: string;
  private storage: IndexedDBStorage;
  private initialized: boolean = false;

  constructor(config: ForPromptConfig & { enableCache?: boolean }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.projectId = config.projectId;
    this.apiKey = config.apiKey;
    this.storage = new IndexedDBStorage();
  }

  /**
   * Initialize IndexedDB storage
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.storage.init();
      this.initialized = true;
    }
  }

  /**
   * Fetch prompt from API
   */
  private async fetchFromAPI(key: string, options?: GetPromptOptions): Promise<Prompt> {
    const url = new URL(`${this.baseUrl}/api/prompts`);
    url.searchParams.set("projectId", this.projectId);
    url.searchParams.set("key", key);

    if (options?.version !== undefined) {
      url.searchParams.set("version", String(options.version));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new ForPromptError(
        error.error || `Failed to fetch prompt: ${key}`,
        response.status,
        response.status === 404 ? "PROMPT_NOT_FOUND" : "API_ERROR"
      );
    }

    return response.json() as Promise<Prompt>;
  }

  /**
   * Get a prompt by its key (with IndexedDB caching)
   */
  async getPrompt(key: string, options?: GetPromptOptions): Promise<Prompt> {
    await this.ensureInitialized();

    try {
      // Try to fetch from API first
      const prompt = await this.fetchFromAPI(key, options);

      // Cache in IndexedDB
      await this.storage.savePrompt(prompt);

      return prompt;
    } catch (error) {
      // If API fails, try to get from cache
      if (error instanceof ForPromptError && error.code === "API_ERROR") {
        const cachedPrompt = await this.storage.getPrompt(key);
        if (cachedPrompt) {
          console.warn(`Using cached version of prompt: ${key}`);
          return cachedPrompt;
        }
      }

      throw error;
    }
  }

  /**
   * Get multiple prompts by their keys
   */
  async getPrompts(
    keys: string[],
    options?: GetPromptOptions
  ): Promise<Map<string, Prompt>> {
    const results = await Promise.allSettled(
      keys.map((key) => this.getPrompt(key, options))
    );

    const promptMap = new Map<string, Prompt>();

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        promptMap.set(keys[index]!, result.value);
      }
    });

    return promptMap;
  }

  /**
   * Sync all prompts from API to IndexedDB
   */
  async sync(): Promise<Prompt[]> {
    await this.ensureInitialized();

    const url = new URL(`${this.baseUrl}/api/sync`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers["X-API-Key"] = this.apiKey;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new ForPromptError(
        error.error || "Failed to sync prompts",
        response.status,
        "SYNC_ERROR"
      );
    }

    const data = await response.json();
    const prompts: Prompt[] = data.prompts;

    // Save all prompts to IndexedDB
    await this.storage.savePrompts(prompts);

    return prompts;
  }

  /**
   * Get all cached prompts
   */
  async getCachedPrompts(): Promise<Prompt[]> {
    await this.ensureInitialized();
    return await this.storage.getAllPrompts();
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    await this.ensureInitialized();
    await this.storage.clear();
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(): Promise<{ syncedAt: number; promptCount: number } | null> {
    await this.ensureInitialized();
    return await this.storage.getMetadata();
  }
}

/**
 * Create a browser ForPrompt client instance
 */
export function createForPromptBrowser(
  config: ForPromptConfig & { enableCache?: boolean }
): ForPromptBrowser {
  return new ForPromptBrowser(config);
}

