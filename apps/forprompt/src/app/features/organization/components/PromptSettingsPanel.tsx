"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import type { Id } from "~/convex/_generated/dataModel";
import { Button } from "@forprompt/ui/button";
import { toast } from "@forprompt/ui/toast";
import { ConfirmationDialog } from "@components/ui";

interface PromptSettingsPanelProps {
  selectedPromptId: Id<"prompts"> | null;
  onPromptDeleted?: () => void;
}

export function PromptSettingsPanel({ selectedPromptId, onPromptDeleted }: PromptSettingsPanelProps) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const prompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    selectedPromptId ? { promptId: selectedPromptId } : "skip"
  );

  // Mutations
  const deletePrompt = useMutation(api.domains.promptOrchestrator.mutations.deletePrompt);

  const handleDeletePrompt = async () => {
    if (!selectedPromptId) return;
    
    try {
      setIsDeleting(true);
      await deletePrompt({ promptId: selectedPromptId });
      toast("Success", { description: "Prompt has been deleted" });
      setConfirmDelete(false);
      onPromptDeleted?.();
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete prompt",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary mb-1">Prompt Settings</h2>
          <p className="text-text-secondary text-sm">Manage settings for this prompt</p>
        </div>
      </div>

      {prompt ? (
        <div className="space-y-6">
          {/* Prompt Information */}
          <div className="bg-sidebar-bg rounded-lg border border-content-border p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">info</span>
              Prompt Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Prompt Name</div>
                  <div className="text-sm font-medium text-text-primary">{prompt.name}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Prompt Key</div>
                  <div className="text-sm font-medium text-text-primary font-mono">{prompt.key}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Prompt ID</div>
                  <div className="text-sm font-medium text-text-primary font-mono break-all">{prompt._id}</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Active Version</div>
                  <div className="text-sm font-medium text-text-primary">
                    {prompt.activeVersion 
                      ? (
                        <span className="flex items-center gap-2">
                          <span className="text-emerald-500">v{prompt.activeVersion.versionNumber}</span>
                          <span className="text-xs text-text-secondary">(Active)</span>
                        </span>
                      )
                      : "No active version"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Total Versions</div>
                  <div className="text-sm font-medium text-text-primary">{prompt.versions?.length || 0}</div>
                </div>
                {prompt.description && (
                  <div>
                    <div className="text-xs text-text-secondary uppercase tracking-wide mb-1">Description</div>
                    <div className="text-sm text-text-secondary">{prompt.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-sidebar-bg rounded-lg border border-red-900/50 p-6">
            <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">warning</span>
              Danger Zone
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-1">Delete this prompt</h4>
                <p className="text-sm text-text-secondary mb-4">
                  Once you delete a prompt, there is no going back. This will permanently delete the prompt and all its versions.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-800"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                  Delete Prompt
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-sidebar-bg rounded-lg border border-content-border p-8 text-center">
          <p className="text-sm text-neutral-500">Select a prompt to view settings</p>
        </div>
      )}

      <ConfirmationDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDeletePrompt}
        title="Delete Prompt"
        description={`Are you sure you want to delete "${prompt?.name}"? This action cannot be undone and will delete all versions.`}
        confirmText="Delete Prompt"
        variant="destructive"
      />
    </>
  );
}
