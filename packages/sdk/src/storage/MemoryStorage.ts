/**
 * In-memory storage for testing and browser environments
 */

import type { Prompt } from "../types";

export class MemoryStorage {
  private files: Map<string, string> = new Map();

  /**
   * Write content to memory
   */
  async writeFile(filename: string, content: string): Promise<void> {
    this.files.set(filename, content);
  }

  /**
   * Read file content from memory
   */
  async readFile(filename: string): Promise<string | null> {
    return this.files.get(filename) ?? null;
  }

  /**
   * Check if file exists in memory
   */
  fileExists(filename: string): boolean {
    return this.files.has(filename);
  }

  /**
   * Delete file from memory
   */
  async deleteFile(filename: string): Promise<void> {
    this.files.delete(filename);
  }

  /**
   * List all files in memory
   */
  async listFiles(): Promise<string[]> {
    return Array.from(this.files.keys());
  }

  /**
   * Clear all files
   */
  clear(): void {
    this.files.clear();
  }
}

