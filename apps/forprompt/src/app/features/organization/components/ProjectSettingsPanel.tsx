"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useOrganization, useOrganizationList, OrganizationProfile, CreateOrganization, useClerk } from "@clerk/nextjs";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import type { Id } from "~/convex/_generated/dataModel";
import { Button } from "@forprompt/ui/button";
import { Input } from "@forprompt/ui/input";
import { Label } from "@forprompt/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@forprompt/ui/tabs";
import { toast } from "@forprompt/ui/toast";
import { cn } from "@forprompt/ui";
import { ConfirmationDialog } from "@components/ui";
import { useAnalytics } from "~/hooks/useAnalytics";

interface ProjectSettingsPanelProps {
  selectedProjectId?: Id<"projects"> | null;
  selectedPromptId?: Id<"prompts"> | null;
  onProjectDeleted?: () => void;
}

export function ProjectSettingsPanel({ selectedProjectId, selectedPromptId, onProjectDeleted }: ProjectSettingsPanelProps) {
  const { user } = useUser();
  const { organization: activeOrg } = useOrganization();
  const { userMemberships, isLoaded, setActive } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const clerk = useClerk();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("api");
  
  // Dashboard state logic
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Queries
  const prompt = useQuery(
    api.domains.promptOrchestrator.queries.get,
    selectedPromptId ? { promptId: selectedPromptId } : "skip"
  );

  const project = useQuery(
    api.domains.projects.queries.get,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  const projectApiKey = useQuery(
    api.domains.projectApiKeys.queries.getProjectApiKey,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  const fullApiKey = useQuery(
    api.domains.projectApiKeys.queries.getFullProjectApiKey,
    showApiKey && selectedProjectId ? { projectId: selectedProjectId } : "skip"
  );

  // Mutations
  const regenerateApiKey = useMutation(api.domains.projectApiKeys.mutations.regenerateApiKey);
  const generateApiKey = useMutation(api.domains.projectApiKeys.mutations.generateApiKey);
  const deleteProject = useMutation(api.domains.projects.mutations.deleteProject);
  const { trackApiKeyGenerated } = useAnalytics();

  const handleGenerateApiKey = async () => {
    if (!selectedProjectId) return;
    try {
      await generateApiKey({ projectId: selectedProjectId });
      trackApiKeyGenerated(selectedProjectId, true);
      toast("Success", { description: "API key has been generated" });
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to generate API key",
      });
    }
  };

  const handleCopyApiKey = async () => {
    if (fullApiKey?.keyValue) {
      await navigator.clipboard.writeText(fullApiKey.keyValue);
      setCopied(true);
      toast("Copied", { description: "API key copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!selectedProjectId) return;
    try {
      await regenerateApiKey({ projectId: selectedProjectId });
      toast("Success", { description: "API key has been regenerated" });
      setShowApiKey(false);
      setConfirmRegenerate(false);
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to regenerate API key",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!selectedProjectId) return;
    
    try {
      setIsDeleting(true);
      await deleteProject({ projectId: selectedProjectId });
      toast("Success", { description: "Project has been deleted" });
      setConfirmDeleteProject(false);
      onProjectDeleted?.();
    } catch (error) {
      toast("Error", {
        description: error instanceof Error ? error.message : "Failed to delete project",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary mb-1">Project Settings</h2>
          <p className="text-text-secondary text-sm">Manage API keys and prompt information for this project</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start border-b border-content-border rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger 
            value="api" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-400 data-[state=active]:bg-transparent text-text-secondary data-[state=active]:text-text-primary h-10 px-4 py-2"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">key</span>
            Project API Key
          </TabsTrigger>
          <TabsTrigger 
            value="info" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-gray-400 data-[state=active]:bg-transparent text-text-secondary data-[state=active]:text-text-primary h-10 px-4 py-2"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">info</span>
            Prompt Information
          </TabsTrigger>
          <TabsTrigger 
            value="danger" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-500 data-[state=active]:bg-transparent text-text-secondary data-[state=active]:text-red-500 h-10 px-4 py-2"
          >
            <span className="material-symbols-outlined text-[18px] mr-2">warning</span>
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          {selectedProjectId ? (
            <div className="bg-sidebar-bg rounded-lg border border-content-border p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">key</span>
                Project API Key
              </h3>
              
              {projectApiKey ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-text-secondary uppercase tracking-wide mb-2">API Key</div>
                    <div className="flex items-center gap-2">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value={showApiKey ? (fullApiKey?.keyValue || "") : projectApiKey.maskedKey}
                        readOnly
                        className="font-mono text-sm bg-gray-900 border-gray-800"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="border-content-border text-text-primary hover:bg-sidebar-hover flex-shrink-0"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {showApiKey ? "visibility_off" : "visibility"}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyApiKey}
                        disabled={!showApiKey}
                        className="border-content-border text-text-primary hover:bg-sidebar-hover flex-shrink-0"
                        title={showApiKey ? "Copy API key" : "Show API key first to copy"}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {copied ? "check" : "content_copy"}
                        </span>
                      </Button>
                    </div>
                    <p className="text-xs text-text-tertiary mt-2">
                      Keep your API key secure. It provides access to your project.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-content-border">
                    <div className="text-xs text-text-tertiary">
                      Created {new Date(projectApiKey.createdAt).toLocaleDateString()}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmRegenerate(true)}
                      className="border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-800"
                    >
                      <span className="material-symbols-outlined text-[16px] mr-1">refresh</span>
                      Regenerate
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-text-secondary mb-4">No API key exists for this project yet.</p>
                  <Button onClick={handleGenerateApiKey} className="bg-gray-100 hover:bg-white text-gray-900">
                    Generate API Key
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-sidebar-bg rounded-lg border border-content-border p-8 text-center">
              <p className="text-sm text-neutral-500">Select a project to view API keys</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-6">
          {prompt ? (
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
          ) : (
            <div className="bg-sidebar-bg rounded-lg border border-content-border p-8 text-center">
              <p className="text-sm text-neutral-500">Select a prompt to view information</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="danger" className="space-y-6">
          {selectedProjectId ? (
            <div className="bg-sidebar-bg rounded-lg border border-red-900/50 p-6">
              <h3 className="text-lg font-semibold text-red-500 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">warning</span>
                Danger Zone
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-1">Delete this project</h4>
                  <p className="text-sm text-text-secondary mb-4">
                    Once you delete a project, there is no going back. This will permanently delete the project, 
                    all prompts, versions, and API keys associated with it.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDeleteProject(true)}
                    disabled={isDeleting}
                    className="border-red-900/50 text-red-500 hover:bg-red-900/20 hover:border-red-800"
                  >
                    <span className="material-symbols-outlined text-[16px] mr-1">delete</span>
                    Delete Project
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-sidebar-bg rounded-lg border border-content-border p-8 text-center">
              <p className="text-sm text-neutral-500">Select a project to manage danger zone settings</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ConfirmationDialog
        isOpen={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleRegenerateApiKey}
        title="Regenerate API Key"
        description="Are you sure you want to regenerate this API key? Old key will stop working."
        confirmText="Regenerate"
        variant="destructive"
      />

      <ConfirmationDialog
        isOpen={confirmDeleteProject}
        onClose={() => setConfirmDeleteProject(false)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.name}"? This action cannot be undone and will delete all prompts, versions, and API keys.`}
        confirmText="Delete Project"
        variant="destructive"
      />
    </>
  );
}
