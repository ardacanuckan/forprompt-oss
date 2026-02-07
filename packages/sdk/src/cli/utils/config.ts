/**
 * CLI Configuration Management
 *
 * Manages two types of config:
 * 1. Global auth config (~/.forprompt/config.json) - stores auth token
 * 2. Project config (.env + forprompt/.forpromptrc) - stores API key and project info
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Global config directory
const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".forprompt");
const GLOBAL_CONFIG_FILE = path.join(GLOBAL_CONFIG_DIR, "config.json");

// Project config files
const PROJECT_CONFIG_DIR = "forprompt";
const PROJECT_CONFIG_FILE = ".forpromptrc";
const ENV_FILE = ".env";

export interface GlobalConfig {
  authToken?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface ProjectConfig {
  projectId: string;
  projectName: string;
  projectSlug: string;
  apiKey: string;
  baseUrl: string;
  lastDeployedAt?: number;
}

/**
 * Ensure global config directory exists
 */
function ensureGlobalConfigDir(): void {
  if (!fs.existsSync(GLOBAL_CONFIG_DIR)) {
    fs.mkdirSync(GLOBAL_CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Load global config
 */
export function loadGlobalConfig(): GlobalConfig | null {
  try {
    if (!fs.existsSync(GLOBAL_CONFIG_FILE)) {
      return null;
    }
    const content = fs.readFileSync(GLOBAL_CONFIG_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save global config
 */
export function saveGlobalConfig(config: GlobalConfig): void {
  ensureGlobalConfigDir();
  fs.writeFileSync(GLOBAL_CONFIG_FILE, JSON.stringify(config, null, 2), {
    mode: 0o600, // Only owner can read/write
  });
}

/**
 * Clear global config (logout)
 */
export function clearGlobalConfig(): void {
  if (fs.existsSync(GLOBAL_CONFIG_FILE)) {
    fs.unlinkSync(GLOBAL_CONFIG_FILE);
  }
}

/**
 * Ensure project config directory exists
 */
function ensureProjectConfigDir(cwd: string = process.cwd()): string {
  const configDir = path.join(cwd, PROJECT_CONFIG_DIR);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  return configDir;
}

/**
 * Load project config from forprompt/.forpromptrc
 */
export function loadProjectConfig(cwd: string = process.cwd()): ProjectConfig | null {
  try {
    const configPath = path.join(cwd, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);
    if (!fs.existsSync(configPath)) {
      return null;
    }
    const content = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Save project config to forprompt/.forpromptrc
 */
export function saveProjectConfig(config: ProjectConfig, cwd: string = process.cwd()): void {
  ensureProjectConfigDir(cwd);
  const configPath = path.join(cwd, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);

  // Don't save the API key in the config file, it goes to .env
  const { apiKey: _, ...configWithoutKey } = config;
  fs.writeFileSync(configPath, JSON.stringify(configWithoutKey, null, 2));
}

/**
 * Get API key from environment or .env file
 */
export function getApiKey(cwd: string = process.cwd()): string | null {
  // First check environment variable
  if (process.env.FORPROMPT_API_KEY) {
    return process.env.FORPROMPT_API_KEY;
  }

  // Then check .env file
  try {
    const envPath = path.join(cwd, ENV_FILE);
    if (!fs.existsSync(envPath)) {
      return null;
    }
    const content = fs.readFileSync(envPath, "utf-8");
    const match = content.match(/^FORPROMPT_API_KEY=(.+)$/m);
    return match ? match[1]!.trim().replace(/^["']|["']$/g, "") : null;
  } catch {
    return null;
  }
}

/**
 * Save API key to .env file
 */
export function saveApiKeyToEnv(apiKey: string, cwd: string = process.cwd()): void {
  const envPath = path.join(cwd, ENV_FILE);
  let content = "";

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
    // Replace existing key or append
    if (content.match(/^FORPROMPT_API_KEY=/m)) {
      content = content.replace(/^FORPROMPT_API_KEY=.+$/m, `FORPROMPT_API_KEY=${apiKey}`);
    } else {
      content = content.trim() + `\nFORPROMPT_API_KEY=${apiKey}\n`;
    }
  } else {
    content = `FORPROMPT_API_KEY=${apiKey}\n`;
  }

  fs.writeFileSync(envPath, content);
}

/**
 * Check if user is logged in
 */
export function isLoggedIn(): boolean {
  const config = loadGlobalConfig();
  return !!(config?.authToken);
}

/**
 * Check if project is initialized
 */
export function isProjectInitialized(cwd: string = process.cwd()): boolean {
  const projectConfig = loadProjectConfig(cwd);
  const apiKey = getApiKey(cwd);
  return !!(projectConfig && apiKey);
}

/**
 * Get forprompt directory path
 */
export function getForpromptDir(cwd: string = process.cwd()): string {
  return path.join(cwd, PROJECT_CONFIG_DIR);
}
