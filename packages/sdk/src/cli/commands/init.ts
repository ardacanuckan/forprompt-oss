/**
 * Init Command
 *
 * Initialize ForPrompt in the current directory
 * Usage: npx forprompt init
 */

import * as readline from "readline";

import { createApiClient } from "../utils/api";
import {
  getApiKey,
  getForpromptDir,
  loadProjectConfig,
  saveApiKeyToEnv,
  saveProjectConfig,
} from "../utils/config";

/**
 * Prompt user for input
 */
async function prompt(
  question: string,
  defaultValue?: string,
): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue
      ? `${question} (${defaultValue}): `
      : `${question}: `;

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || "");
    });
  });
}

/**
 * Init command handler
 */
export async function initCommand(options: {
  apiKey?: string;
  baseUrl?: string;
}): Promise<void> {
  console.log("\n🚀 Initializing ForPrompt...\n");

  // Check if already initialized
  const existingConfig = loadProjectConfig();
  const existingApiKey = getApiKey();

  if (existingConfig && existingApiKey) {
    const overwrite = await prompt(
      "Project already initialized. Overwrite? (y/N)",
      "N",
    );
    if (overwrite.toLowerCase() !== "y") {
      console.log("Aborted.");
      return;
    }
  }

  // Get API key
  let apiKey = options.apiKey;
  if (!apiKey) {
    apiKey = await prompt("Enter your ForPrompt API key");
  }

  if (!apiKey) {
    console.error("❌ API key is required");
    process.exit(1);
  }

  // Validate API key
  console.log("\n🔑 Validating API key...");
  const baseUrl = options.baseUrl || process.env.FORPROMPT_BASE_URL;

  if (!baseUrl) {
    console.error("❌ FORPROMPT_BASE_URL environment variable is required.");
    console.error("   Set it to your Convex deployment URL.");
    process.exit(1);
  }

  const api = createApiClient(baseUrl);

  try {
    const result = await api.validateApiKey(apiKey);

    if (!result.valid || !result.project) {
      console.error("❌ Invalid API key");
      process.exit(1);
    }

    const { project } = result;

    console.log(`\n✅ Connected to project: ${project.projectName}`);
    if (project.orgName) {
      console.log(`   Organization: ${project.orgName}`);
    }

    // Save API key to .env
    saveApiKeyToEnv(apiKey);
    console.log("\n📝 Saved API key to .env");

    // Save project config
    saveProjectConfig({
      projectId: project.projectId,
      projectName: project.projectName,
      projectSlug: project.projectSlug,
      apiKey: apiKey, // Won't be saved to file, just used for reference
      baseUrl: baseUrl,
    });
    console.log(`📁 Created ${getForpromptDir()}/.forpromptrc`);

    console.log("\n✨ ForPrompt initialized successfully!");
    console.log("\nNext steps:");
    console.log("  1. Run 'npx forprompt deploy' to sync your prompts");
    console.log("  2. Import prompts in your code:");
    console.log("     import { userContextPrompt } from './forprompt';");
    console.log("");
  } catch (error) {
    console.error(
      "❌ Failed to validate API key:",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exit(1);
  }
}
