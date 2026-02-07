"use client";

import { useState, useEffect } from "react";
import { api, useQuery, useAction } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";
import { useAIFeature } from "~/hooks/useAIFeature";

// Circular Progress Component
function CircularProgress({
  value,
  size = 100,
  strokeWidth = 8,
  showLabel = true,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 80) return "#10b981";
    if (value >= 60) return "#3b82f6";
    if (value >= 40) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262626"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-mono text-text-primary">{value.toFixed(0)}</span>
        </div>
      )}
    </div>
  );
}

interface LogsAnalysisProps {
  selectedProjectId: Id<"projects"> | null;
}

interface PromptVersion {
  promptKey: string;
  versionNumber?: number;
  totalReports: number;
  averageScore: number;
}

export function LogsAnalysis({ selectedProjectId }: LogsAnalysisProps) {
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(null);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"version" | "batch" | "individual">("version");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Get all traces to build prompt list
  const traces = useQuery(
    api.domains.logs.queries.getTraces,
    selectedProjectId ? { projectId: selectedProjectId, limit: 1000 } : "skip"
  );

  // Get version report
  const versionReport = useQuery(
    api.domains.logs.analysis.queries.getVersionReport,
    selectedProjectId && selectedPromptKey
      ? { projectId: selectedProjectId, promptKey: selectedPromptKey, versionNumber: selectedVersionNumber }
      : "skip"
  );

  // Get batch reports
  const batchReports = useQuery(
    api.domains.logs.analysis.queries.getBatchReportsByPrompt,
    selectedProjectId && selectedPromptKey
      ? { projectId: selectedProjectId, promptKey: selectedPromptKey, versionNumber: selectedVersionNumber }
      : "skip"
  );

  // Get conversation reports
  const conversationReports = useQuery(
    api.domains.logs.analysis.queries.getConversationReportsByPrompt,
    selectedProjectId && selectedPromptKey
      ? { projectId: selectedProjectId, promptKey: selectedPromptKey, limit: 100 }
      : "skip"
  );

  // Get analysis stats
  const analysisStats = useQuery(
    api.domains.logs.analysis.queries.getPromptAnalysisStats,
    selectedProjectId && selectedPromptKey
      ? { projectId: selectedProjectId, promptKey: selectedPromptKey }
      : "skip"
  );

  // Actions
  const analyzeConversation = useAction(api.domains.logs.analysis.actions.analyzeConversation);
  const generateBatchReport = useAction(api.domains.logs.analysis.actions.generateBatchReport);
  const generateVersionReport = useAction(api.domains.logs.analysis.actions.generateVersionReport);

  // Build prompt versions list from traces
  const promptVersions: PromptVersion[] = [];
  if (traces) {
    const promptMap = new Map<string, PromptVersion>();

    traces.forEach((trace: any) => {
      const key = trace.promptKey;
      if (!promptMap.has(key)) {
        promptMap.set(key, {
          promptKey: key,
          versionNumber: undefined,
          totalReports: 0,
          averageScore: 0,
        });
      }
    });

    promptVersions.push(...Array.from(promptMap.values()));
  }

  // Auto-select first prompt if none selected
  useEffect(() => {
    if (!selectedPromptKey && promptVersions.length > 0) {
      setSelectedPromptKey(promptVersions[0].promptKey);
    }
  }, [promptVersions, selectedPromptKey]);

  const { checkAIFeature } = useAIFeature();

  const handleAnalyzeAll = async () => {
    if (!selectedProjectId || !selectedPromptKey || !traces) return;
    if (!checkAIFeature("aiPromptAnalysis")) return;

    setIsAnalyzing(true);
    try {
      const promptTraces = traces.filter((t: any) => t.promptKey === selectedPromptKey);
      const reports = [];
      
      for (const trace of promptTraces.slice(0, 20)) {
        try {
          const report = await analyzeConversation({ traceId: trace.traceId });
          reports.push(report);
        } catch (error) {
          console.error(`Failed to analyze trace ${trace.traceId}:`, error);
        }
      }

      const batchSize = 10;
      const batches = Math.ceil(reports.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, reports.length);
        const batchTraceIds = promptTraces.slice(start, end).map((t: any) => t.traceId);

        if (batchTraceIds.length > 0) {
          try {
            await generateBatchReport({
              projectId: selectedProjectId,
              promptKey: selectedPromptKey,
              batchNumber: i + 1,
              traceIds: batchTraceIds,
            });
          } catch (error) {
            console.error(`Failed to generate batch ${i + 1}:`, error);
          }
        }
      }

      try {
        await generateVersionReport({
          projectId: selectedProjectId,
          promptKey: selectedPromptKey,
          versionNumber: selectedVersionNumber,
        });
      } catch (error) {
        console.error("Failed to generate version report:", error);
      }

      alert("Analysis complete!");
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Analysis failed. See console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-xl bg-sidebar-active border border-sidebar-border flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-text-tertiary">
            analytics
          </span>
        </div>
        <h3 className="text-text-primary font-medium mb-1">No Project Selected</h3>
        <p className="text-text-secondary text-sm">
          Select a project from the sidebar to view conversation analysis
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Prompt Versions */}
      <div className="w-[400px] flex flex-col min-w-0">
        <div className="mb-6 pr-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-xl font-semibold text-text-primary">Analysis</h1>
            {selectedPromptKey && (
              <button
                onClick={handleAnalyzeAll}
                disabled={isAnalyzing}
                className="text-[10px] font-bold text-text-tertiary hover:text-text-secondary transition-colors uppercase tracking-[0.1em] disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze All"}
              </button>
            )}
          </div>

          {analysisStats && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-sidebar-active/30 border border-sidebar-border">
                <div className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-0.5">Reports</div>
                <div className="text-base font-mono text-text-primary leading-none">{analysisStats.totalConversationReports}</div>
              </div>
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-sidebar-active/30 border border-sidebar-border">
                <div className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-0.5">Avg Score</div>
                <div className="text-base font-mono text-text-primary leading-none">
                  {analysisStats.averageSuccessScore.toFixed(1)}/10
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 sidebar-scroll">
          {promptVersions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-sidebar-active/20 rounded-xl border border-dashed border-sidebar-border">
              <span className="material-symbols-outlined text-text-tertiary mb-2">folder_open</span>
              <p className="text-xs text-text-tertiary">No prompts tracked yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {promptVersions.map((pv) => (
                <button
                  key={pv.promptKey}
                  onClick={() => {
                    setSelectedPromptKey(pv.promptKey);
                    setSelectedVersionNumber(pv.versionNumber);
                  }}
                  className={cn(
                    "w-full group rounded-lg p-3 text-left transition-all relative border",
                    selectedPromptKey === pv.promptKey
                      ? "bg-sidebar-active border-sidebar-border ring-1 ring-white/5"
                      : "bg-transparent border-transparent hover:bg-sidebar-hover hover:border-sidebar-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <code className="text-[11px] font-mono text-text-secondary truncate">
                      {pv.promptKey}
                    </code>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">v{pv.versionNumber || "latest"}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Reports */}
      <div className="flex-1 flex flex-col bg-sidebar-bg border border-sidebar-border rounded-xl overflow-hidden shadow-2xl relative">
        {selectedPromptKey ? (
          <>
            {/* Header with view mode tabs */}
            <div className="px-6 py-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar-active/40 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <h3 className="text-sm font-semibold text-text-primary mb-1">
                    Analysis Report
                  </h3>
                  <code className="text-[10px] text-text-tertiary font-mono bg-white/5 px-1.5 py-0.5 rounded">
                    {selectedPromptKey}
                  </code>
                </div>
              </div>

              <div className="flex gap-1">
                <button
                  onClick={() => setViewMode("version")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    viewMode === "version"
                      ? "bg-sidebar-active text-text-primary border border-sidebar-border"
                      : "text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  Version
                </button>
                <button
                  onClick={() => setViewMode("batch")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    viewMode === "batch"
                      ? "bg-sidebar-active text-text-primary border border-sidebar-border"
                      : "text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  Batch
                </button>
                <button
                  onClick={() => setViewMode("individual")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                    viewMode === "individual"
                      ? "bg-sidebar-active text-text-primary border border-sidebar-border"
                      : "text-text-tertiary hover:text-text-secondary"
                  )}
                >
                  Individual
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto py-6 chat-scroll bg-[#050505]">
              <div className="max-w-4xl mx-auto w-full space-y-8 px-6">
                {viewMode === "version" && (
                  <VersionReportView report={versionReport} />
                )}

                {viewMode === "batch" && (
                  <BatchReportsView reports={batchReports || []} />
                )}

                {viewMode === "individual" && (
                  <IndividualReportsView reports={conversationReports || []} />
                )}
              </div>
              <div className="h-12" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-[#020202]">
            <div className="w-16 h-16 rounded-full border border-sidebar-border flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-text-tertiary text-[24px]">analytics</span>
            </div>
            <h4 className="text-text-primary font-medium mb-1">Select a Prompt</h4>
            <p className="text-xs text-text-tertiary max-w-[200px] leading-relaxed">
              Select a prompt from the left to view its analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Version Report View
function VersionReportView({ report }: { report: any }) {
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-xl bg-sidebar-active border border-sidebar-border flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px] text-text-tertiary">analytics</span>
        </div>
        <p className="text-sm text-text-secondary mb-2">No version report available yet</p>
        <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">Run "Analyze All" to generate insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* Hero Stats */}
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col items-center">
          <div className="text-[9px] text-blue-400/70 uppercase tracking-widest font-bold mb-3">Success Rate</div>
          <CircularProgress value={report.overallSuccessRate} size={80} strokeWidth={8} />
        </div>

        <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center">
          <div className="text-[9px] text-emerald-400/70 uppercase tracking-widest font-bold mb-3">Avg Score</div>
          <div className="relative w-[80px] h-[80px] flex items-center justify-center">
            <CircularProgress value={report.averageScore * 10} size={80} strokeWidth={8} showLabel={false} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-xl font-mono text-text-primary leading-none">{report.averageScore.toFixed(1)}</span>
                  <span className="text-[10px] text-text-tertiary leading-none">/10</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col items-center justify-center">
          <div className="text-[9px] text-amber-400/70 uppercase tracking-widest font-bold mb-3">Conversations</div>
          <div className="flex flex-col items-center justify-center h-[80px]">
            <span className="material-symbols-outlined text-amber-400/50 text-2xl mb-1">forum</span>
            <div className="text-3xl font-mono text-text-primary leading-none">{report.totalAnalyzed}</div>
          </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="p-5 rounded-xl bg-sidebar-active/30 border border-sidebar-border w-full">
        <h4 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <span className="w-1 h-4 bg-blue-500 rounded-full" />
          Executive Summary
        </h4>
        <p className="text-sm text-text-secondary leading-relaxed">
          {report.summary}
        </p>
      </div>

      {/* Insights / Content Sections */}
      <div className="grid grid-cols-2 gap-6 w-full">
        {/* Key Insights */}
        {report.keyInsights.length > 0 && (
          <div className="col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-blue-400/70 uppercase tracking-widest mb-2">Key Insights</h4>
            <div className="grid grid-cols-2 gap-3">
              {report.keyInsights.map((insight: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                  <p className="text-xs text-text-secondary leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-emerald-400/70 uppercase tracking-widest mb-2">Strengths</h4>
          <div className="space-y-2">
            {report.strengthsIdentified.map((strength: string, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xs text-text-secondary leading-relaxed">{strength}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-amber-400/70 uppercase tracking-widest mb-2">Weaknesses</h4>
          <div className="space-y-2">
            {report.weaknessesIdentified.map((weakness: string, idx: number) => (
              <div key={idx} className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xs text-text-secondary leading-relaxed">{weakness}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions */}
        {report.improvementSuggestions.length > 0 && (
          <div className="col-span-2 pt-6 border-t border-sidebar-border">
            <h4 className="text-xs font-bold text-purple-400/70 uppercase tracking-widest mb-4">Recommendations</h4>
            <div className="grid grid-cols-2 gap-3">
              {report.improvementSuggestions.map((suggestion: string, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                  <p className="text-xs text-text-secondary leading-relaxed">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Batch Reports View
function BatchReportsView({ reports }: { reports: any[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-xl bg-sidebar-active border border-sidebar-border flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px] text-text-tertiary">analytics</span>
        </div>
        <p className="text-sm text-text-secondary mb-2">No batch reports available</p>
        <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">Run "Analyze All" to generate reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((batch) => (
        <div
          key={batch._id}
          className="group p-5 rounded-xl bg-sidebar-active/30 border border-sidebar-border transition-all hover:bg-sidebar-active/40"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-active border border-sidebar-border flex items-center justify-center font-mono text-base font-bold text-text-primary">
                #{batch.batchNumber}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-1">
                  Batch {batch.batchNumber}
                </h4>
                <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                  <span>{batch.conversationCount} conversations</span>
                  <span>•</span>
                  <span className={cn(
                    "font-bold",
                    batch.averageScore >= 7 ? "text-emerald-400" :
                    batch.averageScore >= 5 ? "text-amber-400" :
                    "text-red-400"
                  )}>
                    {batch.averageScore.toFixed(1)}/10
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-text-secondary mb-4 leading-relaxed">
            {batch.summary}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {batch.commonPatterns.length > 0 && (
              <div className="p-3 rounded-lg bg-sidebar-active/30 border border-sidebar-border">
                <h5 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-3">
                  Common Patterns
                </h5>
                <ul className="space-y-2">
                  {batch.commonPatterns.map((pattern: string, idx: number) => (
                    <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 leading-relaxed">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-text-tertiary flex-shrink-0" />
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {batch.frequentIssues.length > 0 && (
              <div className="p-3 rounded-lg bg-sidebar-active/30 border border-sidebar-border">
                <h5 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-3">
                  Frequent Issues
                </h5>
                <ul className="space-y-2">
                  {batch.frequentIssues.map((issue: string, idx: number) => (
                    <li key={idx} className="text-xs text-text-secondary flex items-start gap-2 leading-relaxed">
                      <span className="mt-0.5">⚠</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Individual Reports View
function IndividualReportsView({ reports }: { reports: any[] }) {
  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-xl bg-sidebar-active border border-sidebar-border flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-[32px] text-text-tertiary">analytics</span>
        </div>
        <p className="text-sm text-text-secondary mb-2">No individual reports available</p>
        <p className="text-[10px] text-text-tertiary uppercase tracking-widest font-bold">Run "Analyze All" to generate reports</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {reports.map((report) => (
        <div
          key={report._id}
          className="group p-4 rounded-lg bg-sidebar-active/30 border border-sidebar-border transition-all hover:bg-sidebar-active/40"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-base font-mono font-bold border",
                  report.successScore >= 7
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : report.successScore >= 5
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border-red-500/20"
                )}
              >
                {report.successScore}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-[10px] font-mono text-text-secondary">{report.traceId.slice(0, 12)}...</code>
                  <span
                    className={cn(
                      "text-[9px] px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wider border",
                      report.outcome === "success"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : report.outcome === "partial"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    )}
                  >
                    {report.outcome}
                  </span>
                </div>
                <code className="text-[9px] text-text-tertiary font-mono">{report.traceId}</code>
              </div>
            </div>
          </div>

          <p className="text-xs text-text-secondary mb-4 leading-relaxed">
            {report.summary}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {report.criticalPoints.length > 0 && (
              <div className="space-y-2">
                <h6 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Highlights</h6>
                <ul className="space-y-1.5">
                  {report.criticalPoints.map((point: string, idx: number) => (
                    <li key={idx} className="text-[10px] text-text-secondary flex items-start gap-2">
                      <div className="mt-1.5 w-1 h-1 rounded-full bg-text-tertiary flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.issues.length > 0 && (
              <div className="p-3 rounded-lg bg-sidebar-active/30 border border-sidebar-border">
                <h6 className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest mb-2">Issues</h6>
                <ul className="space-y-1.5">
                  {report.issues.map((issue: string, idx: number) => (
                    <li key={idx} className="text-[10px] text-text-secondary flex items-start gap-2">
                      <span className="mt-0.5">⚠</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
