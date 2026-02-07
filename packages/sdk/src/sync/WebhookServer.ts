/**
 * Local webhook receiver server for Node.js environments
 *
 * SECURITY: This server requires a webhook secret for signature verification.
 * All unsigned webhooks are rejected (fail-closed security model).
 */

import * as http from "http";
import * as crypto from "crypto";
import type { WebhookEvent } from "../types";

/** Minimum required length for webhook secret */
const MIN_SECRET_LENGTH = 32;

/** Maximum allowed payload size (1MB) */
const MAX_PAYLOAD_SIZE = 1024 * 1024;

export class WebhookServer {
  private server: http.Server | null = null;
  private webhookSecret: string;

  /**
   * Create a new webhook server
   *
   * @param port - Port to listen on
   * @param path - URL path for webhook endpoint
   * @param webhookSecret - Secret for HMAC signature verification (required, min 32 chars)
   * @param onEvent - Callback for received events
   * @throws Error if webhook secret is missing or too short
   */
  constructor(
    private port: number,
    private path: string,
    webhookSecret: string,
    private onEvent: (event: WebhookEvent) => void | Promise<void>
  ) {
    // SECURITY: Require webhook secret - fail-closed
    if (!webhookSecret) {
      throw new Error(
        "SECURITY: Webhook secret is required. " +
        "Provide a secret of at least 32 characters to verify webhook signatures."
      );
    }

    if (webhookSecret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `SECURITY: Webhook secret must be at least ${MIN_SECRET_LENGTH} characters. ` +
        `Provided secret is ${webhookSecret.length} characters.`
      );
    }

    this.webhookSecret = webhookSecret;
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * Uses constant-time comparison to prevent timing attacks
   *
   * @returns true if signature is valid, false otherwise
   */
  private verifySignature(payload: string, signature: string | undefined): boolean {
    // SECURITY: Reject if no signature provided
    if (!signature) {
      console.error("SECURITY: Missing webhook signature header. Rejecting request.");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(payload)
      .digest("hex");

    // Use constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      // Different lengths - not equal
      return false;
    }
  }

  /**
   * Update the webhook secret
   * @deprecated Set secret in constructor instead for security
   */
  setSecret(secret: string): void {
    if (!secret || secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `SECURITY: Webhook secret must be at least ${MIN_SECRET_LENGTH} characters.`
      );
    }
    this.webhookSecret = secret;
  }

  /**
   * Start the webhook server
   */
  async start(): Promise<void> {
    if (this.server) {
      throw new Error("Webhook server is already running");
    }

    return new Promise((resolve, reject) => {
      this.server = http.createServer(async (req, res) => {
        // Only handle POST requests to the webhook path
        if (req.method !== "POST" || req.url !== this.path) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
          return;
        }

        // SECURITY: Enforce payload size limit
        const contentLength = parseInt(req.headers["content-length"] || "0", 10);
        if (contentLength > MAX_PAYLOAD_SIZE) {
          res.writeHead(413, { "Content-Type": "text/plain" });
          res.end("Payload too large");
          return;
        }

        // Read request body with size tracking
        let body = "";
        let receivedBytes = 0;

        req.on("data", (chunk) => {
          receivedBytes += chunk.length;
          // Double-check size during streaming
          if (receivedBytes > MAX_PAYLOAD_SIZE) {
            req.destroy();
            res.writeHead(413, { "Content-Type": "text/plain" });
            res.end("Payload too large");
            return;
          }
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            // SECURITY: Always verify signature (fail-closed)
            const signature = req.headers["x-forprompt-signature"] as string | undefined;
            if (!this.verifySignature(body, signature)) {
              res.writeHead(401, { "Content-Type": "text/plain" });
              res.end("Invalid or missing signature");
              return;
            }

            // Parse webhook event
            const event: WebhookEvent = JSON.parse(body);

            // Handle event
            await this.onEvent(event);

            // Send success response
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ received: true }));
          } catch (error) {
            // SECURITY: Don't expose internal error details
            console.error("Error processing webhook:", error instanceof Error ? error.message : "Unknown error");
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
          }
        });
      });

      this.server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
          reject(
            new Error(
              `Port ${this.port} is already in use. Please choose a different port.`
            )
          );
        } else {
          reject(error);
        }
      });

      this.server.listen(this.port, () => {
        console.log(`Webhook server listening on http://localhost:${this.port}${this.path}`);
        resolve();
      });
    });
  }

  /**
   * Stop the webhook server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.server!.close((error) => {
        if (error) {
          reject(error);
        } else {
          this.server = null;
          console.log("Webhook server stopped");
          resolve();
        }
      });
    });
  }

  /**
   * Get the webhook URL
   */
  getWebhookUrl(): string {
    return `http://localhost:${this.port}${this.path}`;
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }
}

