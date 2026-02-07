import { NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Server startup time - tracked at module load for uptime calculation.
 * In containerized environments, this represents when the container started.
 */
const serverStartTime = Date.now();

/**
 * Health response structure
 */
interface HealthResponse {
  status: "healthy" | "unhealthy";
  version: string;
  uptime: {
    seconds: number;
    formatted: string;
  };
  timestamp: string;
  environment: string;
  responseTime: number;
}

/**
 * Format uptime into human-readable string
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(" ");
}

/**
 * GET /api/health
 *
 * Basic health check endpoint for container orchestration and load balancers.
 * Returns 200 if the application is running.
 *
 * Response:
 * - status: "healthy" or "unhealthy"
 * - version: Application version from APP_VERSION env var
 * - uptime: Server uptime in seconds and human-readable format
 * - timestamp: Current ISO timestamp
 * - environment: Current NODE_ENV
 * - responseTime: Time taken to process this request in ms
 */
export async function GET(): Promise<NextResponse<HealthResponse>> {
  const requestStart = Date.now();

  const uptimeSeconds = (Date.now() - serverStartTime) / 1000;

  const response: HealthResponse = {
    status: "healthy",
    version: env.APP_VERSION,
    uptime: {
      seconds: Math.floor(uptimeSeconds),
      formatted: formatUptime(uptimeSeconds),
    },
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    responseTime: Date.now() - requestStart,
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
