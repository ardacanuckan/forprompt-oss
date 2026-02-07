/**
 * Sync Manager - Orchestrates prompt synchronization
 */

import type { SyncConfig, Prompt, WebhookEvent, SyncResponse } from "../types";
import { ForPromptError } from "../types";
import { WebhookServer } from "./WebhookServer";
import { PollingStrategy } from "./PollingStrategy";
import { FileWriter } from "./FileWriter";

export class SyncManager {
  private webhookServer: WebhookServer | null = null;
  private pollingStrategy: PollingStrategy | null = null;
  private fileWriter: FileWriter;
  private isStarted: boolean = false;
  private webhookSubscriptionId: string | null = null;

  constructor(private config: SyncConfig) {
    this.fileWriter = new FileWriter(config);
  }

  /**
   * Sync prompts from the API
   */
  private async syncFromAPI(): Promise<Prompt[]> {
    const url = new URL(`${this.config.baseUrl}/api/sync`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new ForPromptError(
        error.error || "Failed to sync prompts",
        response.status,
        "SYNC_ERROR"
      );
    }

    const data: SyncResponse = await response.json();
    return data.prompts;
  }

  /**
   * Register webhook with the backend
   */
  private async registerWebhook(endpointUrl: string): Promise<{ subscriptionId: string; secret: string }> {
    const url = new URL(`${this.config.baseUrl}/api/webhooks`);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.config.apiKey,
      },
      body: JSON.stringify({
        endpointUrl,
        events: [
          "prompt.created",
          "prompt.updated",
          "prompt.deleted",
          "prompt.version.activated",
        ],
        metadata: {
          format: this.config.format,
          outputDir: this.config.outputDir,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new ForPromptError(
        error.error || "Failed to register webhook",
        response.status,
        "WEBHOOK_REGISTRATION_ERROR"
      );
    }

    return await response.json();
  }

  /**
   * Unregister webhook from the backend
   */
  private async unregisterWebhook(): Promise<void> {
    if (!this.webhookSubscriptionId) {
      return;
    }

    const url = new URL(
      `${this.config.baseUrl}/api/webhooks/${this.webhookSubscriptionId}`
    );

    await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "X-API-Key": this.config.apiKey,
      },
    });
  }

  /**
   * Handle webhook event
   */
  private async handleWebhookEvent(event: WebhookEvent): Promise<void> {
    console.log(`Received webhook event: ${event.event}`);

    try {
      // For any prompt change, re-sync all prompts
      const prompts = await this.syncFromAPI();
      await this.fileWriter.writePrompts(prompts, Date.now());

      // Call user callback
      if (this.config.onSync) {
        this.config.onSync(prompts);
      }

      console.log(`Synced ${prompts.length} prompts after webhook event`);
    } catch (error) {
      console.error("Error handling webhook event:", error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
    }
  }

  /**
   * Perform a sync operation
   */
  async sync(): Promise<Prompt[]> {
    try {
      console.log("Syncing prompts...");
      const prompts = await this.syncFromAPI();
      await this.fileWriter.writePrompts(prompts, Date.now());

      if (this.config.onSync) {
        this.config.onSync(prompts);
      }

      console.log(`Successfully synced ${prompts.length} prompts`);
      return prompts;
    } catch (error) {
      console.error("Error syncing prompts:", error);
      if (this.config.onError) {
        this.config.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * Start the sync manager (webhook + polling)
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.warn("SyncManager is already started");
      return;
    }

    console.log("Starting ForPrompt SyncManager...");

    // Initial sync
    await this.sync();

    // Start webhook server (Node.js only)
    if (typeof window === "undefined") {
      try {
        const port = this.config.webhookPort ?? 3847;
        const path = this.config.webhookPath ?? "/forprompt-webhook";

        this.webhookServer = new WebhookServer(port, path, (event) =>
          this.handleWebhookEvent(event)
        );

        await this.webhookServer.start();

        // Register webhook with backend
        const webhookUrl = this.webhookServer.getWebhookUrl();
        const { subscriptionId, secret } = await this.registerWebhook(webhookUrl);

        this.webhookSubscriptionId = subscriptionId;
        this.webhookServer.setSecret(secret);

        console.log(`Webhook registered: ${webhookUrl}`);
      } catch (error) {
        console.warn("Failed to start webhook server:", error);
        console.log("Falling back to polling only");
      }
    }

    // Start polling (as fallback or primary method)
    if (this.config.enablePolling !== false) {
      const interval = this.config.pollingInterval ?? 60000;
      this.pollingStrategy = new PollingStrategy(interval, () => this.sync());
      this.pollingStrategy.start();
    }

    this.isStarted = true;
    console.log("SyncManager started successfully");
  }

  /**
   * Stop the sync manager
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log("Stopping SyncManager...");

    // Stop polling
    if (this.pollingStrategy) {
      this.pollingStrategy.stop();
      this.pollingStrategy = null;
    }

    // Stop webhook server
    if (this.webhookServer) {
      await this.unregisterWebhook();
      await this.webhookServer.stop();
      this.webhookServer = null;
    }

    this.isStarted = false;
    console.log("SyncManager stopped");
  }

  /**
   * Check if sync manager is running
   */
  isRunning(): boolean {
    return this.isStarted;
  }
}

