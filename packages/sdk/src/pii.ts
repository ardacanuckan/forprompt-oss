/**
 * PII (Personally Identifiable Information) Detection and Redaction
 *
 * SECURITY: This module helps protect user privacy by redacting
 * sensitive information before logging or transmission.
 *
 * Supported PII types:
 * - Email addresses
 * - Phone numbers (US and international)
 * - Social Security Numbers (SSN)
 * - Credit card numbers
 * - IP addresses
 */

/**
 * PII pattern definition
 */
interface PIIPattern {
  /** Name of the PII type */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Replacement string */
  replacement: string;
}

/**
 * Built-in PII patterns
 */
const PII_PATTERNS: PIIPattern[] = [
  // Email addresses
  {
    name: "email",
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: "[EMAIL_REDACTED]",
  },

  // Phone numbers - US formats
  // Matches: (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567
  {
    name: "phone",
    pattern:
      /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
    replacement: "[PHONE_REDACTED]",
  },

  // Social Security Numbers
  // Matches: 123-45-6789, 123 45 6789, 123456789
  {
    name: "ssn",
    pattern: /\b[0-9]{3}[-\s]?[0-9]{2}[-\s]?[0-9]{4}\b/g,
    replacement: "[SSN_REDACTED]",
  },

  // Credit card numbers (Visa, MasterCard, Amex, Discover)
  // Matches: 4111111111111111, 4111-1111-1111-1111, 4111 1111 1111 1111
  {
    name: "credit_card",
    pattern:
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9][0-9])[0-9]{12})\b/g,
    replacement: "[CC_REDACTED]",
  },

  // Credit card with separators
  {
    name: "credit_card_formatted",
    pattern:
      /\b(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
    replacement: "[CC_REDACTED]",
  },

  // IPv4 addresses
  {
    name: "ip_v4",
    pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
    replacement: "[IP_REDACTED]",
  },

  // IPv6 addresses (simplified)
  {
    name: "ip_v6",
    pattern:
      /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    replacement: "[IP_REDACTED]",
  },
];

/**
 * Configuration for PII redaction
 */
export interface PIIRedactionConfig {
  /** Enable PII redaction (default: true) */
  enabled: boolean;

  /** Specific patterns to use (default: all) */
  patterns?: string[];

  /** Custom patterns to add */
  customPatterns?: Array<{
    name: string;
    pattern: RegExp;
    replacement: string;
  }>;

  /** Log redaction statistics (default: false) */
  logStats?: boolean;
}

/**
 * Result of PII redaction
 */
export interface PIIRedactionResult {
  /** The redacted content */
  redacted: string;

  /** Summary of redactions made */
  redactions: string[];

  /** Count of each PII type found */
  counts: Record<string, number>;

  /** Whether any PII was found */
  hasPII: boolean;
}

/**
 * Get default PII redaction config
 */
export function getDefaultPIIConfig(): PIIRedactionConfig {
  return {
    enabled: true,
    logStats: false,
  };
}

/**
 * Redact PII from content
 *
 * @param content - The content to redact
 * @param config - Redaction configuration
 * @returns Redaction result with redacted content and statistics
 *
 * @example
 * ```typescript
 * const result = redactPII("Contact me at john@example.com or (555) 123-4567");
 * console.log(result.redacted);
 * // "Contact me at [EMAIL_REDACTED] or [PHONE_REDACTED]"
 * console.log(result.redactions);
 * // ["email: 1 instance(s)", "phone: 1 instance(s)"]
 * ```
 */
export function redactPII(
  content: string,
  config: PIIRedactionConfig = { enabled: true }
): PIIRedactionResult {
  // Return unchanged if disabled
  if (!config.enabled) {
    return {
      redacted: content,
      redactions: [],
      counts: {},
      hasPII: false,
    };
  }

  let result = content;
  const redactions: string[] = [];
  const counts: Record<string, number> = {};

  // Get patterns to use
  let patterns = PII_PATTERNS;
  if (config.patterns && config.patterns.length > 0) {
    patterns = PII_PATTERNS.filter((p) => config.patterns!.includes(p.name));
  }

  // Add custom patterns if provided
  if (config.customPatterns) {
    patterns = [...patterns, ...config.customPatterns];
  }

  // Apply each pattern
  for (const { name, pattern, replacement } of patterns) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;

    const matches = result.match(pattern);
    if (matches && matches.length > 0) {
      counts[name] = matches.length;
      redactions.push(`${name}: ${matches.length} instance(s)`);
      result = result.replace(pattern, replacement);
    }
  }

  const hasPII = redactions.length > 0;

  if (hasPII && config.logStats) {
    console.log(`PII redaction: ${redactions.join(", ")}`);
  }

  return {
    redacted: result,
    redactions,
    counts,
    hasPII,
  };
}

/**
 * Check if content contains PII without redacting
 *
 * @param content - The content to check
 * @param patterns - Specific patterns to check (default: all)
 * @returns true if PII is detected
 */
export function containsPII(content: string, patterns?: string[]): boolean {
  let patternsToCheck = PII_PATTERNS;
  if (patterns && patterns.length > 0) {
    patternsToCheck = PII_PATTERNS.filter((p) => patterns.includes(p.name));
  }

  for (const { pattern } of patternsToCheck) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      return true;
    }
  }

  return false;
}

/**
 * Get list of available PII pattern names
 */
export function getAvailablePIIPatterns(): string[] {
  return PII_PATTERNS.map((p) => p.name);
}

/**
 * Create a custom PII pattern
 *
 * @example
 * ```typescript
 * const customPattern = createPIIPattern(
 *   "employee_id",
 *   /\bEMP-[0-9]{6}\b/g,
 *   "[EMPLOYEE_ID_REDACTED]"
 * );
 *
 * const result = redactPII("Contact EMP-123456", {
 *   enabled: true,
 *   customPatterns: [customPattern],
 * });
 * ```
 */
export function createPIIPattern(
  name: string,
  pattern: RegExp,
  replacement: string
): PIIPattern {
  // Ensure pattern has global flag
  if (!pattern.flags.includes("g")) {
    throw new Error("PII pattern must have global flag (g)");
  }

  return { name, pattern, replacement };
}
