/**
 * Report builders - Prompt templates for conversation analysis
 */

import {
  report_conversation_analysis,
  report_batch,
  report_version,
} from "../../../../forprompt";

// ============================================================================
// Template Utilities
// ============================================================================

/**
 * Replace template variables in a prompt
 */
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const value = variables[varName];
    return value !== undefined ? String(value) : match;
  });
}

// ============================================================================
// Types
// ============================================================================

export interface BuildConversationAnalysisPromptParams {
  promptKey: string;
  conversationSpans: Array<{
    role?: string;
    content?: string;
    type: string;
  }>;
  model?: string;
  source?: string;
}

export interface BuildBatchReportPromptParams {
  promptKey: string;
  conversationReports: Array<{
    successScore: number;
    outcome: string;
    criticalPoints: string[];
    issues: string[];
    summary: string;
  }>;
  batchNumber: number;
}

export interface BuildVersionReportPromptParams {
  promptKey: string;
  versionNumber?: number;
  batchReports: Array<{
    batchNumber: number;
    averageScore: number;
    commonPatterns: string[];
    frequentIssues: string[];
    recommendations: string[];
    summary: string;
  }>;
  totalConversations: number;
}

// ============================================================================
// Builder Functions
// ============================================================================

/**
 * Builds a conversation analysis prompt
 */
export function buildConversationAnalysisPrompt(
  params: BuildConversationAnalysisPromptParams
): string {
  const { promptKey, conversationSpans, model, source } = params;

  const conversationText = conversationSpans
    .filter((span) => span.role && span.content)
    .map((span) => `${span.role?.toUpperCase()}: ${span.content}`)
    .join("\n\n");

  return replaceTemplateVariables(report_conversation_analysis, {
    promptKey,
    model: model || "unknown",
    source: source || "unknown",
    totalMessages: conversationSpans.length,
    conversationText,
  });
}

/**
 * Builds a batch report prompt
 */
export function buildBatchReportPrompt(
  params: BuildBatchReportPromptParams
): string {
  const { promptKey, conversationReports, batchNumber } = params;

  const reportsText = conversationReports
    .map(
      (report, idx) =>
        `Conversation ${idx + 1}: Score ${report.successScore}/10, ${report.outcome}. ${report.summary}`
    )
    .join("\n");

  return replaceTemplateVariables(report_batch, {
    conversationCount: conversationReports.length,
    promptKey,
    batchNumber,
    reportsText,
  });
}

/**
 * Builds a version report prompt
 */
export function buildVersionReportPrompt(
  params: BuildVersionReportPromptParams
): string {
  const { promptKey, versionNumber, batchReports, totalConversations } = params;

  const batchesText = batchReports
    .map((b) => `Batch ${b.batchNumber}: Avg ${b.averageScore}/10. ${b.summary}`)
    .join("\n");

  return replaceTemplateVariables(report_version, {
    promptKey,
    versionNumber: versionNumber || "unversioned",
    totalConversations,
    batchCount: batchReports.length,
    batchesText,
  });
}
