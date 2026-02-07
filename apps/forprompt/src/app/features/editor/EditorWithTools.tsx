"use client";

import { useState, useCallback, useEffect } from "react";
import { Id } from "~/convex/_generated/dataModel";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { PromptEditor } from "./PromptEditor";
import { PromptEditChat } from "./PromptEditChat";
import { EditorToolbar } from "./EditorToolbar";
import { PromptAnalysis, PromptTestChat } from "../testing";
import type { ToolType } from "@/app/types";
import { cn } from "@forprompt/ui";
import { DEFAULT_EDITOR_MODEL } from "@constants/models";

interface EditorWithToolsProps {
  promptId: Id<"prompts">;
  selectedVersionId: Id<"promptVersions"> | null;
  onVersionCreated: (versionId: Id<"promptVersions">) => void;
  selectedModel: string;
  onViewChange?: (view: string) => void;
}

export function EditorWithTools({
  promptId,
  selectedVersionId,
  onVersionCreated,
  selectedModel,
  onViewChange,
}: EditorWithToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [editorKey, setEditorKey] = useState(0);
  // Editor model for AI editing (separate from test model)
  const [editorModel, setEditorModel] = useState(DEFAULT_EDITOR_MODEL);

  // Query current version to get prompt text
  const selectedVersion = useQuery(
    api.domains.promptOrchestrator.models.queries.get,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  ) as { _id: Id<"promptVersions">; systemPrompt: string } | undefined | null;

  const updateVersion = useMutation(api.domains.promptOrchestrator.models.mutations.update);


  // Review State for Inline Editing
  const [reviewState, setReviewState] = useState<{
    original: string;
    modified: string;
    onApply: (finalContent: string) => void;
    onCancel: () => void;
  } | null>(null);

  const handleFixInEditor = () => {
    // Close the analysis panel when user clicks "Fix in Editor"
    setActiveTool(null);
  };

  const handleReviewRequest = useCallback((newPrompt: string) => {
    if (!selectedVersionId || !selectedVersion) return;
    
    // Instead of applying immediately, enter review mode
    setReviewState({
      original: selectedVersion.systemPrompt,
      modified: newPrompt,
      onApply: async (finalContent) => {
        try {
          await updateVersion({
            versionId: selectedVersionId,
            systemPrompt: finalContent,
          });
          setEditorKey(prev => prev + 1);
          setReviewState(null); // Exit review mode
        } catch (error) {
          console.error("Failed to apply edit:", error);
        }
      },
      onCancel: () => {
        setReviewState(null);
      }
    });
  }, [selectedVersionId, selectedVersion, updateVersion]);



  return (
    <div className="flex h-full overflow-hidden">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-black/40 overflow-hidden" data-editor-area="true">
        <PromptEditor
          key={editorKey}
          promptId={promptId}
          selectedVersionId={selectedVersionId}
          onVersionCreated={onVersionCreated}
          pendingEdit={reviewState}
          onViewChange={onViewChange}
        />
      </div>

      {/* Right Toolbar */}
      <EditorToolbar activeTool={activeTool} onToolChange={setActiveTool} />

      {/* Tool Panel - slides in from right */}
      {activeTool && (
        <div
          className={cn(
            "bg-neutral-950 border-l border-neutral-800 transition-all duration-300 ease-out overflow-hidden flex-shrink-0 w-[480px] h-full"
          )}
        >
          {activeTool === "edit" && (
            <div className="w-full h-full overflow-hidden">
              <PromptEditChat
                selectedVersionId={selectedVersionId}
                currentPrompt={selectedVersion?.systemPrompt ?? ""}
                onApplyEdit={handleReviewRequest}
                selectedModel={editorModel}
                onModelChange={setEditorModel}
              />
            </div>
          )}
          {activeTool === "analysis" && (
            <div className="w-full h-full overflow-hidden">
              <PromptAnalysis
                selectedVersionId={selectedVersionId}
                onFixInEditor={handleFixInEditor}
              />
            </div>
          )}
          {activeTool === "test" && (
            <div className="w-full h-full overflow-hidden flex flex-col bg-black/40">
              <PromptTestChat
                selectedVersionId={selectedVersionId}
                selectedModel={selectedModel}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
