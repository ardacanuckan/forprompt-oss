/**
 * Date and period utilities
 */

/**
 * Get current period string in YYYY-MM format
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get period start and end timestamps
 */
export function getPeriodBounds(period: string): { start: number; end: number } {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1).getTime();
  const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  return { start, end };
}

/**
 * Get timestamp for N days from now
 */
export function getDaysFromNow(days: number): number {
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

/**
 * Check if a timestamp is expired
 */
export function isExpired(timestamp: number): boolean {
  return timestamp < Date.now();
}

