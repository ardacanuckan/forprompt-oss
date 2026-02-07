/**
 * Analyze conversation action
 */

import { v } from "convex/values";
import { action } from "../../../../_generated/server";
import { internal } from "../../../../_generated/api";
import { DEFAULT_MODEL, parseJSONResponse } from "../../../../lib/ai";
import { chatWithTracking, getOrgIdFromProject } from "../../../../lib/aiTracked";
import { buildConversationAnalysisPrompt } from "../builders/reportBuilder";

interface ConversationReport {
  reportId?: string;
  successScore: number;
  outcome: string;
  criticalPoints: string[];
  issues: string[];
  summary: string;
}

export const analyzeConversation = action({
  args: {
    traceId: v.string(),
  },
  handler: async (ctx, args): Promise<ConversationReport> => {
    // Get trace with spans
    const traceData = await ctx.runQuery(
      internal.domains.logs.queries.getTraceWithSpansInternal,
      { traceId: args.traceId }
    ) as { trace: any; spans: any[] } | null;

    if (!traceData) {
      throw new Error("Trace not found");
    }

    const { trace, spans } = traceData;

    // Check if report already exists
    const existingReport = await ctx.runQuery(
      internal.domains.logs.analysis.queries.getConversationReportByTraceInternal,
      { traceId: args.traceId }
    ) as ConversationReport | null;

    if (existingReport) {
      return existingReport;
    }

    // Build analysis prompt
    const analysisPrompt = buildConversationAnalysisPrompt({
      promptKey: trace.promptKey,
      conversationSpans: spans.map((span: any) => ({
        role: span.role,
        content: span.content,
        type: span.type,
      })),
      model: trace.model,
      source: trace.source,
    });

    // Get organization context for usage tracking
    const orgId = await getOrgIdFromProject(ctx, trace.projectId);

    // Call AI with usage tracking
    let content: string;
    if (orgId) {
      content = await chatWithTracking(
        {
          ctx,
          orgId,
          projectId: trace.projectId,
          traceId: args.traceId,
        },
        "analyzeConversation",
        {
          model: DEFAULT_MODEL,
          messages: [{ role: "user", content: analysisPrompt }],
          maxTokens: 1500,
        }
      );
    } else {
      const ai = await import("../../../../lib/ai");
      content = await ai.chat({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: analysisPrompt }],
        maxTokens: 1500,
      });
    }

    try {
      const analysis = parseJSONResponse<{
        successScore: number;
        outcome: string;
        criticalPoints: string[];
        issues: string[];
        summary: string;
      }>(content);

      const result: ConversationReport = {
        successScore: analysis?.successScore ?? 5,
        outcome: analysis?.outcome ?? "partial",
        criticalPoints: analysis?.criticalPoints ?? [],
        issues: analysis?.issues ?? [],
        summary: analysis?.summary ?? "No summary provided",
      };

      // Save report
      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveConversationReportInternal,
        {
          traceId: args.traceId,
          projectId: trace.projectId,
          promptKey: trace.promptKey,
          versionNumber: undefined,
          ...result,
        }
      );

      return result;
    } catch (error) {
      console.error("Analysis parsing failed:", error);

      const fallback: ConversationReport = {
        successScore: 5,
        outcome: "partial",
        criticalPoints: ["Analysis failed - manual review needed"],
        issues: ["Could not parse AI response"],
        summary: content.substring(0, 200),
      };

      await ctx.runMutation(
        internal.domains.logs.analysis.mutations.saveConversationReportInternal,
        {
          traceId: args.traceId,
          projectId: trace.projectId,
          promptKey: trace.promptKey,
          versionNumber: undefined,
          ...fallback,
        }
      );

      return fallback;
    }
  },
});




