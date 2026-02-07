/**
 * CLI API Client
 *
 * Makes requests to ForPrompt backend
 */

// Default production URL - will be configurable
const DEFAULT_BASE_URL = "https://wooden-fox-811.convex.site";

export interface DeployResponse {
  project: {
    id: string;
    name: string;
    slug: string;
  };
  prompts: PromptData[];
  deployedAt: number;
}

export interface PromptData {
  key: string;
  name: string;
  description?: string;
  activeVersion: {
    versionNumber: number;
    systemPrompt: string;
    description?: string;
    updatedAt: number;
  } | null;
  versions: {
    versionNumber: number;
    systemPrompt: string;
    description?: string;
    createdAt: number;
  }[];
  purpose?: string;
  expectedBehavior?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  useCases?: string;
  additionalNotes?: string;
  toolsNotes?: string;
  tools: {
    name: string;
    description: string;
    parameters: string;
    isRequired: boolean;
    usageNotes?: string;
  }[];
  createdAt: number;
  updatedAt: number;
}

export interface ValidateResponse {
  valid: boolean;
  project?: {
    projectId: string;
    projectName: string;
    projectSlug: string;
    orgId: string;
    orgName?: string;
  };
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || DEFAULT_BASE_URL).replace(/\/$/, "");
  }

  /**
   * Validate API key and get project info
   */
  async validateApiKey(apiKey: string): Promise<ValidateResponse> {
    const response = await fetch(`${this.baseUrl}/api/cli/validate`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<ValidateResponse>;
  }

  /**
   * Deploy - fetch all prompts for a project
   */
  async deploy(apiKey: string): Promise<DeployResponse> {
    const response = await fetch(`${this.baseUrl}/api/cli/deploy`, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json() as Promise<DeployResponse>;
  }
}

/**
 * Create API client with default or custom base URL
 */
export function createApiClient(baseUrl?: string): ApiClient {
  return new ApiClient(baseUrl);
}
