/**
 * Input validation utilities
 */

import { ValidationError } from "./errors";

/**
 * Validate prompt key format
 * Must start with a letter and contain only alphanumeric, underscores, and dots
 */
export function validatePromptKey(key: string): void {
  const keyRegex = /^[a-zA-Z][a-zA-Z0-9_.]*$/;
  if (!keyRegex.test(key)) {
    throw new ValidationError(
      "Key must start with a letter and contain only alphanumeric characters, underscores, and dots"
    );
  }
}

/**
 * Validate slug format
 * Must be lowercase alphanumeric with hyphens
 */
export function validateSlug(slug: string): void {
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new ValidationError(
      "Slug must be lowercase alphanumeric with hyphens (e.g., 'my-project')"
    );
  }
}

/**
 * Validate email format
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError("Invalid email format");
  }
}

/**
 * Validate JSON string
 */
export function validateJson(jsonString: string): void {
  try {
    JSON.parse(jsonString);
  } catch (error) {
    throw new ValidationError("Invalid JSON format");
  }
}

/**
 * Validate non-empty string
 */
export function validateNonEmpty(value: string, fieldName: string = "Value"): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validate role
 */
export function validateRole(role: string): void {
  const validRoles = ["org:admin", "org:member"];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
  }
}

