"use client";

import { useState, useMemo } from "react";
import { Id } from "~/convex/_generated/dataModel";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { cn } from "@forprompt/ui";
import { ConfirmationDialog } from "~/app/components/ui";
import { OnboardingGuide } from "@components/OnboardingGuide";
import { useAnalytics } from "~/hooks/useAnalytics";

interface PromptListProps {
  selectedProjectId: Id<"projects"> | null;
  selectedPromptId: Id<"prompts"> | null;
  onPromptSelect?: (promptId: Id<"prompts">) => void;
}

interface Version {
  _id: Id<"promptVersions">;
  versionNumber: number;
  description?: string;
  createdAt: number;
  systemPrompt: string;
  testCount?: number;
  avgTokens?: number;
  avgResponseTime?: number;
}

export function PromptList({ 
  selectedProjectId, 
  selectedPromptId,
}: PromptListProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<Id<"promptVersions"> | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState<Id<"promptVersions"> | null>(null);
  const [confirmVersionId, setConfirmVersionId] = useState<Id<"promptVersions"> | null>(null);

  const setActiveVersion = useMutation(api.domains.promptOrchestrator.mutations.setActiveVersion);
  const { trackVersionDeployed } = useAnalytics();

  // Get all prompts for the project to check if any exist
  const allPrompts = useQuery(
    api.domains.promptOrchestrator.queries.list,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Get the selected prompt with versions
  const prompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    selectedPromptId ? { promptId: selectedPromptId } : "skip"
  ) as { 
    _id: Id<"prompts">; 
    name: string;
    key: string;
    description?: string;
    activeVersionId?: Id<"promptVersions">; 
    versions: Version[];
  } | undefined | null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get selected version details
  const selectedVersion = prompt?.versions.find(v => v._id === selectedVersionId) 
    ?? prompt?.versions.find(v => v._id === prompt.activeVersionId)
    ?? prompt?.versions[0];

  // Fetch AI Analysis for the selected version
  const analysis = useQuery(
    api.domains.promptOrchestrator.models.queries.getLatestAnalysis,
    selectedVersion ? { versionId: selectedVersion._id } : "skip"
  );

  // Fetch version success report for usage metrics
  const versionReport = useQuery(
    api.domains.logs.analysis.queries.getVersionReport,
    selectedVersion && prompt?.key && selectedProjectId ? {
      projectId: selectedProjectId,
      promptKey: prompt.key,
      versionNumber: selectedVersion.versionNumber,
    } : "skip"
  );

  // Filter versions based on search query
  const filteredVersions = useMemo(() => {
    if (!prompt?.versions) return [];
    if (!searchQuery.trim()) return prompt.versions;

    const query = searchQuery.toLowerCase();
    return prompt.versions.filter(v => 
      v.versionNumber.toString().includes(query) ||
      v.description?.toLowerCase().includes(query) ||
      v.systemPrompt.toLowerCase().includes(query)
    );
  }, [prompt?.versions, searchQuery]);

  const handleSetActiveClick = (versionId: Id<"promptVersions">, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmVersionId(versionId);
  };

  const handleConfirmSetActive = async () => {
    if (!selectedPromptId || !confirmVersionId) return;

    setIsSettingActive(confirmVersionId);
    try {
      await setActiveVersion({
        promptId: selectedPromptId,
        versionId: confirmVersionId,
      });
      const deployedVersion = prompt?.versions.find(v => v._id === confirmVersionId);
      if (deployedVersion && prompt && selectedProjectId) {
        trackVersionDeployed(
          selectedPromptId,
          prompt.key,
          deployedVersion.versionNumber,
          selectedProjectId
        );
      }
      setConfirmVersionId(null);
    } catch (error) {
      console.error("Failed to set active version:", error);
    } finally {
      setIsSettingActive(null);
    }
  };

  const selectedVersionForConfirm = prompt?.versions.find(v => v._id === confirmVersionId);
  const hasVersions = prompt?.versions && prompt.versions.length > 0;
  
  // Check if any prompts exist in the project (not just selected)
  const hasAnyPrompts = allPrompts && allPrompts.length > 0;
  // Check if any prompt has versions
  const hasAnyVersions = allPrompts?.some((p: any) => p.versionCount > 0) || hasVersions;

  if (!selectedProjectId || !selectedPromptId || !prompt) {
    return (
      <OnboardingGuide
        hasProject={!!selectedProjectId}
        hasPrompt={!!hasAnyPrompts}
        hasVersion={!!hasAnyVersions}
        className="min-h-[500px]"
      />
    );
  }

  // Calculate real stats or use reasonable defaults if values are missing
  const stats = selectedVersion ? {
    testCount: selectedVersion.testCount ?? 0,
    avgLatency: selectedVersion.avgResponseTime ? Math.round(selectedVersion.avgResponseTime) : "-",
    avgTokens: selectedVersion.avgTokens ? Math.round(selectedVersion.avgTokens) : "-",
    aiScore: analysis ? `${analysis.clarityScore}/10` : "-",
    testScore: versionReport?.averageScore ? `${Math.round(versionReport.averageScore)}/10` : "-",
    successRate: versionReport?.overallSuccessRate ? `${Math.round(versionReport.overallSuccessRate)}%` : "-",
  } : null;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-8 flex-shrink-0">
        <h1 className="text-xl font-medium text-neutral-200">{prompt.name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <code className="text-xs text-neutral-500 font-mono">{prompt.key}</code>
          <span className="text-neutral-800">•</span>
          <span className="text-xs text-neutral-500">{prompt.versions.length} versions</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        
        {/* Left Panel - Version List */}
        <div className="lg:col-span-4 flex flex-col min-h-0">
          <div className="mb-4 space-y-3">
            {/* Search Input */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-0 top-1/2 -translate-y-1/2 text-[18px] text-neutral-600 transition-colors group-focus-within:text-neutral-400">
                search
              </span>
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-b border-neutral-800 py-2 pl-7 pr-0 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto -mr-2 pr-2">
            {filteredVersions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-600">
                  {searchQuery ? "No versions found" : "No versions yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredVersions.map((version) => {
                  const isActive = prompt.activeVersionId === version._id;
                  const isSelected = selectedVersion?._id === version._id;
                  
                  return (
                    <div
                      key={version._id}
                      className={cn(
                        "group relative w-full rounded-lg transition-all",
                        isSelected 
                          ? "bg-neutral-900" 
                          : "hover:bg-neutral-900/50"
                      )}
                    >
                      <button
                        onClick={() => setSelectedVersionId(version._id)}
                        className="w-full text-left p-3"
                      >
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-sm font-mono",
                              isSelected ? "text-neutral-200" : "text-neutral-400"
                            )}>
                              v{version.versionNumber}
                            </span>
                            {isActive && (
                              <span className="text-[10px] text-emerald-500 font-medium">
                                Active
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-neutral-600">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                        
                        {(version.description || (version.testCount !== undefined && version.testCount > 0)) && (
                          <div className="flex items-center gap-2 text-xs text-neutral-500 pl-0.5">
                            {version.description && (
                              <span className="truncate max-w-[120px]">{version.description}</span>
                            )}
                            {version.description && version.testCount !== undefined && version.testCount > 0 && (
                              <span className="text-neutral-800">•</span>
                            )}
                            {version.testCount !== undefined && version.testCount > 0 && (
                              <span>{version.testCount} runs</span>
                            )}
                          </div>
                        )}
                      </button>
                      
                      {!isActive && (
                        <button
                          onClick={(e) => handleSetActiveClick(version._id, e)}
                          disabled={isSettingActive === version._id}
                          className={cn(
                            "absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity",
                            "px-1.5 py-0.5 text-[9px] font-medium rounded",
                            "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400",
                            "hover:border border-emerald-500/30",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          title="Set as active version"
                        >
                          {isSettingActive === version._id ? "Setting..." : "Set Active"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Version Detail */}
        <div className="lg:col-span-8 flex flex-col min-h-0 space-y-8 overflow-y-auto -mr-4 pr-4">
          {!selectedVersion ? (
            <div className="flex-1 flex items-center justify-center text-neutral-600">
              <p>Select a version to view details</p>
            </div>
          ) : (
            <>
              {/* Stats Row - Expanded */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-6 border-b border-neutral-800 pb-8">
                <div>
                  <div className="text-2xl font-light text-neutral-200">{stats?.testCount}</div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">Runs</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-neutral-200">{stats?.aiScore}</div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">AI Score</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-neutral-200">{stats?.testScore}</div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">AI Test Score</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-emerald-400">{stats?.successRate}</div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">Usage Success</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-neutral-200">{stats?.avgLatency}<span className="text-sm ml-1 text-neutral-600">ms</span></div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">Avg Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-neutral-200">{stats?.avgTokens}</div>
                  <div className="text-xs text-neutral-600 mt-1 uppercase tracking-wide">Avg Tokens</div>
                </div>
              </div>

              {/* AI Analysis - Collapsible */}
              {analysis && (
                <div className="py-4 border-b border-neutral-800/50">
                   <button 
                    onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
                    className="w-full flex items-center justify-between group"
                   >
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-medium text-neutral-400 group-hover:text-neutral-200 transition-colors">AI Evaluation</h3>
                    </div>
                    <span className={cn(
                      "material-symbols-outlined text-[18px] text-neutral-600 transition-transform duration-200 group-hover:text-neutral-400",
                      isAnalysisOpen ? "rotate-180" : ""
                    )}>
                      keyboard_arrow_down
                    </span>
                  </button>
                  
                  {isAnalysisOpen && (
                    <div className="mt-4 space-y-4">
                      <p className="text-sm text-neutral-400 leading-relaxed">
                        {analysis.overallAssessment}
                      </p>

                      {(analysis.improvements.length > 0 || analysis.edgeCases.length > 0) && (
                        <div className="grid grid-cols-1 gap-6 pt-2">
                          {analysis.improvements.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Suggested Improvements</h4>
                              <ul className="space-y-1">
                                {analysis.improvements.map((item, i) => (
                                  <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                                    <span className="text-neutral-700 mt-1.5 text-[6px]">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {analysis.edgeCases.length > 0 && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Edge Cases</h4>
                              <ul className="space-y-1">
                                {analysis.edgeCases.map((item, i) => (
                                  <li key={i} className="text-sm text-neutral-400 flex items-start gap-2">
                                    <span className="text-neutral-700 mt-1.5 text-[6px]">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* System Prompt - Clean */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-neutral-400">System Prompt</h3>
                  <button 
                    onClick={() => navigator.clipboard.writeText(selectedVersion.systemPrompt)}
                    className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
                  >
                    Copy
                  </button>
                </div>
                <div className="bg-neutral-900/50 rounded-lg p-6 border border-neutral-800/50">
                  <pre className="font-mono text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                    {selectedVersion.systemPrompt || <span className="text-neutral-700 italic">Empty prompt</span>}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmationDialog
        isOpen={confirmVersionId !== null}
        onClose={() => setConfirmVersionId(null)}
        onConfirm={handleConfirmSetActive}
        title="Set Active Version"
        description={`Are you sure you want to set version ${selectedVersionForConfirm?.versionNumber} as the active version? This will make it the default version used for this prompt.`}
        confirmText="Set Active"
        isLoading={isSettingActive === confirmVersionId}
      />
    </div>
  );
}
