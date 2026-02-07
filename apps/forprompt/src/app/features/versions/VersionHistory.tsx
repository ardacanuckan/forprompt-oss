"use client";

import { useState } from "react";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";
import { ConfirmationDialog } from "~/app/components/ui";

interface VersionHistoryProps {
  promptId: Id<"prompts">;
  selectedVersionId: Id<"promptVersions"> | null;
  onVersionSelect: (versionId: Id<"promptVersions"> | null) => void;
}

export function VersionHistory({ promptId, selectedVersionId, onVersionSelect }: VersionHistoryProps) {
  const [isSettingActive, setIsSettingActive] = useState<Id<"promptVersions"> | null>(null);
  const [confirmVersionId, setConfirmVersionId] = useState<Id<"promptVersions"> | null>(null);
  
  const setActiveVersion = useMutation(api.domains.promptOrchestrator.mutations.setActiveVersion);
  const prompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    { promptId }
  ) as { 
    _id: Id<"prompts">; 
    key: string; 
    name: string; 
    description?: string; 
    activeVersionId?: Id<"promptVersions">; 
    versions: Array<{
      _id: Id<"promptVersions">;
      versionNumber: number;
      description?: string;
      createdAt: number;
    }>;
  } | undefined | null;

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleSetActiveClick = (versionId: Id<"promptVersions">, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmVersionId(versionId);
  };

  const handleConfirmSetActive = async () => {
    if (!confirmVersionId) return;
    
    setIsSettingActive(confirmVersionId);
    try {
      await setActiveVersion({
        promptId: promptId,
        versionId: confirmVersionId,
      });
      setConfirmVersionId(null);
    } catch (error) {
      console.error("Failed to set active version:", error);
    } finally {
      setIsSettingActive(null);
    }
  };

  const selectedVersionForConfirm = prompt?.versions.find(v => v._id === confirmVersionId);

  if (!prompt) {
    return (
      <div className="bg-black/40 rounded-lg p-6">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 rounded-lg p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-medium text-foreground">{prompt.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">{prompt.key}</p>
        </div>
        <button
          onClick={() => onVersionSelect(null)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          + New
        </button>
      </div>

      {/* Versions */}
      <div className="space-y-1">
        {prompt.versions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No versions yet
          </p>
        ) : (
          prompt.versions.map((version) => {
            const isActive = prompt.activeVersionId === version._id;
            const isSelected = selectedVersionId === version._id;
            
            return (
              <div
                key={version._id}
                className={cn(
                  "group relative w-full rounded-md transition-colors",
                  isSelected
                    ? "bg-white/10"
                    : "hover:bg-white/5"
                )}
              >
                <button
                  onClick={() => onVersionSelect(version._id)}
                  className="w-full text-left px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        v{version.versionNumber}
                      </span>
                      {isActive && (
                        <span className="text-[10px] text-emerald-400">
                          active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>
                  {version.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {version.description}
                    </p>
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
          })
        )}
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

