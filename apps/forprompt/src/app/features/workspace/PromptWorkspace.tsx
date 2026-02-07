"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { cn } from "@forprompt/ui";

import { Sidebar } from "@components/layout";
import { SplashScreen } from "@components/SplashScreen";
import { OnboardingGuide } from "@components/OnboardingGuide";
import { PromptList } from "./PromptList";
import { EditorWithTools } from "../editor";
import { VersionSelector } from "../versions";
import { PromptInformation } from "../config";
import { ProjectSettingsPanel } from "@features/organization/components/ProjectSettingsPanel";
import { PromptSettingsPanel } from "@features/organization/components/PromptSettingsPanel";
import { LogsList } from "@features/logs/components/LogsList";
import { LogsAnalysis } from "@features/logs/components/LogsAnalysis";
import { Id } from "~/convex/_generated/dataModel";
import { api, useQuery } from "~/convex/ConvexClientProvider";

// Helper to update URL without navigation
function updateURLParams(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, "", url.toString());
}

export function PromptWorkspace() {
  const { user, isLoaded: userLoaded } = useUser();
  const { isLoaded: orgLoaded } = useOrganization();
  const searchParams = useSearchParams();

  // App is ready when user and org are loaded
  const isAppReady = userLoaded && orgLoaded && !!user;

  // Initialize state from URL params
  const [activeView, setActiveView] = useState(() =>
    searchParams.get("view") || "prompts"
  );
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"projects"> | null>(() =>
    (searchParams.get("project") as Id<"projects">) || null
  );
  const [selectedPromptId, setSelectedPromptId] = useState<Id<"prompts"> | null>(() =>
    (searchParams.get("prompt") as Id<"prompts">) || null
  );
  const [selectedVersionId, setSelectedVersionId] = useState<Id<"promptVersions"> | null>(() =>
    (searchParams.get("version") as Id<"promptVersions">) || null
  );
  const [selectedModel, setSelectedModel] = useState("anthropic/claude-3.5-sonnet");

  // Track which prompt the current selectedVersionId belongs to
  const versionPromptRef = useRef<Id<"prompts"> | null>(null);

  // Track if we've initialized from URL to avoid overwriting URL version
  const initializedFromURL = useRef(false);

  // Update URL when state changes
  const handleViewChange = useCallback((view: string) => {
    setActiveView(view);
    updateURLParams({ view });
  }, []);

  const handleProjectChange = useCallback((projectId: Id<"projects"> | null) => {
    setSelectedProjectId(projectId);
    updateURLParams({
      project: projectId,
      prompt: null, // Clear prompt when project changes
      version: null
    });
    setSelectedPromptId(null);
    setSelectedVersionId(null);
    versionPromptRef.current = null;
  }, []);

  const handlePromptSelect = useCallback((promptId: Id<"prompts"> | null) => {
    setSelectedPromptId(promptId);
    updateURLParams({
      prompt: promptId,
      version: null // Will be set by auto-select effect
    });
    // Don't reset versionPromptRef here - let the useEffect handle it
  }, []);

  const handleVersionSelect = useCallback((versionId: Id<"promptVersions"> | null) => {
    setSelectedVersionId(versionId);
    updateURLParams({ version: versionId });
  }, []);

  // Check if selected prompt has versions
  const selectedPrompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    selectedPromptId ? { promptId: selectedPromptId } : "skip"
  );

  // Get all prompts for the project to check existence
  const allPrompts = useQuery(
    api.domains.promptOrchestrator.queries.list,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Check if any prompts exist (not just selected)
  const hasAnyPrompts = allPrompts && allPrompts.length > 0;
  const hasAnyVersions = allPrompts?.some((p: any) => p.versionCount > 0);

  // Auto-select the active version (or latest) when prompt changes
  // But respect URL version on initial load
  useEffect(() => {
    if (selectedPromptId && selectedPrompt) {
      // Only auto-select if we switched to a different prompt
      if (versionPromptRef.current !== selectedPromptId) {
        versionPromptRef.current = selectedPromptId;

        // On initial load, if URL has a version, keep it
        const urlVersion = searchParams.get("version");
        if (!initializedFromURL.current && urlVersion) {
          initializedFromURL.current = true;
          // Verify the version belongs to this prompt
          const versionExists = selectedPrompt.versions?.some(
            (v: { _id: string }) => v._id === urlVersion
          );
          if (versionExists) {
            return; // Keep the URL version
          }
        }

        // If prompt has an active version, select it
        if (selectedPrompt.activeVersionId) {
          handleVersionSelect(selectedPrompt.activeVersionId);
        }
        // Otherwise select the latest version if available
        else if (selectedPrompt.versions && selectedPrompt.versions.length > 0) {
          // Versions are ordered desc by versionNumber, so first is latest
          handleVersionSelect(selectedPrompt.versions[0]._id);
        } else {
          handleVersionSelect(null);
        }
      }
    }
  }, [selectedPromptId, selectedPrompt?.activeVersionId, selectedPrompt?.versions, handleVersionSelect]);

  const isNewPrompt = selectedPrompt && (!selectedPrompt.versions || selectedPrompt.versions.length === 0);

  // Redirect to configuration for new prompts (only if not already in configuration or editor)
  useEffect(() => {
    // Only redirect if user hasn't already chosen a path (configuration or editor)
    if (isNewPrompt && activeView !== "configuration" && activeView !== "editor") {
      // Small delay to let modal close animation finish
      const timer = setTimeout(() => {
        handleViewChange("configuration");
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isNewPrompt, activeView, handleViewChange]);

  // Show splash screen during initialization
  if (!userLoaded || !orgLoaded) {
    return <SplashScreen isReady={false} />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="bg-black/40 rounded-lg p-8 text-center">
          <h2 className="text-lg font-medium text-foreground">Authentication Required</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Please sign in to access the workspace.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SplashScreen isReady={isAppReady} />
      <div className="flex h-screen w-full bg-black">
      {/* Professional Sidebar Navigation */}
      <Sidebar
        activeView={activeView}
        onViewChange={handleViewChange}
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
        selectedPromptId={selectedPromptId}
        onPromptSelect={handlePromptSelect}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden relative">
        {/* Views with fade transitions - all views are rendered but only active is visible */}
        
        {/* Editor View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "editor" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          {selectedPromptId ? (
            <>
              <div className="h-14 px-5 flex items-center justify-between bg-neutral-950 border-b border-neutral-800 flex-shrink-0">
                <span className="text-base font-medium text-neutral-200">Editor</span>
                <VersionSelector
                  promptId={selectedPromptId}
                  selectedVersionId={selectedVersionId}
                  onVersionSelect={handleVersionSelect}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <EditorWithTools
                  promptId={selectedPromptId}
                  selectedVersionId={selectedVersionId}
                  onVersionCreated={handleVersionSelect}
                  selectedModel={selectedModel}
                  onViewChange={handleViewChange}
                />
              </div>
            </>
          ) : (
            <OnboardingGuide
              hasProject={!!selectedProjectId}
              hasPrompt={!!hasAnyPrompts}
              hasVersion={!!hasAnyVersions}
            />
          )}
        </div>

        {/* Prompts/Versions View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "prompts" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <PromptList
                selectedProjectId={selectedProjectId}
                selectedPromptId={selectedPromptId}
              />
            </div>
          </div>
        </div>

        {/* Configuration View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "configuration" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          {selectedPromptId ? (
            <PromptInformation
              promptId={selectedPromptId}
              onViewChange={handleViewChange}
              onVersionCreated={handleVersionSelect}
              isNewPrompt={isNewPrompt ?? false}
            />
          ) : (
            <OnboardingGuide
              hasProject={!!selectedProjectId}
              hasPrompt={!!hasAnyPrompts}
              hasVersion={!!hasAnyVersions}
            />
          )}
        </div>

        {/* Prompt Settings View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "prompt-settings" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <PromptSettingsPanel 
                selectedPromptId={selectedPromptId}
                onPromptDeleted={() => {
                  handlePromptSelect(null);
                  handleViewChange("prompts");
                }}
              />
            </div>
          </div>
        </div>

        {/* Settings View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "settings" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              <ProjectSettingsPanel 
                selectedProjectId={selectedProjectId} 
                selectedPromptId={selectedPromptId}
                onProjectDeleted={() => {
                  handleProjectChange(null);
                  handleViewChange("prompts");
                }}
              />
            </div>
          </div>
        </div>

        {/* Logs View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "logs" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="flex-1 overflow-hidden p-8">
            <LogsList selectedProjectId={selectedProjectId} />
          </div>
        </div>

        {/* Analysis View */}
        <div 
          className={cn(
            "absolute inset-0 flex flex-col overflow-hidden transition-opacity duration-200",
            activeView === "analysis" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
          )}
        >
          <div className="flex-1 overflow-hidden p-8">
            <LogsAnalysis selectedProjectId={selectedProjectId} />
          </div>
        </div>
      </main>
    </div>
    </>
  );
}
