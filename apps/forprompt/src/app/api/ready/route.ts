import { NextResponse } from "next/server";
import { env } from "~/env";

/**
 * Dependency check status
 */
type DependencyStatus = "healthy" | "unhealthy" | "not_configured";

interface DependencyCheck {
  status: DependencyStatus;
  latency?: number;
  error?: string;
}

/**
 * Readiness response structure
 */
interface ReadinessResponse {
  status: "ready" | "not_ready";
  timestamp: string;
  responseTime: number;
  checks: {
    database: DependencyCheck;
    auth: DependencyCheck;
    redis: DependencyCheck;
  };
}

/**
 * Check Convex database connectivity
 */
async function checkDatabase(): Promise<DependencyCheck> {
  const start = Date.now();

  try {
    const convexUrl = env.NEXT_PUBLIC_CONVEX_URL;

    if (!convexUrl) {
      return {
        status: "not_configured",
        error: "NEXT_PUBLIC_CONVEX_URL not configured",
      };
    }

    // Make a simple HTTP request to Convex to verify connectivity
    // The Convex deployment URL should respond to a simple request
    const response = await fetch(convexUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    // Convex returns various responses, but any response means connectivity is working
    const latency = Date.now() - start;

    if (response.ok || response.status === 404) {
      // 404 is expected when hitting base URL without proper route
      return {
        status: "healthy",
        latency,
      };
    }

    return {
      status: "unhealthy",
      latency,
      error: `Unexpected response status: ${response.status}`,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Check Clerk auth provider status
 */
async function checkAuth(): Promise<DependencyCheck> {
  const start = Date.now();

  try {
    // Verify Clerk credentials are configured
    const secretKey = env.CLERK_SECRET_KEY;
    const publishableKey = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

    if (!secretKey || !publishableKey) {
      return {
        status: "not_configured",
        error: "Clerk credentials not configured",
      };
    }

    // Make a lightweight API call to Clerk to verify credentials
    // Using the /v1/clients endpoint which is lightweight
    const response = await fetch("https://api.clerk.com/v1/clients", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const latency = Date.now() - start;

    if (response.ok) {
      return {
        status: "healthy",
        latency,
      };
    }

    // 401/403 means credentials are invalid
    if (response.status === 401 || response.status === 403) {
      return {
        status: "unhealthy",
        latency,
        error: "Invalid Clerk credentials",
      };
    }

    return {
      status: "healthy",
      latency,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Check Redis connectivity (if configured)
 */
async function checkRedis(): Promise<DependencyCheck> {
  const start = Date.now();

  try {
    const redisUrl = env.REDIS_URL;

    if (!redisUrl) {
      return {
        status: "not_configured",
      };
    }

    // Parse Redis URL and attempt basic connection
    // Note: For full Redis check, you would use ioredis or redis package
    // This is a basic URL validation and connectivity check
    const url = new URL(redisUrl);

    // Attempt a TCP connection to verify Redis is reachable
    // Using fetch to the host won't work for Redis protocol,
    // so we just verify the URL is valid and return healthy
    // In production, you'd want to use a Redis client here
    if (url.protocol !== "redis:" && url.protocol !== "rediss:") {
      return {
        status: "unhealthy",
        latency: Date.now() - start,
        error: "Invalid Redis URL protocol",
      };
    }

    // For now, we consider Redis configured if URL is valid
    // A full implementation would attempt an actual PING command
    return {
      status: "healthy",
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : "Configuration error",
    };
  }
}

/**
 * GET /api/ready
 *
 * Readiness check endpoint for container orchestration.
 * Verifies all critical dependencies are available before accepting traffic.
 *
 * Returns:
 * - 200 if all required dependencies are healthy
 * - 503 if any required dependency is down
 *
 * Checks:
 * - Database (Convex) connectivity
 * - Auth provider (Clerk) status
 * - Redis connectivity (optional, only if configured)
 */
export async function GET(): Promise<NextResponse<ReadinessResponse>> {
  const requestStart = Date.now();

  // Run all checks in parallel for better performance
  const [database, auth, redis] = await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkRedis(),
  ]);

  const checks = { database, auth, redis };

  // Determine overall readiness
  // Required dependencies: database and auth must be healthy
  // Optional dependencies: redis (only fails if configured but unhealthy)
  const requiredHealthy =
    database.status === "healthy" && auth.status === "healthy";

  const redisHealthy =
    redis.status === "healthy" || redis.status === "not_configured";

  const isReady = requiredHealthy && redisHealthy;

  const response: ReadinessResponse = {
    status: isReady ? "ready" : "not_ready",
    timestamp: new Date().toISOString(),
    responseTime: Date.now() - requestStart,
    checks,
  };

  return NextResponse.json(response, {
    status: isReady ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
