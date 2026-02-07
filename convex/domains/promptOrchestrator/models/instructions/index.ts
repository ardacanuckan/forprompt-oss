/**
 * AI prompt templates and utilities for prompt version actions
 */

export * from "./base";
export * from "./tasks";

/**
 * Combines multiple prompt sections into a single prompt string
 * Filters out empty strings and joins with double newlines
 */
export function buildSections(sections: string[]): string {
  return sections
    .filter((section) => section && section.trim().length > 0)
    .join("\n\n");
}

