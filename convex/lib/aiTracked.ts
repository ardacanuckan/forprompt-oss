/**
 * AI functions with usage tracking
 * Wraps the base AI functions to track and enforce usage limits
 */

import { ActionCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import {
  chat,
  chatWithUsage,
  chatWithThinking,
  type AIRequestOptions,
  type AIResponseWithUsage,
  type AIResponseWithThinking,
  type ThinkingRequestOptions,
  DEFAULT_MODEL,
} from "./ai";

export interface TrackingContext {
  ctx: ActionCtx;
  orgId: Id<"organizations">;
  projectId?: Id<"projects">;
  userId?: Id<"users">;
  promptId?: Id<"prompts">;
  versionId?: Id<"promptVersions">;
  traceId?: string;
}

export type AiOperation =
  | "analyzePrompt"
  | "generatePrompt"
  | "enhanceField"
  | "editPrompt"
  | "testPrompt"
  | "getEnhancementSuggestions"
  | "analyzeConversation"
  | "generateBatchReport"
  | "generateVersionReport"
  | "extractInfo";

/**
 * Execute AI chat with usage tracking
 * Checks limits before execution and tracks usage after
 */
export async function chatWithTracking(
  tracking: TrackingContext,
  operation: AiOperation,
  options: AIRequestOptions
): Promise<string> {
  const { ctx, orgId, projectId, userId, promptId, versionId, traceId } = tracking;

  // Check usage limits before calling AI
  await ctx.runMutation(internal.domains.subscriptions.mutations.checkUsageLimit, {
    orgId,
    metric: "internalAiTokens",
    additionalUsage: options.maxTokens ?? 2048, // Estimate
  });

  // Execute AI call with usage tracking
  const result = await chatWithUsage(options);

  // Track usage
  await ctx.runMutation(internal.domains.subscriptions.mutations.trackAiUsage, {
    orgId,
    projectId,
    userId,
    operation,
    inputTokens: 0, // OpenRouter doesn't split tokens in simple response
    outputTokens: 0,
    totalTokens: result.tokens,
    model: options.model ?? DEFAULT_MODEL,
    promptId,
    versionId,
    traceId,
  });

  return result.content;
}

/**
 * Execute AI chat with usage tracking and return token count
 */
export async function chatWithUsageTracking(
  tracking: TrackingContext,
  operation: AiOperation,
  options: AIRequestOptions
): Promise<AIResponseWithUsage> {
  const { ctx, orgId, projectId, userId, promptId, versionId, traceId } = tracking;

  // Check usage limits before calling AI
  await ctx.runMutation(internal.domains.subscriptions.mutations.checkUsageLimit, {
    orgId,
    metric: "internalAiTokens",
    additionalUsage: options.maxTokens ?? 2048,
  });

  // Execute AI call
  const result = await chatWithUsage(options);

  // Track usage
  await ctx.runMutation(internal.domains.subscriptions.mutations.trackAiUsage, {
    orgId,
    projectId,
    userId,
    operation,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: result.tokens,
    model: options.model ?? DEFAULT_MODEL,
    promptId,
    versionId,
    traceId,
  });

  return result;
}

/**
 * Execute AI chat with extended thinking and usage tracking
 */
export async function chatWithThinkingTracking(
  tracking: TrackingContext,
  operation: AiOperation,
  options: ThinkingRequestOptions
): Promise<AIResponseWithThinking> {
  const { ctx, orgId, projectId, userId, promptId, versionId, traceId } = tracking;

  // Check usage limits - thinking uses more tokens
  await ctx.runMutation(internal.domains.subscriptions.mutations.checkUsageLimit, {
    orgId,
    metric: "internalAiTokens",
    additionalUsage: (options.maxTokens ?? 16000) + (options.budgetTokens ?? 10000),
  });

  // Execute AI call with thinking
  const result = await chatWithThinking(options);

  // Track usage
  await ctx.runMutation(internal.domains.subscriptions.mutations.trackAiUsage, {
    orgId,
    projectId,
    userId,
    operation,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: result.tokens,
    model: "anthropic/claude-sonnet-4.5",
    promptId,
    versionId,
    traceId,
  });

  return result;
}

/**
 * Check if organization has available AI tokens
 * Returns true if within limits, false if limit exceeded
 * Does not throw - use for soft checks
 */
export async function hasAvailableTokens(
  ctx: ActionCtx,
  orgId: Id<"organizations">,
  estimatedTokens: number = 2048
): Promise<boolean> {
  try {
    await ctx.runMutation(internal.domains.subscriptions.mutations.checkUsageLimit, {
      orgId,
      metric: "internalAiTokens",
      additionalUsage: estimatedTokens,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get organization ID from project ID
 * Helper for actions that only have project context
 */
export async function getOrgIdFromProject(
  ctx: ActionCtx,
  projectId: Id<"projects">
): Promise<Id<"organizations"> | null> {
  const project = await ctx.runQuery(internal.domains.projects.queries.getInternal, {
    projectId,
  });
  return project?.orgId ?? null;
}
