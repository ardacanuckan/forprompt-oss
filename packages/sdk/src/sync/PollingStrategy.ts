/**
 * Polling fallback strategy for prompt synchronization
 */

export class PollingStrategy {
  private intervalId: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;

  constructor(
    private interval: number,
    private onPoll: () => void | Promise<void>
  ) {}

  /**
   * Start polling
   */
  start(): void {
    if (this.isPolling) {
      console.warn("Polling is already active");
      return;
    }

    this.isPolling = true;
    console.log(`Starting polling with interval: ${this.interval}ms`);

    // Poll immediately
    this.poll();

    // Then poll at intervals
    this.intervalId = setInterval(() => {
      this.poll();
    }, this.interval);
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (!this.isPolling) {
      return;
    }

    this.isPolling = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log("Polling stopped");
  }

  /**
   * Execute a poll
   */
  private async poll(): Promise<void> {
    try {
      await this.onPoll();
    } catch (error) {
      console.error("Error during polling:", error);
    }
  }

  /**
   * Check if polling is active
   */
  isActive(): boolean {
    return this.isPolling;
  }

  /**
   * Update polling interval
   */
  setInterval(newInterval: number): void {
    this.interval = newInterval;

    // Restart polling if active
    if (this.isPolling) {
      this.stop();
      this.start();
    }
  }
}

