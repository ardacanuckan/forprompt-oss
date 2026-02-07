/**
 * Version management - reads from package.json at build time
 * 
 * This file provides the SDK version dynamically from package.json
 * to avoid hardcoded version strings that need manual updates.
 */

// @ts-ignore - package.json is resolved at build time
import pkg from "../package.json" with { type: "json" };

/**
 * The current SDK version from package.json
 */
export const VERSION = pkg.version as string;
