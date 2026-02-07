"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";
import { ConfirmationDialog } from "~/app/components/ui";

import { PromptInlineReviewer } from "./PromptInlineReviewer";

interface PromptEditorProps {
  promptId: Id<"prompts">;
  selectedVersionId: Id<"promptVersions"> | null;
  onVersionCreated: (versionId: Id<"promptVersions">) => void;
  onViewChange?: (view: string) => void;
  pendingEdit?: {
    original: string;
    modified: string;
    onApply: (finalContent: string) => void;
    onCancel: () => void;
  } | null;
}

const INITIAL_FORM = {
  systemPrompt: "",
  description: "",
};


// Code Editor Component with Line Numbers
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  isFullscreen?: boolean;
}

function CodeEditor({ value, onChange, placeholder, className, isFullscreen = false }: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleLines, setVisibleLines] = useState(20);

  // Calculate line numbers based on content
  const lines = useMemo(() => {
    const lineCount = value ? value.split('\n').length : 1;
    // Show at least visibleLines or actual line count, whichever is greater
    const totalLines = Math.max(lineCount, visibleLines);
    return Array.from({ length: totalLines }, (_, i) => i + 1);
  }, [value, visibleLines]);

  // Calculate visible lines based on container height
  useEffect(() => {
    const updateVisibleLines = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        const lineHeight = 24;
        const padding = 32; // py-4 = 16px top + 16px bottom
        const calculatedLines = Math.max(Math.floor((height - padding) / lineHeight), 10);
        setVisibleLines(calculatedLines);
      }
    };

    updateVisibleLines();
    const resizeObserver = new ResizeObserver(updateVisibleLines);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Sync scroll between textarea and line numbers
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Auto-focus for fullscreen
  useEffect(() => {
    if (isFullscreen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFullscreen]);

  const lineHeight = 24; // 1.5rem = 24px

  return (
    <div 
      ref={containerRef}
      className={cn("flex overflow-hidden rounded-md border border-white/10 bg-black/30", className)}
    >
      {/* Line Numbers */}
      <div
        ref={lineNumbersRef}
        className="flex-shrink-0 py-4 text-right text-xs font-mono text-muted-foreground select-none overflow-y-auto overflow-x-hidden"
        style={{ 
          width: isFullscreen ? '60px' : '50px', 
          minWidth: isFullscreen ? '60px' : '50px',
          paddingLeft: '12px',
          paddingRight: '12px',
        }}
      >
        <div style={{ minHeight: `${lines.length * lineHeight}px` }}>
          {lines.map((lineNum) => (
            <div
              key={lineNum}
              style={{ 
                height: `${lineHeight}px`,
                lineHeight: `${lineHeight}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {lineNum}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/10 flex-shrink-0" />

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={cn(
          "flex-1 w-full bg-transparent py-4 px-4 text-sm font-mono text-foreground",
          "placeholder:text-muted-foreground resize-none focus:outline-none",
          "overflow-y-auto overflow-x-hidden"
        )}
        style={{ 
          lineHeight: `${lineHeight}px`,
        }}
      />
    </div>
  );
}

export function PromptEditor({ promptId, selectedVersionId, onVersionCreated, onViewChange, pendingEdit }: PromptEditorProps) {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSetActiveConfirm, setShowSetActiveConfirm] = useState(false);
  const [isSettingActive, setIsSettingActive] = useState(false);

  // Sync formData when pendingEdit is applied (handled by parent logic usually, but good to be reactive)
  // Actually parent updates selectedVersion/reloads, so we might rely on that.
  // But if parent manages state, we just toggle view.

  const prompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    { promptId }
  ) as { _id: Id<"prompts">; key: string; name: string; activeVersionId?: Id<"promptVersions">; versions?: any[] } | undefined | null;

  const selectedVersion = useQuery(
    api.domains.promptOrchestrator.models.queries.get,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  ) as { _id: Id<"promptVersions">; versionNumber: number; systemPrompt: string; description?: string; isActive: boolean } | undefined | null;

  // Check if this is a brand new prompt with no versions
  const isNewPrompt = prompt && (!prompt.versions || prompt.versions.length === 0);

  const createVersion = useMutation(api.domains.promptOrchestrator.models.mutations.create);
  const updateVersion = useMutation(api.domains.promptOrchestrator.models.mutations.update);
  const setActiveVersion = useMutation(api.domains.promptOrchestrator.mutations.setActiveVersion);

  useEffect(() => {
    if (selectedVersion) {
      setFormData({
        systemPrompt: selectedVersion.systemPrompt,
        description: selectedVersion.description ?? "",
      });
    } else {
      setFormData(INITIAL_FORM);
    }
  }, [selectedVersion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleSave = async () => {
    if (!formData.systemPrompt.trim()) return;

    setIsSaving(true);
    try {
      if (selectedVersionId) {
        await updateVersion({
          versionId: selectedVersionId,
          systemPrompt: formData.systemPrompt,
          description: formData.description || undefined,
        });
      } else {
        const newVersionId = await createVersion({
          promptId,
          systemPrompt: formData.systemPrompt,
          description: formData.description || undefined,
          setAsActive: true,
        });
        onVersionCreated(newVersionId);
      }
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetActiveClick = () => {
    setShowSetActiveConfirm(true);
  };

  const handleConfirmSetActive = async () => {
    if (!selectedVersionId) return;
    setIsSettingActive(true);
    try {
      await setActiveVersion({
        promptId,
        versionId: selectedVersionId,
      });
      setShowSetActiveConfirm(false);
    } catch (error: any) {
      alert(`Failed to set active: ${error.message}`);
    } finally {
      setIsSettingActive(false);
    }
  };

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const hasChanges = selectedVersion && (
    formData.systemPrompt !== selectedVersion.systemPrompt ||
    formData.description !== (selectedVersion.description ?? "")
  );

  // Getting Started UI for new prompts without versions
  if (isNewPrompt) {
    return (
      <div className="flex flex-col h-full max-h-full overflow-hidden p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">v1</span>
            <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              draft
            </span>
          </div>
          <button
            onClick={() => onViewChange?.('configuration')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            Generate with AI
          </button>
        </div>

        {/* Notes */}
        <div className="mb-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Version notes..."
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-b border-white/10 pb-2 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Prompt */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">System Prompt</span>
            <span className="text-xs text-muted-foreground">
              {formData.systemPrompt.length} chars
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <CodeEditor
              value={formData.systemPrompt}
              onChange={(value) => updateField("systemPrompt", value)}
              placeholder="You are a helpful assistant that..."
              className="h-full focus-within:ring-1 focus-within:ring-white/10 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.systemPrompt.trim()}
            className="px-4 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Creating..." : "Create v1"}
          </button>
        </div>
      </div>
    );
  }

  // Regular editor UI for existing versions
  return (
    <>
      <div className="flex flex-col h-full max-h-full overflow-hidden p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {selectedVersion ? `v${selectedVersion.versionNumber}` : "New"}
            </span>
            {selectedVersion?.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedVersion && !selectedVersion.isActive && (
              <button
                onClick={handleSetActiveClick}
                className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
              >
                Set Active
              </button>
            )}
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Version notes..."
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground border-b border-white/10 pb-2 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>

        {/* Prompt */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">Prompt</span>
            <span className="text-xs text-muted-foreground">
              {formData.systemPrompt.length}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            {pendingEdit ? (
              <PromptInlineReviewer
                original={pendingEdit.original}
                modified={pendingEdit.modified}
                onApply={pendingEdit.onApply}
                onCancel={pendingEdit.onCancel}
              />
            ) : (
              <CodeEditor
                value={formData.systemPrompt}
                onChange={(value) => updateField("systemPrompt", value)}
                placeholder="Enter your prompt..."
                className="h-full focus-within:ring-1 focus-within:ring-white/10 transition-all"
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-white/5 flex-shrink-0">
          {hasChanges && (
            <button
              onClick={() => {
                if (selectedVersion) {
                  setFormData({
                    systemPrompt: selectedVersion.systemPrompt,
                    description: selectedVersion.description ?? "",
                  });
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !formData.systemPrompt.trim() || (selectedVersion && !hasChanges)}
            className="px-4 py-1.5 bg-white text-black text-xs font-medium rounded-md hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Saving..." : selectedVersion ? "Update" : "Create"}
          </button>
        </div>
      </div>

      {/* Fullscreen Editor Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div>
              <h2 className="text-base font-medium text-foreground">
                {prompt?.name} — {selectedVersion ? `v${selectedVersion.versionNumber}` : "New"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formData.systemPrompt.length} characters
              </p>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
            <CodeEditor
              value={formData.systemPrompt}
              onChange={(value) => updateField("systemPrompt", value)}
              placeholder="Enter your prompt..."
              className="h-full border-white/20"
              isFullscreen={true}
            />
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmationDialog
        isOpen={showSetActiveConfirm}
        onClose={() => setShowSetActiveConfirm(false)}
        onConfirm={handleConfirmSetActive}
        title="Set Active Version"
        description={`Are you sure you want to set version ${selectedVersion?.versionNumber} as the active version? This will make it the default version used for this prompt.`}
        confirmText="Set Active"
        isLoading={isSettingActive}
      />
    </>
  );
}
