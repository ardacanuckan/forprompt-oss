/**
 * Encryption utilities for sensitive data
 *
 * This module provides:
 * - AES-256-GCM encryption for sensitive data (async functions)
 * - SHA-256 hashing for API key lookups
 * - Legacy base64 functions (deprecated, for migration only)
 *
 * SECURITY: Always use encryptAsync/decryptAsync for new code.
 * The legacy encrypt/decrypt functions are base64 only and should
 * only be used during migration.
 */

// Base64 character set
const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Encryption constants
const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 128; // bits
const SALT = "forprompt-encryption-salt-v1";
const PBKDF2_ITERATIONS = 100000;

// Version prefix for encrypted data (allows future algorithm changes)
const ENCRYPTION_VERSION = "v1:";

/**
 * Encode a string to base64 (Convex-compatible)
 */
function base64Encode(str: string): string {
  // Convert string to UTF-8 bytes
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 128) {
      bytes.push(code);
    } else if (code < 2048) {
      bytes.push((code >> 6) | 192);
      bytes.push((code & 63) | 128);
    } else {
      bytes.push((code >> 12) | 224);
      bytes.push(((code >> 6) & 63) | 128);
      bytes.push((code & 63) | 128);
    }
  }

  // Convert bytes to base64
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | (b2 >> 4)];
    result +=
      b2 !== undefined ? BASE64_CHARS[((b2 & 15) << 2) | (b3 >> 6)] : "=";
    result += b3 !== undefined ? BASE64_CHARS[b3 & 63] : "=";
  }

  return result;
}

/**
 * Decode a base64 string (Convex-compatible)
 */
function base64Decode(encoded: string): string {
  // Remove padding
  const str = encoded.replace(/=+$/, "");

  // Convert base64 to bytes
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(str[i]);
    const c2 = BASE64_CHARS.indexOf(str[i + 1]);
    const c3 = BASE64_CHARS.indexOf(str[i + 2]);
    const c4 = BASE64_CHARS.indexOf(str[i + 3]);

    bytes.push((c1 << 2) | (c2 >> 4));
    if (c3 !== -1) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (c4 !== -1) bytes.push(((c3 & 3) << 6) | c4);
  }

  // Convert bytes to UTF-8 string
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte < 128) {
      result += String.fromCharCode(byte);
    } else if (byte < 224) {
      result += String.fromCharCode(((byte & 31) << 6) | (bytes[++i] & 63));
    } else {
      result += String.fromCharCode(
        ((byte & 15) << 12) | ((bytes[++i] & 63) << 6) | (bytes[++i] & 63),
      );
    }
  }

  return result;
}

/**
 * Encode Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    const b3 = bytes[i + 2];

    result += BASE64_CHARS[b1 >> 2];
    result += BASE64_CHARS[((b1 & 3) << 4) | ((b2 ?? 0) >> 4)];
    result +=
      b2 !== undefined
        ? BASE64_CHARS[((b2 & 15) << 2) | ((b3 ?? 0) >> 6)]
        : "=";
    result += b3 !== undefined ? BASE64_CHARS[b3 & 63] : "=";
  }
  return result;
}

/**
 * Decode base64 string to Uint8Array
 */
function base64ToUint8Array(encoded: string): Uint8Array {
  const str = encoded.replace(/=+$/, "");
  const bytes: number[] = [];

  for (let i = 0; i < str.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(str[i]);
    const c2 = BASE64_CHARS.indexOf(str[i + 1]);
    const c3 = BASE64_CHARS.indexOf(str[i + 2]);
    const c4 = BASE64_CHARS.indexOf(str[i + 3]);

    bytes.push((c1 << 2) | (c2 >> 4));
    if (c3 !== -1) bytes.push(((c2 & 15) << 4) | (c3 >> 2));
    if (c4 !== -1) bytes.push(((c3 & 3) << 6) | c4);
  }

  return new Uint8Array(bytes);
}

/**
 * Get encryption key from environment variable
 * The key must be set in CONVEX_ENCRYPTION_KEY environment variable
 */
function getEncryptionSecret(): string {
  const secret = process.env.CONVEX_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "CONVEX_ENCRYPTION_KEY environment variable is required for encryption. " +
        "Set it in your Convex dashboard under Settings > Environment Variables.",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      "CONVEX_ENCRYPTION_KEY must be at least 32 characters long for security.",
    );
  }
  return secret;
}

/**
 * Derive a cryptographic key from the secret using PBKDF2
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Import the secret as key material
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  // Derive the actual encryption key
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns: "v1:<base64(iv + ciphertext + tag)>"
 *
 * @param value - The plaintext string to encrypt
 * @returns Encrypted string with version prefix
 */
export async function encryptAsync(value: string): Promise<string> {
  const secret = getEncryptionSecret();
  const key = await deriveKey(secret);

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encoder = new TextEncoder();

  // Encrypt the value
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    encoder.encode(value),
  );

  // Combine IV + ciphertext (tag is appended by GCM)
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  // Return with version prefix
  return ENCRYPTION_VERSION + uint8ArrayToBase64(combined);
}

/**
 * Decrypt a string encrypted with encryptAsync
 * Handles both new (v1:) and legacy (base64) formats
 *
 * @param encrypted - The encrypted string to decrypt
 * @returns Decrypted plaintext string
 */
export async function decryptAsync(encrypted: string): Promise<string> {
  if (!encrypted.startsWith(ENCRYPTION_VERSION)) {
    return base64Decode(encrypted);
  }

  const secret = getEncryptionSecret();
  const key = await deriveKey(secret);

  // Remove version prefix and decode
  const data = encrypted.slice(ENCRYPTION_VERSION.length);
  const combined = base64ToUint8Array(data);

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Hash an API key using SHA-256 for secure lookup
 * This allows O(1) lookup without storing the plaintext key
 *
 * @param apiKey - The API key to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Extract the prefix from an API key for indexing
 * Format: "fp_proj_" (8 characters)
 *
 * @param apiKey - The API key
 * @returns The prefix (first 8 characters)
 */
export function getApiKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 8);
}

/**
 * Constant-time string comparison to prevent timing attacks
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if a value is encrypted with the new format
 *
 * @param value - The value to check
 * @returns true if encrypted with AES-256-GCM (v1 format)
 */
export function isNewEncryptionFormat(value: string): boolean {
  return value.startsWith(ENCRYPTION_VERSION);
}

/**
 * @deprecated Use encryptAsync instead. This function only does base64 encoding.
 * Kept for backward compatibility during migration.
 */
export function encrypt(value: string): string {
  return base64Encode(value);
}

/**
 * @deprecated Use decryptAsync instead. This function only does base64 decoding.
 * Kept for backward compatibility during migration.
 */
export function decrypt(encrypted: string): string {
  // If new format, we can't decrypt synchronously
  if (encrypted.startsWith(ENCRYPTION_VERSION)) {
    throw new Error(
      "Cannot use sync decrypt() for AES-encrypted values. Use decryptAsync() instead.",
    );
  }
  return base64Decode(encrypted);
}

/**
 * Mask API key for display (show first 8 and last 4 characters)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) {
    return "*".repeat(key.length);
  }
  const prefix = key.substring(0, 8);
  const suffix = key.substring(key.length - 4);
  const masked = "*".repeat(Math.min(20, key.length - 12));
  return `${prefix}${masked}${suffix}`;
}

/**
 * Generate a cryptographically secure API key for projects
 * Format: fp_proj_<32 random characters>
 *
 * Uses crypto.getRandomValues for cryptographic randomness
 */
export function generateSecureApiKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const randomChars: string[] = [];

  // Generate 32 random characters using crypto random
  for (let i = 0; i < 32; i++) {
    const randomIndex = randomBytes[i] % chars.length;
    randomChars.push(chars[randomIndex]);
  }

  return `fp_proj_${randomChars.join("")}`;
}
