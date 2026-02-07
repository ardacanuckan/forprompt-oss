"use client";

import { useState, useMemo, useCallback } from "react";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";

interface LogsListProps {
  selectedProjectId: Id<"projects"> | null;
}

export function LogsList({ selectedProjectId }: LogsListProps) {
  // ============================================
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY
  // ============================================

  // State hooks
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [promptFilter, setPromptFilter] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mutation hooks
  const deleteTrace = useMutation(api.domains.logs.mutations.deleteTrace);
  const clearProjectLogs = useMutation(api.domains.logs.mutations.clearProjectLogs);

  // Query hooks - always call with consistent arguments structure
  const tracesQuery = selectedProjectId
    ? { projectId: selectedProjectId, promptKey: promptFilter || undefined, limit: 50 }
    : "skip";
  const traces = useQuery(api.domains.logs.queries.getTraces, tracesQuery);

  const traceDetailQuery = selectedTraceId ? { traceId: selectedTraceId } : "skip";
  const traceDetail = useQuery(api.domains.logs.queries.getTraceWithSpans, traceDetailQuery);

  const statsQuery = selectedProjectId ? { projectId: selectedProjectId } : "skip";
  const stats = useQuery(api.domains.logs.queries.getProjectStats, statsQuery);

  // Memoized values - MUST be called unconditionally
  const uniquePromptKeys = useMemo(() => {
    if (!traces) return [];
    return Array.from(new Set(traces.map((t: any) => t.promptKey)));
  }, [traces]);

  // Callbacks - defined unconditionally
  const handleDeleteTrace = useCallback(async (e: React.MouseEvent, traceId: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      setIsDeleting(true);
      await deleteTrace({ traceId });
      if (selectedTraceId === traceId) {
        setSelectedTraceId(null);
      }
    } catch (error) {
      console.error("Failed to delete trace:", error);
      alert("Failed to delete conversation");
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTrace, selectedTraceId]);

  const handleClearAll = useCallback(async () => {
    if (!selectedProjectId) return;
    if (!confirm("Are you sure you want to clear ALL logs for this project? This cannot be undone.")) return;

    try {
      setIsDeleting(true);
      await clearProjectLogs({ projectId: selectedProjectId });
      setSelectedTraceId(null);
    } catch (error) {
      console.error("Failed to clear logs:", error);
      alert("Failed to clear logs");
    } finally {
      setIsDeleting(false);
    }
  }, [clearProjectLogs, selectedProjectId]);

  // Format date - memoized to avoid recreation
  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // ============================================
  // END OF HOOKS SECTION
  // ============================================

  if (!selectedProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-sidebar-active border border-sidebar-border flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[32px] text-text-tertiary">
            history
          </span>
        </div>
        <h3 className="text-text-primary font-medium mb-1">No Project Selected</h3>
        <p className="text-text-secondary text-sm">
          Select a project from the sidebar to view its logs
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-6">
      {/* Logs List Sidebar */}
      <div className="w-[400px] flex flex-col min-w-0">
        {/* Header Section */}
        <div className="mb-6 pr-2">
          <div className="flex items-center justify-between mb-3 px-1">
            <h1 className="text-xl font-semibold text-text-primary">Logs</h1>
            {traces && traces.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={isDeleting}
                className="text-[10px] font-bold text-text-tertiary hover:text-red-400 transition-colors uppercase tracking-[0.1em]"
              >
                Clear All
              </button>
            )}
          </div>
          
          {/* Subtle Stats Row */}
          {stats && (
            <div className="flex gap-3 mb-4">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-sidebar-active/30 border border-sidebar-border">
                <div className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-0.5">Traces</div>
                <div className="text-base font-mono text-text-primary leading-none">{stats.totalTraces}</div>
              </div>
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-sidebar-active/30 border border-sidebar-border">
                <div className="text-[9px] text-text-tertiary uppercase tracking-widest font-bold mb-0.5">Spans</div>
                <div className="text-base font-mono text-text-primary leading-none">{stats.totalSpans}</div>
              </div>
            </div>
          )}

          {/* Prompt Filter Dropdown */}
          {uniquePromptKeys.length > 0 && (
            <div className="relative group/select">
              <select
                value={promptFilter || ""}
                onChange={(e) => setPromptFilter(e.target.value || null)}
                className="w-full bg-sidebar-active/50 border border-sidebar-border text-text-secondary rounded-lg px-3.5 py-2 text-[13px] focus:outline-none focus:border-text-tertiary transition-all appearance-none cursor-pointer hover:bg-sidebar-active"
              >
                <option value="">All Prompts</option>
                {uniquePromptKeys.map((key: any) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-text-tertiary pointer-events-none group-hover/select:text-text-secondary transition-colors">
                unfold_more
              </span>
            </div>
          )}
        </div>

        {/* Traces Scroll Area */}
        <div className="flex-1 overflow-y-auto pr-2 sidebar-scroll">
          {!traces || traces.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center bg-sidebar-active/20 rounded-xl border border-dashed border-sidebar-border">
              <span className="material-symbols-outlined text-text-tertiary mb-2">history_toggle_off</span>
              <p className="text-xs text-text-tertiary">No logs recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {traces.map((trace: any) => (
                <div
                  key={trace._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTraceId(trace.traceId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedTraceId(trace.traceId);
                    }
                  }}
                  className={cn(
                    "w-full group rounded-lg p-3 text-left transition-all relative border cursor-pointer",
                    selectedTraceId === trace.traceId
                      ? "bg-sidebar-active border-sidebar-border ring-1 ring-white/5"
                      : "bg-transparent border-transparent hover:bg-sidebar-hover hover:border-sidebar-border"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <code className="text-[11px] font-mono text-text-secondary truncate">
                        {trace.promptKey}
                      </code>
                      <span className="text-[10px] text-text-tertiary">
                        {formatDate(trace.createdAt)}
                      </span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteTrace(e, trace.traceId)}
                      disabled={isDeleting}
                      className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-red-400 transition-all rounded"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{trace.spanCount} msgs</span>
                    {trace.model && <span className="truncate max-w-[80px]">{trace.model.split('/').pop()}</span>}
                    {trace.source && <span className="truncate">@{trace.source}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Conversation Detail Area */}
      <div className="flex-1 flex flex-col bg-sidebar-bg border border-sidebar-border rounded-xl overflow-hidden shadow-2xl relative">
        {selectedTraceId ? (
          !traceDetail ? (
            <div className="flex-1 flex items-center justify-center bg-[#050505]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-text-tertiary border-t-text-primary rounded-full animate-spin" />
                <p className="text-xs text-text-tertiary animate-pulse font-medium uppercase tracking-widest">Loading Conversation...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Detail Header */}
              <div className="px-6 py-4 border-b border-sidebar-border flex items-center justify-between bg-sidebar-active/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-text-primary">
                        Conversation
                      </h3>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                        traceDetail.trace.status === "active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-text-tertiary/10 border-text-tertiary/20 text-text-tertiary"
                      )}>
                        {traceDetail.trace.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                       <code className="text-[10px] text-text-tertiary font-mono bg-white/5 px-1.5 py-0.5 rounded">
                        {traceDetail.trace.traceId}
                      </code>
                      {traceDetail.trace.model && (
                        <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">model_training</span>
                          {traceDetail.trace.model}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <button
                    onClick={(e) => handleDeleteTrace(e as any, traceDetail.trace.traceId)}
                    disabled={isDeleting}
                    className="p-2 text-text-tertiary hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                    title="Delete Conversation"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                  <button
                    onClick={() => setSelectedTraceId(null)}
                    className="p-2 text-text-tertiary hover:text-text-primary transition-colors rounded-lg hover:bg-white/5"
                    title="Close"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>
              </div>

              {/* Conversation Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 chat-scroll bg-[#050505]">
                <div className="max-w-4xl mx-auto space-y-8">
                  {traceDetail.spans.map((span: any) => (
                    <div key={span._id} className={cn(
                      "flex flex-col gap-3 transition-all",
                      span.role === "user" ? "items-start" : "items-start"
                    )}>
                      {/* Avatar & Role */}
                      <div className="flex items-center gap-2 px-1">
                        <div className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center shrink-0 border shadow-sm",
                          span.role === "user" 
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
                            : span.role === "assistant" 
                              ? "bg-purple-500/10 border-purple-500/20 text-purple-400"
                              : "bg-text-tertiary/10 border-text-tertiary/20 text-text-tertiary"
                        )}>
                          <span className="material-symbols-outlined text-[14px]">
                            {span.role === "user" ? "person" : span.role === "assistant" ? "smart_toy" : "tune"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.1em]">
                            {span.role}
                          </span>
                          <span className="text-[9px] text-text-tertiary font-mono">
                            {formatDate(span.createdAt)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content Bubble */}
                      <div className="relative group w-full pl-8">
                        <div className={cn(
                          "text-[14px] leading-relaxed whitespace-pre-wrap selection:bg-blue-500/20",
                          span.role === "user"
                            ? "text-text-primary font-medium"
                            : "text-text-secondary"
                        )}>
                          {span.content}
                        </div>

                        {/* Message Metadata Footer */}
                        {(span.inputTokens || span.outputTokens || span.durationMs) && (
                          <div className="flex items-center gap-4 text-[9px] text-text-tertiary font-mono pt-3 opacity-60 group-hover:opacity-100 transition-opacity">
                            {span.inputTokens > 0 && (
                              <div className="flex items-center gap-1" title="Input Tokens">
                                <span>{span.inputTokens} IN</span>
                              </div>
                            )}
                            {span.outputTokens > 0 && (
                              <div className="flex items-center gap-1" title="Output Tokens">
                                <span>{span.outputTokens} OUT</span>
                              </div>
                            )}
                            {span.durationMs > 0 && (
                              <div className="flex items-center gap-1" title="Duration">
                                <span>{span.durationMs}ms</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="h-12" />
              </div>
            </>
          )
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-12 bg-[#020202]">
             <div className="w-16 h-16 rounded-full border border-sidebar-border flex items-center justify-center mb-6 shadow-sm group transition-all">
                <span className="material-symbols-outlined text-text-tertiary text-[24px]">history</span>
             </div>
             <h4 className="text-text-primary font-medium mb-1">Select a Trace</h4>
             <p className="text-xs text-text-tertiary max-w-[200px] leading-relaxed">
               Select an execution trace from the left to view the details
             </p>
          </div>
        )}
      </div>
    </div>
  );
}

