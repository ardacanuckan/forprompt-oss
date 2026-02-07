"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { BarChart3, Brain } from "lucide-react";
import { api, useQuery, useAction } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { Button } from "@forprompt/ui/button";
import { cn } from "@forprompt/ui";
import { useAIFeature } from "~/hooks/useAIFeature";

interface Analysis {
  clarityScore: number;
  improvements: string[];
  edgeCases: string[];
  optimizations: string[];
  overallAssessment: string;
  alignmentCheck?: {
    purposeAlignment: { score: number; feedback: string };
    behaviorAlignment: { score: number; feedback: string };
    constraintsAlignment: { score: number; feedback: string };
  };
  toolUsageAnalysis?: {
    tools: Array<{
      name: string;
      isProperlyInstructed: boolean;
      issues: string[];
      suggestions: string[];
    }>;
    overallToolUsage: string;
  };
}

interface PromptAnalysisProps {
  selectedVersionId: Id<"promptVersions"> | null;
  onClose?: () => void;
  onFixInEditor?: () => void;
}

// Animated Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(defaultOpen ? undefined : 0);

  useEffect(() => {
    if (!contentRef.current) return;
    
    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      const timer = setTimeout(() => setHeight(undefined), 300);
      return () => clearTimeout(timer);
    } else {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
      requestAnimationFrame(() => {
        setHeight(0);
      });
    }
  }, [isOpen]);

  return (
    <div className="border-b border-neutral-800/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 flex items-center justify-between transition-colors",
          "hover:bg-neutral-900/50"
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn(
            "material-symbols-outlined text-[20px]",
            title === "Analysis" ? "text-indigo-400" :
            title === "Alignment Analysis" ? "text-indigo-400" :
            title === "Tool Usage Analysis" ? "text-cyan-400" :
            "text-neutral-400"
          )}>
            {icon}
          </span>
          <span className="text-sm font-medium text-neutral-200">{title}</span>
          {badge && <div className="ml-1">{badge}</div>}
        </div>
        <span
          className={cn(
            "material-symbols-outlined text-[18px] text-neutral-500 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        >
          expand_more
        </span>
      </button>
      <div
        ref={contentRef}
        style={{ height: height !== undefined ? `${height}px` : "auto" }}
        className={cn(
          "transition-all duration-200 ease-out overflow-hidden",
          !isOpen && "opacity-0",
          isOpen && "opacity-100"
        )}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
}

// Circular Progress Component
function CircularProgress({
  value,
  size = 100,
  strokeWidth = 8,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (value >= 80) return "#10b981"; // emerald-500
    if (value >= 60) return "#3b82f6"; // blue-500
    if (value >= 40) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
  };

  return (
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
  );
}

// Token estimation
function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Simple word count
function countWords(text: string): number {
  if (!text) return 0;
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Count structural sections (basic detection)
function countSections(text: string): number {
  if (!text) return 0;
  // Count paragraphs separated by double newlines
  return text.split(/\n\n+/).filter(s => s.trim().length > 0).length;
}

// Get grade from score
function getGrade(score: number): { label: string } {
  if (score >= 80) return { label: "Excellent" };
  if (score >= 60) return { label: "Good" };
  if (score >= 40) return { label: "Fair" };
  return { label: "Poor" };
}

export function PromptAnalysis({ selectedVersionId, onClose, onFixInEditor }: PromptAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<Analysis | null>(null);

  // Track which version the current AI analysis belongs to
  const analysisVersionRef = useRef<Id<"promptVersions"> | null>(null);

  const selectedVersion = useQuery(
    api.domains.promptOrchestrator.models.queries.get,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  ) as {
    _id: Id<"promptVersions">;
    versionNumber: number;
    systemPrompt: string;
    testCount?: number;
    avgTokens?: number;
    avgResponseTime?: number;
  } | undefined | null;

  // Load saved analysis from database
  const savedAnalysis = useQuery(
    api.domains.promptOrchestrator.models.queries.getLatestAnalysis,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  );

  const analyzePrompt = useAction(api.domains.promptOrchestrator.models.actions.analyzePrompt);

  // Load saved analysis when version changes
  useEffect(() => {
    if (selectedVersionId !== analysisVersionRef.current) {
      analysisVersionRef.current = selectedVersionId;

      // Load from database if available
      if (savedAnalysis) {
        setAiAnalysis({
          clarityScore: savedAnalysis.clarityScore,
          improvements: savedAnalysis.improvements,
          edgeCases: savedAnalysis.edgeCases,
          optimizations: savedAnalysis.optimizations,
          overallAssessment: savedAnalysis.overallAssessment,
          alignmentCheck: savedAnalysis.alignmentCheck,
          toolUsageAnalysis: savedAnalysis.toolUsageAnalysis,
        });
      } else {
        setAiAnalysis(null);
      }
    }
  }, [selectedVersionId, savedAnalysis]);

  const promptText = selectedVersion?.systemPrompt ?? "";

  const tokenCount = useMemo(() => estimateTokens(promptText), [promptText]);
  const wordCount = useMemo(() => countWords(promptText), [promptText]);
  const sectionCount = useMemo(() => countSections(promptText), [promptText]);

  // Use AI clarity score if available (convert 1-10 to 0-100), otherwise show 0
  const overallScore = aiAnalysis ? Math.round(aiAnalysis.clarityScore * 10) : 0;
  const grade = getGrade(overallScore);

  const { checkAIFeature } = useAIFeature();

  const handleAiAnalyze = async () => {
    if (!selectedVersionId) return;
    if (!checkAIFeature("aiPromptAnalysis")) return;

    setIsAnalyzing(true);
    try {
      const result = await analyzePrompt({ versionId: selectedVersionId });
      setAiAnalysis(result);
    } catch (error: unknown) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!selectedVersionId) {
    return (
      <div className="h-full flex flex-col bg-neutral-950">
        {/* Header */}
        <div className="h-14 px-5 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-200">Analysis</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-neutral-400">
                close
              </span>
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-neutral-600" />
            </div>
            <p className="text-sm text-neutral-500">Select a version to analyze</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-neutral-200">Analysis</span>
                </div>
          <Button
            onClick={handleAiAnalyze}
            disabled={isAnalyzing}
            size="sm"
          className="h-8 px-4 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-100 border border-neutral-600 hover:border-neutral-500 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            {isAnalyzing ? (
              <>
                <span className="material-symbols-outlined text-[14px] animate-spin">
                  progress_activity
                </span>
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="w-3.5 h-3.5" />
                Analyze
              </>
            )}
          </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto chat-scroll">
        {/* Score Hero Section */}
        <div className="px-5 py-8 border-b border-neutral-800/30 bg-gradient-to-b from-neutral-900/20 to-transparent">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="relative">
              <CircularProgress value={overallScore} size={120} strokeWidth={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{overallScore}</span>
                <span className="text-[10px] text-neutral-500 uppercase tracking-widest font-medium mt-0.5">
                  {aiAnalysis ? "AI Score" : "Score"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xl font-bold text-neutral-100">
                  {grade.label}
                </span>
                <p className="text-sm text-neutral-400">
                  {aiAnalysis
                    ? `Clarity: ${aiAnalysis.clarityScore}/10`
                    : `Run analysis for insights`
                  }
                </p>
              </div>
            </div>
          </div>
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50 backdrop-blur-sm hover:border-neutral-700/50 transition-colors">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-white">{tokenCount.toLocaleString()}</span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium mt-0.5">Tokens</span>
            </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50 backdrop-blur-sm hover:border-neutral-700/50 transition-colors">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-white">{wordCount.toLocaleString()}</span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium mt-0.5">Words</span>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800/50 backdrop-blur-sm hover:border-neutral-700/50 transition-colors">
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-white">{sectionCount}</span>
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium mt-0.5">Sections</span>
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Sections */}
        <div>
          {/* Analysis */}
          {!aiAnalysis && (
          <CollapsibleSection
              title="Analysis"
              icon="analytics"
              defaultOpen={true}
            >
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50 flex items-center justify-center mb-6">
                  <Brain className="w-10 h-10 text-neutral-400" />
                </div>
                <h3 className="text-base font-semibold text-neutral-200 mb-2">Get Detailed Insights</h3>
                <p className="text-sm text-neutral-400 text-center max-w-sm leading-relaxed mb-6">
                  Click the "Analyze" button above to receive comprehensive feedback on your prompt
                </p>
                
                <div className="w-full max-w-md space-y-3 mb-6">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-neutral-900/30 to-neutral-900/10 border border-neutral-800/30">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-amber-400">
                        lightbulb
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-300 mb-0.5">Suggested Improvements</p>
                      <p className="text-xs text-neutral-500">Specific ways to enhance your prompt</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-neutral-900/30 to-neutral-900/10 border border-neutral-800/30">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-red-400">
                        error
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-300 mb-0.5">Potential Issues</p>
                      <p className="text-xs text-neutral-500">Edge cases and failure scenarios</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-br from-neutral-900/30 to-neutral-900/10 border border-neutral-800/30">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[16px] text-emerald-400">
                        speed
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-neutral-300 mb-0.5">Performance Tips</p>
                      <p className="text-xs text-neutral-500">Token efficiency and optimizations</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <span className="material-symbols-outlined text-[14px]">
                    info
                  </span>
                  <span>Analysis takes ~5-10 seconds</span>
                </div>
            </div>
          </CollapsibleSection>
          )}

          {aiAnalysis && (
            <CollapsibleSection
              title="Analysis"
              icon="analytics"
              defaultOpen={true}
              badge={
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400">
                  {aiAnalysis.clarityScore}/10
                  </span>
              }
            >
              <div className="space-y-3">
                {/* Clarity Score */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 to-indigo-500/10 border border-indigo-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-neutral-300">Clarity Score</span>
                    <span className={cn(
                      "text-xl font-bold",
                      aiAnalysis.clarityScore >= 8 ? "text-emerald-400" :
                      aiAnalysis.clarityScore >= 6 ? "text-amber-400" :
                      "text-red-400"
                    )}>
                        {aiAnalysis.clarityScore}<span className="text-neutral-500 font-normal text-sm">/10</span>
                      </span>
                  </div>
                  <div className="h-2.5 bg-neutral-800/50 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        aiAnalysis.clarityScore >= 8 ? "bg-gradient-to-r from-emerald-500 to-emerald-400" :
                        aiAnalysis.clarityScore >= 6 ? "bg-gradient-to-r from-amber-500 to-amber-400" :
                        "bg-gradient-to-r from-red-500 to-red-400"
                      )}
                      style={{ width: `${aiAnalysis.clarityScore * 10}%` }}
                    />
                  </div>
                </div>

                {/* Assessment */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-neutral-400">
                      psychology
                    </span>
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Overall Assessment
                    </span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {aiAnalysis.overallAssessment}
                  </p>
                </div>

                {/* Improvements */}
                {aiAnalysis.improvements.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gradient-to-b from-amber-500 to-amber-600 rounded-full"></div>
                      <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                        Suggested Improvements
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                        {aiAnalysis.improvements.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aiAnalysis.improvements.map((item, idx) => (
                        <div key={idx} className="group p-3 rounded-xl bg-gradient-to-br from-amber-500/5 to-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-amber-400">{idx + 1}</span>
                            </div>
                            <p className="text-xs text-neutral-200 leading-relaxed flex-1">{item}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edge Cases */}
                {aiAnalysis.edgeCases.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded-full"></div>
                      <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                        Potential Issues
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-medium">
                        {aiAnalysis.edgeCases.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aiAnalysis.edgeCases.map((item, idx) => (
                        <div key={idx} className="group p-3 rounded-xl bg-gradient-to-br from-red-500/5 to-red-500/10 border border-red-500/20 hover:border-red-500/40 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <span className="material-symbols-outlined text-[16px] text-red-400">
                                error
                                </span>
                            </div>
                            <p className="text-xs text-neutral-200 leading-relaxed flex-1">{item}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimizations */}
                {aiAnalysis.optimizations.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-4 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
                      <span className="text-xs font-semibold text-neutral-200 uppercase tracking-wider">
                        Performance Tips
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                        {aiAnalysis.optimizations.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {aiAnalysis.optimizations.map((item, idx) => (
                        <div key={idx} className="group p-3 rounded-xl bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5">
                              <span className="material-symbols-outlined text-[16px] text-emerald-400">
                                speed
                                </span>
                            </div>
                            <p className="text-xs text-neutral-200 leading-relaxed flex-1">{item}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
            </CollapsibleSection>
            )}

          {/* Alignment Analysis */}
          {aiAnalysis?.alignmentCheck && (
            <CollapsibleSection
              title="Alignment Analysis"
              icon="target"
              defaultOpen={true}
            >
              <div className="space-y-3">
                {/* Purpose Alignment */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-neutral-400">
                        flag
                      </span>
                      <span className="text-sm font-medium text-neutral-200">Purpose Alignment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-20 rounded-full bg-neutral-800 overflow-hidden"
                      )}>
                        <div className={cn(
                          "h-full rounded-full transition-all",
                          aiAnalysis.alignmentCheck.purposeAlignment.score >= 7 ? "bg-emerald-500" :
                          aiAnalysis.alignmentCheck.purposeAlignment.score >= 5 ? "bg-amber-500" :
                          "bg-red-500"
                        )} style={{ width: `${aiAnalysis.alignmentCheck.purposeAlignment.score * 10}%` }} />
                      </div>
                    <span className={cn(
                        "text-sm font-bold",
                        aiAnalysis.alignmentCheck.purposeAlignment.score >= 7 ? "text-emerald-400" :
                        aiAnalysis.alignmentCheck.purposeAlignment.score >= 5 ? "text-amber-400" :
                        "text-red-400"
                    )}>
                      {aiAnalysis.alignmentCheck.purposeAlignment.score}/10
                    </span>
                  </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {aiAnalysis.alignmentCheck.purposeAlignment.feedback}
                  </p>
                </div>

                {/* Behavior Alignment */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-neutral-400">
                        psychology
                      </span>
                      <span className="text-sm font-medium text-neutral-200">Behavior Alignment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-20 rounded-full bg-neutral-800 overflow-hidden"
                      )}>
                        <div className={cn(
                          "h-full rounded-full transition-all",
                          aiAnalysis.alignmentCheck.behaviorAlignment.score >= 7 ? "bg-emerald-500" :
                          aiAnalysis.alignmentCheck.behaviorAlignment.score >= 5 ? "bg-amber-500" :
                          "bg-red-500"
                        )} style={{ width: `${aiAnalysis.alignmentCheck.behaviorAlignment.score * 10}%` }} />
                      </div>
                    <span className={cn(
                        "text-sm font-bold",
                        aiAnalysis.alignmentCheck.behaviorAlignment.score >= 7 ? "text-emerald-400" :
                        aiAnalysis.alignmentCheck.behaviorAlignment.score >= 5 ? "text-amber-400" :
                        "text-red-400"
                    )}>
                      {aiAnalysis.alignmentCheck.behaviorAlignment.score}/10
                    </span>
                  </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {aiAnalysis.alignmentCheck.behaviorAlignment.feedback}
                  </p>
                </div>

                {/* Constraints Alignment */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-neutral-400">
                        rule
                      </span>
                      <span className="text-sm font-medium text-neutral-200">Constraints Alignment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "h-1.5 w-20 rounded-full bg-neutral-800 overflow-hidden"
                      )}>
                        <div className={cn(
                          "h-full rounded-full transition-all",
                          aiAnalysis.alignmentCheck.constraintsAlignment.score >= 7 ? "bg-emerald-500" :
                          aiAnalysis.alignmentCheck.constraintsAlignment.score >= 5 ? "bg-amber-500" :
                          "bg-red-500"
                        )} style={{ width: `${aiAnalysis.alignmentCheck.constraintsAlignment.score * 10}%` }} />
                      </div>
                    <span className={cn(
                        "text-sm font-bold",
                        aiAnalysis.alignmentCheck.constraintsAlignment.score >= 7 ? "text-emerald-400" :
                        aiAnalysis.alignmentCheck.constraintsAlignment.score >= 5 ? "text-amber-400" :
                        "text-red-400"
                    )}>
                      {aiAnalysis.alignmentCheck.constraintsAlignment.score}/10
                    </span>
                  </div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {aiAnalysis.alignmentCheck.constraintsAlignment.feedback}
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          )}

          {/* Tool Usage Analysis */}
          {aiAnalysis?.toolUsageAnalysis && (
            <CollapsibleSection
              title="Tool Usage Analysis"
              icon="construction"
              defaultOpen={true}
            >
              <div className="space-y-3">
                {/* Overall Assessment */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-neutral-900/50 to-neutral-900/30 border border-neutral-800/50">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="material-symbols-outlined text-[16px] text-neutral-400">
                      description
                    </span>
                    <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                      Overview
                    </span>
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {aiAnalysis.toolUsageAnalysis.overallToolUsage}
                  </p>
                </div>

                {/* Individual Tools */}
                {aiAnalysis.toolUsageAnalysis.tools.map((tool, idx) => (
                  <div key={idx} className={cn(
                    "p-4 rounded-xl border transition-all",
                    tool.isProperlyInstructed 
                      ? "bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/30" 
                      : "bg-gradient-to-br from-red-500/5 to-red-500/10 border-red-500/30"
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-neutral-400">
                          build
                      </span>
                        <span className="text-sm font-semibold text-neutral-200">{tool.name}</span>
                      </div>
                      <div className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1",
                        tool.isProperlyInstructed 
                          ? "bg-emerald-500/20 text-emerald-400" 
                          : "bg-red-500/20 text-red-400"
                      )}>
                        <span className="material-symbols-outlined text-[12px]">
                          {tool.isProperlyInstructed ? "check_circle" : "error"}
                        </span>
                        {tool.isProperlyInstructed ? "Configured" : "Needs Review"}
                      </div>
                    </div>
                    
                    {tool.issues.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                          {tool.issues.map((issue, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10">
                            <span className="material-symbols-outlined text-[14px] text-red-400 mt-0.5">
                              warning
                            </span>
                            <p className="text-xs text-neutral-300 leading-relaxed">{issue}</p>
                          </div>
                          ))}
                      </div>
                    )}
                    
                    {tool.suggestions.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                          {tool.suggestions.map((suggestion, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10">
                            <span className="material-symbols-outlined text-[14px] text-emerald-400 mt-0.5">
                              check_circle
                            </span>
                            <p className="text-xs text-neutral-300 leading-relaxed">{suggestion}</p>
                          </div>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      </div>
    </div>
  );
}
