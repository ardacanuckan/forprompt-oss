/**
 * ForPrompt Logger
 * 
 * Implements trace/span model for logging AI conversations
 * 
 * @example Basic usage
 * ```typescript
 * import { logger } from "@forprompt/sdk";
 * 
 * // Start a trace
 * logger.startTrace("onboardingprompt");
 * 
 * // Log user message
 * await logger.log({ role: "user", content: "Hello" });
 * 
 * // Log AI response
 * await logger.log({
 *   role: "assistant",
 *   content: "Hi! How can I help?",
 *   model: "gpt-4o",
 *   tokens: { output: 120 }
 * });
 * 
 * // End trace (optional)
 * logger.endTrace();
 * ```
 */

import { ForPromptError } from "./types";

const DEFAULT_BASE_URL = "https://wooden-fox-811.convex.site";

/**
 * Generate a simple unique ID (UUID v4-like)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface LogOptions {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokens?: {
    input?: number;
    output?: number;
  };
  durationMs?: number;
  metadata?: Record<string, any>;
}

/**
 * Options for logging a single AI request/response
 * Use this for one-shot interactions without conversation tracking
 */
export interface SingleRequestOptions {
  /** The prompt identifier */
  promptKey: string;
  /** Prompt version number for analytics tracking */
  versionNumber?: number;
  /** Optional custom trace ID (auto-generated if not provided) */
  traceId?: string;
  /** The user's input/prompt */
  input: string;
  /** The AI's output/response */
  output: string;
  /** The model used (e.g., "gpt-4o", "claude-sonnet-4") */
  model?: string;
  /** Token counts */
  tokens?: {
    input?: number;
    output?: number;
  };
  /** Total duration in milliseconds */
  durationMs?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

export class ForPromptLogger {
  private baseUrl: string;
  private apiKey: string;
  private traceId: string | null = null;
  private promptKey: string | null = null;
  private versionNumber: number | null = null;
  private source: string = "sdk";

  constructor(config?: { apiKey?: string; baseUrl?: string; source?: string }) {
    this.apiKey = config?.apiKey || process.env.FORPROMPT_API_KEY || "";
    this.baseUrl = (config?.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
    this.source = config?.source || "sdk";
  }

  /**
   * Start a new trace (conversation)
   * Returns the generated traceId
   *
   * @param promptKey - The prompt identifier
   * @param options.traceId - Optional custom trace ID (auto-generated if not provided)
   * @param options.versionNumber - Prompt version number for analytics tracking
   */
  startTrace(promptKey: string, options?: { traceId?: string; versionNumber?: number }): string {
    this.traceId = options?.traceId || generateId();
    this.promptKey = promptKey;
    this.versionNumber = options?.versionNumber ?? null;
    return this.traceId;
  }

  /**
   * Log a span (message, LLM call, etc.)
   * Automatically creates a trace if none exists
   */
  async log(options: LogOptions): Promise<void> {
    if (!this.apiKey) {
      throw new ForPromptError(
        "API key is required. Set FORPROMPT_API_KEY environment variable or pass apiKey in config.",
        401,
        "MISSING_API_KEY"
      );
    }

    // Auto-generate traceId if not started
    if (!this.traceId) {
      this.traceId = generateId();
    }

    const payload = {
      traceId: this.traceId,
      promptKey: this.promptKey || "unknown",
      versionNumber: this.versionNumber ?? undefined,
      type: "message",
      role: options.role,
      content: options.content,
      model: options.model,
      inputTokens: options.tokens?.input,
      outputTokens: options.tokens?.output,
      durationMs: options.durationMs,
      source: this.source,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    };

    const response = await fetch(`${this.baseUrl}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new ForPromptError(
        errorData.error || "Failed to log span",
        response.status,
        "LOG_ERROR"
      );
    }
  }

  /**
   * End the current trace
   * This is optional - traces can be left open
   */
  async endTrace(): Promise<void> {
    if (!this.traceId) {
      return;
    }

    // Optionally update trace status to "completed"
    // For now, we just clear the local state
    this.traceId = null;
    this.promptKey = null;
    this.versionNumber = null;
  }

  /**
   * Get the current version number
   */
  getVersionNumber(): number | null {
    return this.versionNumber;
  }

  /**
   * Get the current trace ID
   */
  getTraceId(): string | null {
    return this.traceId;
  }

  /**
   * Check if a trace is active
   */
  isTracing(): boolean {
    return this.traceId !== null;
  }

  /**
   * Log a single AI request/response without conversation tracking
   * Creates a new trace with input and output spans automatically
   *
   * @example
   * ```typescript
   * const { traceId } = await logger.logRequest({
   *   promptKey: "aicoaching",
   *   versionNumber: 2,
   *   input: "How do I learn Python?",
   *   output: "Here are 5 steps...",
   *   model: "gpt-4o",
   *   tokens: { input: 10, output: 150 },
   *   durationMs: 1200,
   * });
   * ```
   */
  async logRequest(options: SingleRequestOptions): Promise<{ traceId: string }> {
    if (!this.apiKey) {
      throw new ForPromptError(
        "API key is required. Set FORPROMPT_API_KEY environment variable or pass apiKey in config.",
        401,
        "MISSING_API_KEY"
      );
    }

    const traceId = options.traceId || generateId();

    // Log input (user message)
    const inputPayload = {
      traceId,
      promptKey: options.promptKey,
      versionNumber: options.versionNumber,
      type: "message",
      role: "user",
      content: options.input,
      source: this.source,
    };

    const inputResponse = await fetch(`${this.baseUrl}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(inputPayload),
    });

    if (!inputResponse.ok) {
      const errorData = (await inputResponse.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new ForPromptError(
        errorData.error || "Failed to log input span",
        inputResponse.status,
        "LOG_ERROR"
      );
    }

    // Log output (assistant response)
    const outputPayload = {
      traceId,
      promptKey: options.promptKey,
      versionNumber: options.versionNumber,
      type: "message",
      role: "assistant",
      content: options.output,
      model: options.model,
      inputTokens: options.tokens?.input,
      outputTokens: options.tokens?.output,
      durationMs: options.durationMs,
      source: this.source,
      metadata: options.metadata ? JSON.stringify(options.metadata) : undefined,
    };

    const outputResponse = await fetch(`${this.baseUrl}/api/log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(outputPayload),
    });

    if (!outputResponse.ok) {
      const errorData = (await outputResponse.json().catch(() => ({ error: "Unknown error" }))) as { error?: string };
      throw new ForPromptError(
        errorData.error || "Failed to log output span",
        outputResponse.status,
        "LOG_ERROR"
      );
    }

    return { traceId };
  }
}

/**
 * Create a ForPrompt logger instance
 */
export function createLogger(config?: { apiKey?: string; baseUrl?: string; source?: string }): ForPromptLogger {
  return new ForPromptLogger(config);
}

/**
 * Default logger instance
 * Auto-configured from environment variables
 */
export const logger = createLogger();




