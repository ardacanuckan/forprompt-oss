/**
 * File writer for prompt synchronization
 */

import type { Prompt, SyncConfig } from "../types";
import { generateTypeScript } from "../formats/typescript";
import { generateJSON } from "../formats/json";
import { generateYAML } from "../formats/yaml";
import { FileStorage } from "../storage/FileStorage";
import { MemoryStorage } from "../storage/MemoryStorage";

export class FileWriter {
  private storage: FileStorage | MemoryStorage;

  constructor(
    private config: SyncConfig,
    storage?: FileStorage | MemoryStorage
  ) {
    this.storage = storage ?? new FileStorage(config.outputDir);
  }

  /**
   * Write prompts to file(s) based on format configuration
   */
  async writePrompts(prompts: Prompt[], syncedAt: number): Promise<void> {
    const { format, projectId } = this.config;

    if (format === "typescript" || format === "all") {
      const content = generateTypeScript(prompts, syncedAt);
      await this.storage.writeFile("index.ts", content);
    }

    if (format === "json" || format === "all") {
      const content = generateJSON(prompts, syncedAt, projectId);
      await this.storage.writeFile("prompts.json", content);
    }

    if (format === "yaml" || format === "all") {
      const content = generateYAML(prompts, syncedAt, projectId);
      await this.storage.writeFile("prompts.yaml", content);
    }
  }

  /**
   * Read prompts from file
   */
  async readPrompts(): Promise<Prompt[] | null> {
    try {
      // Try JSON first
      const jsonContent = await this.storage.readFile("prompts.json");
      if (jsonContent) {
        const data = JSON.parse(jsonContent);
        return Object.values(data.prompts);
      }

      // Try TypeScript (parse as module - requires eval, not recommended in production)
      // For now, just return null if JSON doesn't exist
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if prompts file exists
   */
  hasPrompts(): boolean {
    return (
      this.storage.fileExists("index.ts") ||
      this.storage.fileExists("prompts.json") ||
      this.storage.fileExists("prompts.yaml")
    );
  }
}

