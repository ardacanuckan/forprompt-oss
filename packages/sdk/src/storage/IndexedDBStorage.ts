/**
 * IndexedDB storage for browser environments
 */

import type { Prompt } from "../types";

const DB_NAME = "ForPromptDB";
const DB_VERSION = 1;
const STORE_NAME = "prompts";

export class IndexedDBStorage {
  private db: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (typeof window === "undefined" || !window.indexedDB) {
      throw new Error("IndexedDB is not available in this environment");
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error("Failed to open IndexedDB"));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          objectStore.createIndex("updatedAt", "updatedAt", { unique: false });
        }
      };
    });
  }

  /**
   * Get all prompts
   */
  async getAllPrompts(): Promise<Prompt[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get prompts from IndexedDB"));
      };
    });
  }

  /**
   * Get a single prompt by key
   */
  async getPrompt(key: string): Promise<Prompt | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get prompt: ${key}`));
      };
    });
  }

  /**
   * Save a prompt
   */
  async savePrompt(prompt: Prompt): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.put(prompt);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to save prompt: ${prompt.key}`));
      };
    });
  }

  /**
   * Save multiple prompts
   */
  async savePrompts(prompts: Prompt[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(STORE_NAME);

      let completed = 0;
      let hasError = false;

      for (const prompt of prompts) {
        const request = objectStore.put(prompt);

        request.onsuccess = () => {
          completed++;
          if (completed === prompts.length && !hasError) {
            resolve();
          }
        };

        request.onerror = () => {
          hasError = true;
          reject(new Error(`Failed to save prompt: ${prompt.key}`));
        };
      }
    });
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(key: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.delete(key);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete prompt: ${key}`));
      };
    });
  }

  /**
   * Clear all prompts
   */
  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const objectStore = transaction.objectStore(STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to clear prompts"));
      };
    });
  }

  /**
   * Get metadata (last sync time, etc.)
   */
  async getMetadata(): Promise<{ syncedAt: number; promptCount: number } | null> {
    const prompts = await this.getAllPrompts();
    if (prompts.length === 0) {
      return null;
    }

    const latestUpdate = Math.max(...prompts.map((p) => p.updatedAt));

    return {
      syncedAt: latestUpdate,
      promptCount: prompts.length,
    };
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

