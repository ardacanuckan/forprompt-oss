"use client";

import { useState, useRef, useEffect, useMemo, useCallback, memo } from "react";
import { useUser, useOrganization, useOrganizationList, CreateOrganization, OrganizationProfile, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@forprompt/ui";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { usePolar } from "~/providers/PolarProvider";
import { usePaywall } from "~/providers/PaywallProvider";
import { useAnalytics } from "~/hooks/useAnalytics";

// Sidebar size constants
const SIDEBAR_WIDTH = 210;
const SIDEBAR_COLLAPSED_WIDTH = 60;
const COLLAPSE_THRESHOLD = 120; // Drag below this to collapse

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  selectedProjectId: Id<"projects"> | null;
  onProjectChange: (projectId: Id<"projects"> | null) => void;
  selectedPromptId: Id<"prompts"> | null;
  onPromptSelect: (promptId: Id<"prompts"> | null) => void;
}

// Helper component to show prompt with name and ID - memoized to prevent re-renders when parent updates
const PromptListItem = memo(function PromptListItem({ prompt, isSelected, onClick }: {
  prompt: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 pl-2.5 pr-8 py-1.5 rounded-md transition-colors text-left relative",
        isSelected
          ? "bg-sidebar-active text-text-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
      )}
    >
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-medium truncate">{prompt.name}</span>
        <code className="text-xs text-text-tertiary font-mono truncate">{prompt.key}</code>
      </div>
      {isSelected && (
        <span className="material-symbols-outlined text-[16px] text-text-primary flex-shrink-0 absolute right-2">
          check
        </span>
      )}
    </button>
  );
});

export function Sidebar({
  activeView,
  onViewChange,
  selectedProjectId,
  onProjectChange,
  selectedPromptId,
  onPromptSelect
}: SidebarProps) {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  const clerk = useClerk();
  const router = useRouter();
  const sidebarRef = useRef<HTMLElement>(null);
  const { currentTier } = usePolar();
  const { openPaywall } = usePaywall();
  const { trackPromptCreated } = useAnalytics();

  // Tier limits for project and prompt creation
  const tierLimits = {
    free: { maxProjects: 1, maxPrompts: 5 },
    pro: { maxProjects: 10, maxPrompts: 100 },
    enterprise: { maxProjects: -1, maxPrompts: -1 }, // -1 = unlimited
  };
  const limits = tierLimits[currentTier] || tierLimits.free;

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      return saved === 'true';
    }
    return false;
  });

  // Drag to collapse
  const [isDragging, setIsDragging] = useState(false);

  const startDragging = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const stopDragging = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrag = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    // Collapse if dragged past threshold
    if (e.clientX < COLLAPSE_THRESHOLD) {
      setIsCollapsed(true);
    } else if (e.clientX > COLLAPSE_THRESHOLD) {
      setIsCollapsed(false);
    }
  }, [isDragging]);

  // Mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', stopDragging);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', stopDragging);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleDrag, stopDragging]);

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
  }, [isCollapsed]);

  // Calculate if we're in compact mode (narrow but not collapsed)
  const isCompact = !isCollapsed && SIDEBAR_WIDTH < 220;

  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showSwitchWorkspace, setShowSwitchWorkspace] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [isClosingProjectModal, setIsClosingProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectSlug, setNewProjectSlug] = useState("");
  const [projectDropdownPosition, setProjectDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [promptDropdownPosition, setPromptDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [promptSearchQuery, setPromptSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const orgButtonRef = useRef<HTMLButtonElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const projectButtonRef = useRef<HTMLButtonElement>(null);
  const promptDropdownRef = useRef<HTMLDivElement>(null);
  const promptButtonRef = useRef<HTMLButtonElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);

  // Get the Convex organization from Clerk org
  const convexOrg = useQuery(
    api.domains.organizations.queries.getByClerkId,
    organization?.id ? { clerkId: organization.id } : "skip"
  ) as { _id: Id<"organizations"> } | undefined | null;

  // Get projects for current organization
  const projects = useQuery(
    api.domains.projects.queries.list,
    convexOrg?._id ? { orgId: convexOrg._id } : "skip"
  ) as Array<{ _id: Id<"projects">; name: string; slug: string }> | undefined;

  // Get prompts for selected project
  const prompts = useQuery(
    api.domains.promptOrchestrator.queries.list,
    selectedProjectId ? { projectId: selectedProjectId } : "skip"
  ) as Array<{ _id: Id<"prompts">; key: string; name: string; activeVersion: any; versionCount: number }> | undefined;

  // Get total prompt count for org (for limit checking)
  const orgPromptCount = useQuery(
    api.domains.promptOrchestrator.queries.countByOrg,
    convexOrg?._id ? { orgId: convexOrg._id } : "skip"
  ) as number | undefined;

  // Filter prompts based on search query
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    if (!promptSearchQuery.trim()) return prompts;
    
    const query = promptSearchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.key.toLowerCase().includes(query)
    );
  }, [prompts, promptSearchQuery]);

  const createProject = useMutation(api.domains.projects.mutations.create);
  const createPrompt = useMutation(api.domains.promptOrchestrator.mutations.create);
  
  const [showCreatePrompt, setShowCreatePrompt] = useState(false);
  const [isClosingPromptModal, setIsClosingPromptModal] = useState(false);
  const [newPromptKey, setNewPromptKey] = useState("");
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptDescription, setNewPromptDescription] = useState("");

  const closePromptModal = useCallback(() => {
    setIsClosingPromptModal(true);
    setTimeout(() => {
      setShowCreatePrompt(false);
      setIsClosingPromptModal(false);
      setNewPromptKey("");
      setNewPromptName("");
      setNewPromptDescription("");
    }, 200); // Match animation duration
  }, []);

  const handleCreatePrompt = async () => {
    if (!selectedProjectId || !newPromptKey.trim() || !newPromptName.trim()) return;

    try {
      const promptId = await createPrompt({
        projectId: selectedProjectId,
        key: newPromptKey.trim(),
        name: newPromptName.trim(),
        description: newPromptDescription.trim() || undefined,
      });
      trackPromptCreated(promptId, newPromptKey.trim(), selectedProjectId);
      
      // Close modal with animation first
      setIsClosingPromptModal(true);
      setTimeout(() => {
        setShowCreatePrompt(false);
        setIsClosingPromptModal(false);
        setNewPromptKey("");
        setNewPromptName("");
        setNewPromptDescription("");
        
        // Select prompt after modal is closed for smooth transition
        onPromptSelect(promptId);
      }, 200); // Match animation duration
    } catch (error: any) {
      alert(`Failed to create prompt: ${error.message}`);
    }
  };

  interface NavigationItem {
    id: string;
    label: string;
    icon: string;
    weight?: string;
    filled?: boolean;
    count?: number | string;
  }

  const navigationItems: NavigationItem[] = [
    { id: "configuration", label: "Configuration", icon: "tune", weight: "300" },
    { id: "prompts", label: "Versions", icon: "terminal", filled: true },
    { id: "editor", label: "Editor", icon: "edit_note", weight: "300" },
    { id: "logs", label: "Logs", icon: "history", weight: "300" },
    { id: "analysis", label: "Analysis", icon: "analytics", weight: "300" },
    ...(selectedPromptId ? [{ id: "prompt-settings", label: "Prompt Settings", icon: "tune", weight: "300" }] : []),
    { id: "settings", label: "Project Settings", icon: "settings", weight: "300" },
  ];

  // Auto-select first project when projects load (only if no project is selected from URL)
  useEffect(() => {
    // Only auto-select if we have projects and no project is currently selected
    // The parent (PromptWorkspace) handles URL persistence
    if (projects && projects.length > 0 && !selectedProjectId) {
      onProjectChange(projects[0]._id);
    }
  }, [projects, selectedProjectId, onProjectChange]);

  const closeProjectModal = useCallback(() => {
    setIsClosingProjectModal(true);
    setTimeout(() => {
      setShowCreateProject(false);
      setIsClosingProjectModal(false);
      setNewProjectName("");
      setNewProjectSlug("");
    }, 200); // Match animation duration
  }, []);

  const handleCreateProject = async () => {
    if (!convexOrg?._id || !newProjectName.trim()) return;
    
    try {
      const slug = newProjectSlug.trim() || newProjectName.toLowerCase().replace(/\s+/g, "-");
      const projectId = await createProject({
        orgId: convexOrg._id,
        name: newProjectName.trim(),
        slug,
      });
      
      // Close modal with animation first
      setIsClosingProjectModal(true);
      setTimeout(() => {
        setShowCreateProject(false);
        setIsClosingProjectModal(false);
        setNewProjectName("");
        setNewProjectSlug("");
        
        // Select project after modal is closed for smooth transition
        onProjectChange(projectId);
      }, 200); // Match animation duration
    } catch (error: any) {
      alert(`Failed to create project: ${error.message}`);
    }
  };

  const selectedProject = projects?.find(p => p._id === selectedProjectId);
  const selectedPrompt = prompts?.find(p => p._id === selectedPromptId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (dropdownRef.current && !dropdownRef.current.contains(target) &&
          orgButtonRef.current && !orgButtonRef.current.contains(target) &&
          submenuRef.current && !submenuRef.current.contains(target)) {
        setShowOrgDropdown(false);
        setShowSwitchWorkspace(false);
      }

      if (projectDropdownRef.current && !projectDropdownRef.current.contains(target) &&
          projectButtonRef.current && !projectButtonRef.current.contains(target)) {
        setShowProjectDropdown(false);
      }

      if (promptDropdownRef.current && !promptDropdownRef.current.contains(target) &&
          promptButtonRef.current && !promptButtonRef.current.contains(target)) {
        setShowPromptDropdown(false);
      }
    }

    if (showOrgDropdown || showProjectDropdown || showPromptDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOrgDropdown, showProjectDropdown, showPromptDropdown]);

  const handleSelectOrganization = async (orgId: string) => {
    if (!isLoaded) return;
    
    try {
      await clerk.setActive({ organization: orgId });
      setShowOrgDropdown(false);
      
      // Small delay to ensure Clerk processes the change
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force a full page reload to ensure all components reflect the new state
      window.location.reload();
    } catch (error) {
      console.error("Error switching organization:", error);
    }
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "flex flex-col border-r border-sidebar-border bg-sidebar-bg flex-shrink-0 relative z-10 group select-none",
          isDragging ? "" : "transition-all duration-200"
        )}
        style={{
          width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        }}
      >
        {/* Drag Handle - for collapse/expand */}
        <div
          onMouseDown={startDragging}
          className={cn(
            "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20 transition-colors",
            "hover:bg-white/10",
            isDragging && "bg-white/20"
          )}
        />

        {/* Expand Button - only when collapsed */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3 top-6 z-20 size-6 rounded-full bg-sidebar-bg border border-sidebar-border hover:bg-sidebar-hover hover:border-gray-600 transition-all flex items-center justify-center shadow-lg"
            title="Expand sidebar"
          >
            <span className="material-symbols-outlined text-[14px] text-text-secondary">
              chevron_right
            </span>
          </button>
        )}

        {/* Organization Header with Switcher */}
        <div className={cn(
          "flex flex-col transition-all",
          isCollapsed ? "px-2 py-4" : "px-3 py-4"
        )}>
          <button
            ref={orgButtonRef}
            onClick={() => { setShowOrgDropdown(!showOrgDropdown); setShowSwitchWorkspace(false); }}
            className={cn(
              "flex items-center group cursor-pointer hover:bg-sidebar-hover rounded-md transition-colors w-full",
              isCollapsed ? "justify-center px-0 py-1.5" : "gap-2 px-2 py-1.5"
            )}
          >
            {organization?.imageUrl ? (
              <img
                src={organization.imageUrl}
                alt={organization.name || "Organization"}
                className={cn(
                  "rounded bg-gray-800 border border-gray-700 object-cover flex-shrink-0",
                  isCollapsed ? "size-8" : isCompact ? "size-7" : "size-8"
                )}
              />
            ) : (
              <div className={cn(
                "relative flex items-center justify-center rounded bg-gray-800 text-gray-200 border border-gray-700 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex-shrink-0",
                isCollapsed ? "size-8" : isCompact ? "size-7" : "size-8"
              )}>
                <span className={cn(
                  "material-symbols-outlined",
                  isCompact ? "text-[16px]" : "text-[18px]"
                )}>
                  {organization ? "corporate_fare" : "person"}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                <h1 className={cn(
                  "font-medium leading-none text-text-primary truncate",
                  isCompact ? "text-sm" : "text-base"
                )}>
                  {organization?.name || user?.firstName || "Personal"}
                </h1>
                <span className="material-symbols-outlined text-text-tertiary text-[14px]">expand_more</span>
              </div>
            )}
          </button>

          {/* Subscription Tier Badge */}
          {!isCollapsed ? (
            <div className="mt-2 px-2">
              <span className="text-[10px] font-medium text-text-tertiary uppercase tracking-wider">
                {currentTier} plan
              </span>
            </div>
          ) : (
            <div className="flex justify-center mt-1">
              <span 
                className="text-[9px] font-medium text-text-tertiary uppercase tracking-wider"
                title={`${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} Plan`}
              >
                {currentTier.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Project Selector */}
      {!isCollapsed && (
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <label className={cn(
            "font-medium text-text-secondary uppercase tracking-wider",
            isCompact ? "text-[10px]" : "text-xs"
          )}>
            Project
          </label>
          <button
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="New Project"
            onClick={() => {
              const projectCount = projects?.length || 0;
              if (limits.maxProjects !== -1 && projectCount >= limits.maxProjects) {
                openPaywall({
                  highlightTier: "pro",
                  reason: `You've reached the limit of ${limits.maxProjects} project${limits.maxProjects === 1 ? '' : 's'} on the ${currentTier} plan. Upgrade to create more projects.`,
                });
                return;
              }
              setShowCreateProject(true);
            }}
          >
            <span className={cn("material-symbols-outlined", isCompact ? "text-[14px]" : "text-[16px]")}>add</span>
          </button>
        </div>
        <div className="relative">
          <button
            ref={projectButtonRef}
            onClick={() => {
              if (showProjectDropdown) {
                setShowProjectDropdown(false);
              } else {
                if (projectButtonRef.current) {
                  const rect = projectButtonRef.current.getBoundingClientRect();
                  setProjectDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width
                  });
                }
                setShowProjectDropdown(true);
              }
            }}
            className={cn(
              "w-full bg-transparent border border-sidebar-border hover:border-gray-600 hover:bg-sidebar-hover text-text-primary rounded-md focus:outline-none focus:border-gray-500 focus:bg-sidebar-active cursor-pointer transition-all flex items-center justify-between",
              isCompact ? "text-sm pl-2 pr-6 py-1" : "text-base pl-2.5 pr-8 py-1.5"
            )}
          >
            <span className="truncate">
              {selectedProject?.name || "Select a project"}
            </span>
            <span className={cn(
              "material-symbols-outlined text-text-secondary absolute right-1.5 pointer-events-none",
              isCompact ? "text-[16px]" : "text-[18px]"
            )}>
              expand_more
            </span>
          </button>
        </div>
      </div>
      )}

      {/* Prompt Selector */}
      {!isCollapsed && selectedProjectId && (
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <label className={cn(
              "font-medium text-text-secondary uppercase tracking-wider",
              isCompact ? "text-[10px]" : "text-xs"
            )}>
              Prompt
            </label>
            <button
              className="text-text-secondary hover:text-text-primary transition-colors"
              title="New Prompt"
              onClick={() => {
                const promptCount = prompts?.length || 0;
                if (limits.maxPrompts !== -1 && promptCount >= limits.maxPrompts) {
                  openPaywall({
                    highlightTier: "pro",
                    reason: `You've reached the limit of ${limits.maxPrompts} prompts on the ${currentTier} plan. Upgrade to create more prompts.`,
                  });
                  return;
                }
                setShowCreatePrompt(true);
              }}
            >
              <span className={cn("material-symbols-outlined", isCompact ? "text-[14px]" : "text-[16px]")}>add</span>
            </button>
          </div>
          <div className="relative">
            <button
              ref={promptButtonRef}
              onClick={() => {
                if (showPromptDropdown) {
                  setShowPromptDropdown(false);
                  setPromptSearchQuery("");
                } else {
                  if (promptButtonRef.current) {
                    const rect = promptButtonRef.current.getBoundingClientRect();
                    setPromptDropdownPosition({
                      top: rect.bottom + 4,
                      left: rect.left,
                      width: rect.width
                    });
                  }
                  setPromptSearchQuery("");
                  setShowPromptDropdown(true);
                }
              }}
              className={cn(
                "w-full bg-transparent border border-sidebar-border hover:border-gray-600 hover:bg-sidebar-hover text-text-primary rounded-md focus:outline-none focus:border-gray-500 focus:bg-sidebar-active cursor-pointer transition-all flex items-center justify-between",
                isCompact ? "text-sm pl-2 pr-6 py-1" : "text-base pl-2.5 pr-8 py-1.5"
              )}
            >
              <span className="truncate">
                {selectedPrompt?.name || "Select a prompt"}
              </span>
              <span className={cn(
                "material-symbols-outlined text-text-secondary absolute right-1.5 pointer-events-none",
                isCompact ? "text-[16px]" : "text-[18px]"
              )}>
                expand_more
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 flex flex-col gap-0.5 overflow-y-auto sidebar-scroll transition-all",
        isCollapsed ? "px-1.5 py-2" : "px-2 py-2"
      )}>
        {navigationItems.map((item) => {
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex items-center rounded-md font-medium transition-all group relative",
                isCollapsed ? "justify-center px-0 py-2" : isCompact ? "gap-2 px-2 py-1.5" : "gap-2.5 px-2.5 py-1.5",
                isCompact ? "text-sm" : "text-base",
                isActive
                  ? "bg-sidebar-active text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                  : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <span
                className={cn(
                  "material-symbols-outlined transition-colors flex-shrink-0",
                  isCompact ? "text-[18px]" : "text-[20px]",
                  isActive ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
                )}
                style={{
                  fontVariationSettings: item.filled && isActive ? "'FILL' 1" : `'wght' ${item.weight || 400}`,
                }}
              >
                {item.icon}
              </span>
              {!isCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {item.count && !isCompact && (
                    <span className="ml-auto text-text-primary text-xs font-semibold bg-gray-700 px-1.5 rounded border border-gray-600 flex-shrink-0">
                      {item.count}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}

      </nav>

      {/* Upgrade Banner - Show only for free tier */}
      {currentTier === "free" && !isCollapsed && (
        <div className="px-2 py-2">
          <button
            onClick={() => openPaywall({
              highlightTier: "pro",
              reason: "Unlock AI editing, conversation analysis, and more features"
            })}
            className="w-full group rounded-lg bg-white/5 border border-white/10 p-3 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex-shrink-0 w-7 h-7 rounded-md bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[16px] text-white/60">
                  bolt
                </span>
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-text-primary">Upgrade</p>
                <p className="text-xs text-text-tertiary truncate">Unlock all features</p>
              </div>
              <span className="material-symbols-outlined text-[14px] text-white/40 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all">
                arrow_forward
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Collapsed upgrade icon */}
      {currentTier === "free" && isCollapsed && (
        <div className="px-1.5 py-2 flex justify-center">
          <button
            onClick={() => openPaywall({ highlightTier: "pro" })}
            className="w-9 h-9 rounded-md bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all"
            title="Upgrade to Pro"
          >
            <span className="material-symbols-outlined text-[16px] text-white/50">
              bolt
            </span>
          </button>
        </div>
      )}

      {/* Docs Link */}
      <div className={cn(
        "mt-auto border-t border-sidebar-border",
        isCollapsed ? "px-1.5 py-2" : "px-2 py-2"
      )}>
        <a
          href="https://forprompt.dev/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors rounded-md",
            isCollapsed ? "justify-center p-2" : "px-2 py-1.5"
          )}
          title={isCollapsed ? "Documentation" : undefined}
        >
          <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'wght' 300" }}>
            menu_book
          </span>
          {!isCollapsed && <span className="text-sm">Docs</span>}
        </a>
      </div>
      </aside>

      {/* Project Dropdown - Rendered outside sidebar for proper z-index */}
      {showProjectDropdown && (
        <div
          ref={projectDropdownRef}
          className="fixed bg-sidebar-bg border border-sidebar-border rounded shadow-lg z-[60] overflow-hidden flex flex-col py-0.5"
          style={{ 
            left: `${projectDropdownPosition.left}px`,
            top: `${projectDropdownPosition.top}px`,
            width: `${projectDropdownPosition.width}px`,
            maxHeight: '240px'
          }}
        >
          <div className="overflow-y-auto sidebar-scroll flex-1">
            {!projects || projects.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-text-secondary text-xs">
                No projects yet
              </div>
            ) : (
              projects.map((project) => (
                <button
                  key={project._id}
                  onClick={() => {
                    onProjectChange(project._id);
                    setShowProjectDropdown(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 text-xs text-left",
                    selectedProjectId === project._id
                      ? "text-text-primary bg-sidebar-active"
                      : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  {selectedProjectId === project._id && <span className="text-[10px]">✓</span>}
                </button>
              ))
            )}
          </div>
          <div className="border-t border-content-border my-0.5" />
          <button
            onClick={() => {
              setShowProjectDropdown(false);
              const projectCount = projects?.length || 0;
              if (limits.maxProjects !== -1 && projectCount >= limits.maxProjects) {
                openPaywall({
                  highlightTier: "pro",
                  reason: `You've reached the limit of ${limits.maxProjects} project${limits.maxProjects === 1 ? '' : 's'} on the ${currentTier} plan. Upgrade to create more projects.`,
                });
                return;
              }
              setShowCreateProject(true);
            }}
            className="w-full px-2.5 py-1 text-xs text-text-primary hover:bg-sidebar-hover text-left"
          >
            + New project
          </button>
        </div>
      )}

      {/* Prompt Dropdown - Rendered outside sidebar for proper z-index */}
      {showPromptDropdown && (
        <div
          ref={promptDropdownRef}
          className="fixed bg-sidebar-bg border border-sidebar-border rounded shadow-lg z-[60] overflow-hidden flex flex-col py-0.5"
          style={{ 
            left: `${promptDropdownPosition.left}px`,
            top: `${promptDropdownPosition.top}px`,
            width: `${promptDropdownPosition.width}px`,
            maxHeight: '240px'
          }}
        >
          {/* Search Input */}
          <div className="px-2.5 py-1.5 border-b border-content-border">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-text-tertiary">
                search
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 h-7 text-xs bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded focus:outline-none focus:border-gray-500"
                autoFocus
              />
            </div>
          </div>

          {/* Prompt List */}
          <div className="flex-1 overflow-y-auto sidebar-scroll">
            {!prompts || prompts.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-text-secondary text-xs">
                No prompts yet
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="px-2.5 py-3 text-center text-text-secondary text-xs">
                No prompts found
              </div>
            ) : (
              filteredPrompts.map((prompt) => (
                <button
                  key={prompt._id}
                  onClick={() => {
                    onPromptSelect(prompt._id);
                    setShowPromptDropdown(false);
                    setPromptSearchQuery("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 text-xs text-left",
                    selectedPromptId === prompt._id
                      ? "text-text-primary bg-sidebar-active"
                      : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
                  )}
                >
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="truncate">{prompt.name}</span>
                    <code className="text-[10px] text-text-tertiary font-mono truncate">{prompt.key}</code>
                  </div>
                  {selectedPromptId === prompt._id && <span className="text-[10px] ml-2 flex-shrink-0">✓</span>}
                </button>
              ))
            )}
          </div>

          {/* Create Button */}
          <div className="border-t border-content-border my-0.5" />
          <button
            onClick={() => {
              setShowPromptDropdown(false);
              setPromptSearchQuery("");
              // Use org-wide prompt count for limit checking
              const promptCount = orgPromptCount ?? 0;
              if (limits.maxPrompts !== -1 && promptCount >= limits.maxPrompts) {
                openPaywall({
                  highlightTier: "pro",
                  reason: `You've reached the limit of ${limits.maxPrompts} prompts on the ${currentTier} plan. Upgrade to create more prompts.`,
                });
                return;
              }
              setShowCreatePrompt(true);
            }}
            className="w-full px-2.5 py-1 text-xs text-text-primary hover:bg-sidebar-hover text-left"
          >
            + New prompt
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div 
          className={cn(
            "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in",
            isClosingProjectModal ? "opacity-0" : "opacity-100"
          )}
          onClick={closeProjectModal}
        >
          <div 
            className={cn(
              "bg-sidebar-bg rounded-lg shadow-2xl border border-sidebar-border overflow-hidden w-full max-w-md transition-all duration-200 animate-in zoom-in-95",
              isClosingProjectModal ? "scale-95 opacity-0" : "scale-100 opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Customer Support Bot"
                    className="w-full bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Slug (optional)
                  </label>
                  <input
                    type="text"
                    value={newProjectSlug}
                    onChange={(e) => setNewProjectSlug(e.target.value)}
                    placeholder="customer-support-bot"
                    className="w-full bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Leave empty to auto-generate from name
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closeProjectModal}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-white text-gray-900 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Prompt Modal */}
      {showCreatePrompt && (
        <div 
          className={cn(
            "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity duration-200 animate-in fade-in",
            isClosingPromptModal ? "opacity-0" : "opacity-100"
          )}
          onClick={closePromptModal}
        >
          <div 
            className={cn(
              "bg-sidebar-bg rounded-lg shadow-2xl border border-sidebar-border overflow-hidden w-full max-w-md transition-all duration-200 animate-in zoom-in-95",
              isClosingPromptModal ? "scale-95 opacity-0" : "scale-100 opacity-100"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">Create New Prompt</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Prompt Key *
                  </label>
                  <input
                    type="text"
                    value={newPromptKey}
                    onChange={(e) => setNewPromptKey(e.target.value)}
                    placeholder="e.g., userContextGeneration"
                    className="w-full bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-gray-500"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    Unique identifier (alphanumeric, no spaces)
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g., User Context Generation"
                    className="w-full bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newPromptDescription}
                    onChange={(e) => setNewPromptDescription(e.target.value)}
                    placeholder="What does this prompt do?"
                    className="w-full bg-transparent border border-content-border text-text-primary placeholder:text-text-tertiary rounded-md px-3 py-2 text-sm focus:outline-none focus:border-gray-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={closePromptModal}
                  className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePrompt}
                  disabled={!newPromptKey.trim() || !newPromptName.trim()}
                  className="px-4 py-2 text-sm font-medium bg-gray-100 hover:bg-white text-gray-900 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Dropdown */}
      {showOrgDropdown && (
        <div
          ref={dropdownRef}
          className="fixed left-3 w-40 bg-sidebar-bg border border-sidebar-border rounded shadow-lg z-[60] py-0.5"
          style={{ top: '72px' }}
        >
          <button
            onClick={() => { setShowOrgDropdown(false); router.push("/settings"); }}
            className="w-full px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-hover text-left"
          >
            Settings
          </button>
          <button
            onClick={() => { setShowOrgDropdown(false); router.push("/settings"); }}
            className="w-full px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-hover text-left"
          >
            Manage members
          </button>
          <div className="border-t border-content-border my-0.5" />
          <button
            onClick={() => setShowSwitchWorkspace(!showSwitchWorkspace)}
            className="w-full flex items-center justify-between px-2.5 py-1 text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-hover text-left"
          >
            Switch workspace
            <span className="text-[10px]">›</span>
          </button>
          <div className="border-t border-content-border my-0.5" />
          <button
            onClick={() => { setShowOrgDropdown(false); clerk.signOut(); }}
            className="w-full px-2.5 py-1 text-xs text-text-secondary hover:text-red-400 text-left"
          >
            Log out
          </button>
        </div>
      )}

      {/* Switch Workspace Submenu */}
      {showOrgDropdown && showSwitchWorkspace && (
        <div
          ref={submenuRef}
          className="fixed left-[172px] w-44 bg-sidebar-bg border border-sidebar-border rounded shadow-lg z-[61] py-0.5"
          style={{ top: '108px' }}
        >
          {isLoaded && userMemberships.data?.map(({ organization: org }) => (
            <button
              key={org.id}
              onClick={() => handleSelectOrganization(org.id)}
              className={cn(
                "w-full flex items-center justify-between px-2.5 py-1 text-xs text-left",
                organization?.id === org.id
                  ? "text-text-primary bg-sidebar-active"
                  : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover"
              )}
            >
              <span className="truncate">{org.name}</span>
              {organization?.id === org.id && <span className="text-[10px]">✓</span>}
            </button>
          ))}
          <div className="border-t border-content-border my-0.5" />
          <button
            onClick={() => { setShowOrgDropdown(false); setShowSwitchWorkspace(false); setShowCreateOrg(true); }}
            className="w-full px-2.5 py-1 text-xs text-text-tertiary hover:text-text-primary hover:bg-sidebar-hover text-left"
          >
            + New workspace
          </button>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={() => setShowCreateOrg(false)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCreateOrg(false)}
              className="absolute -top-3 -right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-text-primary transition-colors z-10 shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <div className="bg-sidebar-bg rounded-lg shadow-2xl border border-sidebar-border overflow-hidden">
              <CreateOrganization
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-sidebar-bg border-0 shadow-none p-8 w-full min-w-[400px] max-w-[450px]",
                    headerTitle: "text-text-primary text-2xl font-semibold",
                    headerSubtitle: "text-text-secondary text-sm mt-2",
                    formButtonPrimary: "bg-gray-100 hover:bg-white text-gray-900 font-medium px-4 py-2 rounded-md transition-colors shadow-sm",
                    formButtonReset: "border border-content-border text-text-primary hover:bg-sidebar-hover font-medium px-4 py-2 rounded-md transition-colors",
                    formFieldInput: "bg-transparent border-content-border text-text-primary placeholder:text-text-tertiary rounded-md",
                    formFieldLabel: "text-text-secondary text-sm font-medium mb-1.5",
                    formFieldInputShowPasswordButton: "text-text-secondary hover:text-text-primary",
                    identityPreviewEditButton: "text-text-secondary hover:text-text-primary",
                    footerActionLink: "text-text-primary hover:text-white",
                    footer: "hidden",
                  },
                }}
                afterCreateOrganizationUrl="/"
                skipInvitationScreen
              />
            </div>
          </div>
        </div>
      )}

    </>
  );
}

