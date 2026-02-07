/**
 * Deploy Command
 *
 * Fetch all prompts and generate local files
 * Usage: npx forprompt deploy
 */

import {
  loadProjectConfig,
  getApiKey,
  getForpromptDir,
  saveProjectConfig,
  isProjectInitialized,
} from "../utils/config";
import { createApiClient } from "../utils/api";
import { generatePromptFiles, cleanupRemovedPrompts } from "../utils/generator";

/**
 * Deploy command handler
 */
export async function deployCommand(options: {
  clean?: boolean;
  baseUrl?: string;
}): Promise<void> {
  console.log("\n📦 Deploying prompts...\n");

  // Check if project is initialized
  if (!isProjectInitialized()) {
    console.error("❌ Project not initialized. Run 'npx forprompt init' first.");
    process.exit(1);
  }

  const projectConfig = loadProjectConfig()!;
  const apiKey = getApiKey()!;
  const outputDir = getForpromptDir();

  console.log(`📂 Project: ${projectConfig.projectName}`);
  console.log(`📁 Output: ${outputDir}\n`);

  // Fetch prompts from server
  const baseUrl = options.baseUrl || projectConfig.baseUrl || process.env.FORPROMPT_BASE_URL;
  const api = createApiClient(baseUrl);

  try {
    console.log("🔄 Fetching prompts from server...");
    const deployResult = await api.deploy(apiKey);

    const { prompts, project, deployedAt } = deployResult;

    if (prompts.length === 0) {
      console.log("\n⚠️  No prompts found in project.");
      console.log("   Create prompts in the ForPrompt dashboard first.");
      return;
    }

    console.log(`   Found ${prompts.length} prompt(s)\n`);

    // Clean up removed prompts if requested
    if (options.clean) {
      console.log("🧹 Cleaning up removed prompts...");
      const removed = cleanupRemovedPrompts(prompts, outputDir);
      if (removed.length > 0) {
        console.log(`   Removed: ${removed.join(", ")}`);
      }
    }

    // Generate prompt files
    console.log("📝 Generating prompt files...");
    const { created, updated } = generatePromptFiles(prompts, outputDir);

    // Update project config with deploy timestamp
    saveProjectConfig({
      ...projectConfig,
      apiKey,
      lastDeployedAt: deployedAt,
    });

    // Summary
    console.log("\n✨ Deploy complete!\n");
    console.log("Summary:");
    console.log(`  • ${prompts.length} prompt(s) synced`);
    if (created > 0) console.log(`  • ${created} new prompt(s) created`);
    if (updated > 0) console.log(`  • ${updated} prompt(s) updated`);

    // List prompts
    console.log("\nPrompts:");
    for (const prompt of prompts) {
      const version = prompt.activeVersion?.versionNumber || "no active version";
      console.log(`  • ${prompt.key} (v${version})`);
    }

    console.log("\nUsage:");
    console.log('  import { getPrompt } from "./forprompt";');
    console.log('  const prompt = getPrompt("userContextPrompt");');
    console.log("\n  // Or import directly:");
    console.log('  import { userContextPrompt } from "./forprompt";');
    console.log("");
  } catch (error) {
    console.error(
      "❌ Deploy failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}
