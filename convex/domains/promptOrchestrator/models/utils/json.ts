/**
 * JSON utility functions
 */

/**
 * Normalize and sanitize text for JSON parsing
 */
function normalizeForJson(text: string): string {
  return text
    // Normalize line endings
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Remove zero-width characters and other invisible unicode
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Trim
    .trim();
}

/**
 * Try to parse JSON with multiple strategies
 */
function tryParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Clean and parse JSON from a message that might contain markdown or other text
 */
export function cleanJson(text: string): any {
  const normalized = normalizeForJson(text);

  // 1. Try direct parse first
  let result = tryParse(normalized);
  if (result !== null) return result;

  // 2. Try to find JSON block in markdown (greedy - get everything between first ``` and last ```)
  const jsonMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    result = tryParse(jsonMatch[1].trim());
    if (result !== null) return result;
  }

  // 3. Try to find object between first { and last }
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = normalized.substring(firstBrace, lastBrace + 1);
    result = tryParse(jsonCandidate);
    if (result !== null) return result;

    // Debug: log what we tried to parse
    console.error("JSON parse failed. First 100 chars:", jsonCandidate.substring(0, 100));
    console.error("Last 100 chars:", jsonCandidate.substring(jsonCandidate.length - 100));
  }

  // 4. Try to find array between first [ and last ]
  const firstBracket = normalized.indexOf("[");
  const lastBracket = normalized.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    const jsonCandidate = normalized.substring(firstBracket, lastBracket + 1);
    result = tryParse(jsonCandidate);
    if (result !== null) return result;
  }

  throw new Error("Could not extract valid JSON from response");
}
