/**
 * ForPrompt SDK Types
 */

export interface ForPromptConfig {
  /** API key from ForPrompt dashboard (required) */
  apiKey: string;
  /** Base URL for API (required - set FORPROMPT_BASE_URL env var) */
  baseUrl: string;
}

export interface Prompt {
  /** Unique key identifier for the prompt */
  key: string;
  /** Display name of the prompt */
  name: string;
  /** Optional description */
  description?: string;
  /** Version number */
  versionNumber: number;
  /** The system prompt content */
  systemPrompt: string;
  /** Last update timestamp */
  updatedAt: number;
  /** Prompt information fields */
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
  additionalNotes?: string;
  toolsNotes?: string;
}

export interface Tool {
  /** Tool ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON schema of parameters */
  parameters: string;
  /** Tool category */
  category?: string;
  /** Example usage */
  exampleUsage?: string;
}

export interface PromptTool {
  /** Tool reference */
  tool: Tool;
  /** Whether the tool is required */
  isRequired: boolean;
  /** Usage notes for this prompt */
  usageNotes?: string;
}

export interface GetPromptOptions {
  /** Specific version number to fetch (optional, defaults to active version) */
  version?: number;
}

export class ForPromptError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
  ) {
    super(message);
    this.name = "ForPromptError";
  }
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  // Connection
  baseUrl: string;
  projectId: string;
  apiKey: string;

  // Webhook settings
  webhookPort?: number; // Default: 3847
  webhookPath?: string; // Default: "/forprompt-webhook"

  // Polling fallback
  pollingInterval?: number; // Default: 60000 (1 minute)
  enablePolling?: boolean; // Default: true

  // Output settings
  outputDir: string; // e.g., "./prompts"
  format: "typescript" | "json" | "yaml" | "all";

  // Callbacks
  onSync?: (prompts: Prompt[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  event: string;
  timestamp: number;
  projectId: string;
  data: {
    promptId?: string;
    promptKey?: string;
    versionNumber?: number;
    systemPrompt?: string;
    [key: string]: any;
  };
}

/**
 * Sync response from API
 */
export interface SyncResponse {
  projectId: string;
  syncedAt: number;
  prompts: Prompt[];
}
