/**
 * File system storage for Node.js environments
 *
 * SECURITY: Implements path traversal protection to prevent
 * unauthorized file access outside the output directory.
 */

import * as fs from "fs";
import * as path from "path";
import type { Prompt } from "../types";

/**
 * Error thrown when a path traversal attack is detected
 */
export class PathTraversalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

export class FileStorage {
  /** Absolute path to the output directory */
  private readonly absoluteOutputDir: string;

  constructor(outputDir: string) {
    // Resolve to absolute path to prevent relative path manipulation
    this.absoluteOutputDir = path.resolve(outputDir);
  }

  /**
   * Sanitize and validate a filename to prevent path traversal
   *
   * SECURITY: This method:
   * 1. Removes path separators (/ and \)
   * 2. Removes parent directory references (..)
   * 3. Removes null bytes and control characters
   * 4. Validates the resulting path stays within outputDir
   *
   * @param filename - The filename to sanitize
   * @returns Sanitized filename
   * @throws PathTraversalError if path traversal is detected
   */
  private sanitizeFilename(filename: string): string {
    // Check for null bytes (common attack vector)
    if (filename.includes("\0")) {
      throw new PathTraversalError(
        "Invalid filename: contains null bytes"
      );
    }

    // Remove control characters
    const withoutControl = filename.replace(/[\x00-\x1f\x7f]/g, "");

    // Remove parent directory references
    const withoutParentRef = withoutControl.replace(/\.\./g, "");

    // Remove path separators (both Unix and Windows)
    const sanitized = withoutParentRef.replace(/[\/\\]/g, "");

    // Check if filename is empty after sanitization
    if (!sanitized || sanitized.length === 0) {
      throw new PathTraversalError(
        "Invalid filename: empty after sanitization"
      );
    }

    // Check filename length (prevent excessively long names)
    if (sanitized.length > 255) {
      throw new PathTraversalError(
        "Invalid filename: exceeds maximum length (255 characters)"
      );
    }

    // Final validation: ensure resolved path is within output directory
    const fullPath = path.join(this.absoluteOutputDir, sanitized);
    const resolvedPath = path.resolve(fullPath);

    // Check that resolved path starts with the output directory
    // Use path.sep to ensure we're checking a complete directory path
    if (!resolvedPath.startsWith(this.absoluteOutputDir + path.sep) &&
        resolvedPath !== this.absoluteOutputDir) {
      throw new PathTraversalError(
        "Path traversal attempt detected: path escapes output directory"
      );
    }

    return sanitized;
  }

  /**
   * Get the safe full path for a filename
   */
  private getSafePath(filename: string): string {
    const sanitizedFilename = this.sanitizeFilename(filename);
    return path.join(this.absoluteOutputDir, sanitizedFilename);
  }

  /**
   * Ensure output directory exists with proper permissions
   */
  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      // Create with restricted permissions (owner only)
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Write content to file
   *
   * @param filename - The filename (will be sanitized)
   * @param content - Content to write
   * @throws PathTraversalError if filename contains path traversal
   */
  async writeFile(filename: string, content: string): Promise<void> {
    this.ensureDir(this.absoluteOutputDir);
    const filePath = this.getSafePath(filename);

    // Write with restricted permissions (owner read/write only)
    await fs.promises.writeFile(filePath, content, {
      encoding: "utf-8",
      mode: 0o600,
    });
  }

  /**
   * Read file content
   *
   * @param filename - The filename (will be sanitized)
   * @returns File content or null if not found
   * @throws PathTraversalError if filename contains path traversal
   */
  async readFile(filename: string): Promise<string | null> {
    const filePath = this.getSafePath(filename);
    try {
      return await fs.promises.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
  }

  /**
   * Check if file exists
   *
   * @param filename - The filename (will be sanitized)
   * @throws PathTraversalError if filename contains path traversal
   */
  fileExists(filename: string): boolean {
    const filePath = this.getSafePath(filename);
    return fs.existsSync(filePath);
  }

  /**
   * Delete file
   *
   * @param filename - The filename (will be sanitized)
   * @throws PathTraversalError if filename contains path traversal
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = this.getSafePath(filename);
    try {
      await fs.promises.unlink(filePath);
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * List all files in output directory
   *
   * Only returns files directly in the output directory, not subdirectories.
   */
  async listFiles(): Promise<string[]> {
    this.ensureDir(this.absoluteOutputDir);
    const entries = await fs.promises.readdir(this.absoluteOutputDir, {
      withFileTypes: true,
    });

    // Only return files, not directories
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  }

  /**
   * Get the absolute output directory path
   */
  getOutputDir(): string {
    return this.absoluteOutputDir;
  }
}

