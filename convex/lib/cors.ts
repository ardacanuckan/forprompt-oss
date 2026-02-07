/**
 * CORS (Cross-Origin Resource Sharing) utilities
 *
 * SECURITY: Implements origin whitelist to prevent unauthorized
 * cross-origin requests.
 */

/**
 * Allowed origins for CORS requests
 *
 * IMPORTANT: Only add trusted domains to this list.
 * All origins should use HTTPS in production.
 */
const PRODUCTION_ORIGINS = [
  "https://forprompt.dev",
  "https://www.forprompt.dev",
  "https://app.forprompt.dev",
];

/**
 * Development origins (only used when CONVEX_ENV !== "production")
 */
const DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173", // Vite
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

/**
 * Check if running in production environment
 */
function isProduction(): boolean {
  // Convex environment variable
  return process.env.CONVEX_ENV === "production";
}

/**
 * Get all allowed origins based on environment
 */
export function getAllowedOrigins(): string[] {
  if (isProduction()) {
    return PRODUCTION_ORIGINS;
  }
  return [...PRODUCTION_ORIGINS, ...DEVELOPMENT_ORIGINS];
}

/**
 * Check if an origin is allowed
 *
 * @param origin - The origin to check (from request header)
 * @returns true if origin is in whitelist
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) {
    return false;
  }

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * Get the appropriate CORS origin header value
 *
 * Returns the request origin if allowed, otherwise returns the primary domain.
 * This prevents open CORS while still allowing valid requests.
 *
 * @param request - The incoming request
 * @returns The origin to use in Access-Control-Allow-Origin header
 */
export function getCorsOrigin(request: Request): string {
  const origin = request.headers.get("Origin");

  if (origin && isOriginAllowed(origin)) {
    return origin;
  }

  // Return primary domain for non-whitelisted origins
  // This effectively blocks the request while returning valid headers
  return PRODUCTION_ORIGINS[0]; // https://forprompt.dev
}

/**
 * CORS configuration options
 */
interface CorsOptions {
  /** Additional allowed methods (default: GET, POST, OPTIONS) */
  methods?: string[];
  /** Additional allowed headers (default: Content-Type, X-API-Key) */
  headers?: string[];
  /** Max age for preflight cache in seconds (default: 86400) */
  maxAge?: number;
  /** Allow credentials (default: false) */
  credentials?: boolean;
}

/**
 * Get complete CORS headers for a request
 *
 * @param request - The incoming request
 * @param options - Optional CORS configuration
 * @returns Headers object with all CORS headers
 */
export function getCorsHeaders(
  request: Request,
  options: CorsOptions = {}
): Record<string, string> {
  const {
    methods = ["GET", "POST", "OPTIONS"],
    headers = ["Content-Type", "X-API-Key", "Authorization"],
    maxAge = 86400,
    credentials = false,
  } = options;

  const origin = getCorsOrigin(request);

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": methods.join(", "),
    "Access-Control-Allow-Headers": headers.join(", "),
    "Access-Control-Max-Age": String(maxAge),
    // Important: Vary by Origin for proper caching
    "Vary": "Origin",
  };

  if (credentials) {
    corsHeaders["Access-Control-Allow-Credentials"] = "true";
  }

  return corsHeaders;
}

/**
 * Create a preflight (OPTIONS) response with CORS headers
 *
 * @param request - The incoming request
 * @param options - Optional CORS configuration
 * @returns Response object for OPTIONS request
 */
export function createPreflightResponse(
  request: Request,
  options: CorsOptions = {}
): Response {
  const headers = getCorsHeaders(request, options);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Add CORS headers to an existing response
 *
 * @param response - The response to add headers to
 * @param request - The original request (for origin)
 * @param options - Optional CORS configuration
 * @returns New response with CORS headers
 */
export function addCorsHeaders(
  response: Response,
  request: Request,
  options: CorsOptions = {}
): Response {
  const corsHeaders = getCorsHeaders(request, options);
  const newHeaders = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Validate that a request comes from an allowed origin
 *
 * Use this for stricter security checks beyond CORS headers.
 *
 * @param request - The incoming request
 * @returns true if origin is valid, false otherwise
 */
export function validateRequestOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");

  // Requests without Origin header (same-origin or non-browser) are allowed
  // They will be validated by API key instead
  if (!origin) {
    return true;
  }

  return isOriginAllowed(origin);
}
