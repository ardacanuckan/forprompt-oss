"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreateOrganization,
  OrganizationProfile,
  useClerk,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";

import { cn } from "@forprompt/ui";

import { Id } from "~/convex/_generated/dataModel";
import { api, useMutation, useQuery } from "~/convex/ConvexClientProvider";
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
const PromptListItem = memo(function PromptListItem({
  prompt,
  isSelected,
  onClick,
}: {
  prompt: any;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex w-full items-center gap-2 rounded-md py-1.5 pr-8 pl-2.5 text-left transition-colors",
        isSelected
          ? "bg-sidebar-active text-text-primary"
          : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium">{prompt.name}</span>
        <code className="text-text-tertiary truncate font-mono text-xs">
          {prompt.key}
        </code>
      </div>
      {isSelected && (
        <span className="material-symbols-outlined text-text-primary absolute right-2 flex-shrink-0 text-[16px]">
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
  onPromptSelect,
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
  const currentTier = "enterprise" as const;
  const { trackPromptCreated } = useAnalytics();

  const limits = { maxProjects: -1, maxPrompts: -1 };

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved === "true";
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

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      // Collapse if dragged past threshold
      if (e.clientX < COLLAPSE_THRESHOLD) {
        setIsCollapsed(true);
      } else if (e.clientX > COLLAPSE_THRESHOLD) {
        setIsCollapsed(false);
      }
    },
    [isDragging],
  );

  // Mouse event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleDrag);
      document.addEventListener("mouseup", stopDragging);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleDrag);
      document.removeEventListener("mouseup", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging, handleDrag, stopDragging]);

  // Save collapse state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", isCollapsed.toString());
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
  const [projectDropdownPosition, setProjectDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);
  const [promptDropdownPosition, setPromptDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
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
    organization?.id ? { clerkId: organization.id } : "skip",
  ) as { _id: Id<"organizations"> } | undefined | null;

  // Get projects for current organization
  const projects = useQuery(
    api.domains.projects.queries.list,
    convexOrg?._id ? { orgId: convexOrg._id } : "skip",
  ) as Array<{ _id: Id<"projects">; name: string; slug: string }> | undefined;

  // Get prompts for selected project
  const prompts = useQuery(
    api.domains.promptOrchestrator.queries.list,
    selectedProjectId ? { projectId: selectedProjectId } : "skip",
  ) as
    | Array<{
        _id: Id<"prompts">;
        key: string;
        name: string;
        activeVersion: any;
        versionCount: number;
      }>
    | undefined;

  // Get total prompt count for org (for limit checking)
  const orgPromptCount = useQuery(
    api.domains.promptOrchestrator.queries.countByOrg,
    convexOrg?._id ? { orgId: convexOrg._id } : "skip",
  ) as number | undefined;

  // Filter prompts based on search query
  const filteredPrompts = useMemo(() => {
    if (!prompts) return [];
    if (!promptSearchQuery.trim()) return prompts;

    const query = promptSearchQuery.toLowerCase();
    return prompts.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.key.toLowerCase().includes(query),
    );
  }, [prompts, promptSearchQuery]);

  const createProject = useMutation(api.domains.projects.mutations.create);
  const createPrompt = useMutation(
    api.domains.promptOrchestrator.mutations.create,
  );

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
    if (!selectedProjectId || !newPromptKey.trim() || !newPromptName.trim())
      return;

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
    {
      id: "configuration",
      label: "Configuration",
      icon: "tune",
      weight: "300",
    },
    { id: "prompts", label: "Versions", icon: "terminal", filled: true },
    { id: "editor", label: "Editor", icon: "edit_note", weight: "300" },
    { id: "logs", label: "Logs", icon: "history", weight: "300" },
    { id: "analysis", label: "Analysis", icon: "analytics", weight: "300" },
    ...(selectedPromptId
      ? [
          {
            id: "prompt-settings",
            label: "Prompt Settings",
            icon: "tune",
            weight: "300",
          },
        ]
      : []),
    {
      id: "settings",
      label: "Project Settings",
      icon: "settings",
      weight: "300",
    },
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
      const slug =
        newProjectSlug.trim() ||
        newProjectName.toLowerCase().replace(/\s+/g, "-");
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

  const selectedProject = projects?.find((p) => p._id === selectedProjectId);
  const selectedPrompt = prompts?.find((p) => p._id === selectedPromptId);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        orgButtonRef.current &&
        !orgButtonRef.current.contains(target) &&
        submenuRef.current &&
        !submenuRef.current.contains(target)
      ) {
        setShowOrgDropdown(false);
        setShowSwitchWorkspace(false);
      }

      if (
        projectDropdownRef.current &&
        !projectDropdownRef.current.contains(target) &&
        projectButtonRef.current &&
        !projectButtonRef.current.contains(target)
      ) {
        setShowProjectDropdown(false);
      }

      if (
        promptDropdownRef.current &&
        !promptDropdownRef.current.contains(target) &&
        promptButtonRef.current &&
        !promptButtonRef.current.contains(target)
      ) {
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
      await new Promise((resolve) => setTimeout(resolve, 100));

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
          "border-sidebar-border bg-sidebar-bg group relative z-10 flex flex-shrink-0 flex-col border-r select-none",
          isDragging ? "" : "transition-all duration-200",
        )}
        style={{
          width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        }}
      >
        {/* Drag Handle - for collapse/expand */}
        <div
          onMouseDown={startDragging}
          className={cn(
            "absolute top-0 right-0 bottom-0 z-20 w-1 cursor-col-resize transition-colors",
            "hover:bg-white/10",
            isDragging && "bg-white/20",
          )}
        />

        {/* Expand Button - only when collapsed */}
        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(false)}
            className="bg-sidebar-bg border-sidebar-border hover:bg-sidebar-hover absolute top-6 -right-3 z-20 flex size-6 items-center justify-center rounded-full border shadow-lg transition-all hover:border-gray-600"
            title="Expand sidebar"
          >
            <span className="material-symbols-outlined text-text-secondary text-[14px]">
              chevron_right
            </span>
          </button>
        )}

        {/* Organization Header with Switcher */}
        <div
          className={cn(
            "flex flex-col transition-all",
            isCollapsed ? "px-2 py-4" : "px-3 py-4",
          )}
        >
          <button
            ref={orgButtonRef}
            onClick={() => {
              setShowOrgDropdown(!showOrgDropdown);
              setShowSwitchWorkspace(false);
            }}
            className={cn(
              "group hover:bg-sidebar-hover flex w-full cursor-pointer items-center rounded-md transition-colors",
              isCollapsed ? "justify-center px-0 py-1.5" : "gap-2 px-2 py-1.5",
            )}
          >
            {organization?.imageUrl ? (
              <img
                src={organization.imageUrl}
                alt={organization.name || "Organization"}
                className={cn(
                  "flex-shrink-0 rounded border border-gray-700 bg-gray-800 object-cover",
                  isCollapsed ? "size-8" : isCompact ? "size-7" : "size-8",
                )}
              />
            ) : (
              <div
                className={cn(
                  "relative flex flex-shrink-0 items-center justify-center rounded border border-gray-700 bg-gray-800 text-gray-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]",
                  isCollapsed ? "size-8" : isCompact ? "size-7" : "size-8",
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined",
                    isCompact ? "text-[16px]" : "text-[18px]",
                  )}
                >
                  {organization ? "corporate_fare" : "person"}
                </span>
              </div>
            )}
            {!isCollapsed && (
              <div className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                <h1
                  className={cn(
                    "text-text-primary truncate leading-none font-medium",
                    isCompact ? "text-sm" : "text-base",
                  )}
                >
                  {organization?.name || user?.firstName || "Personal"}
                </h1>
                <span className="material-symbols-outlined text-text-tertiary text-[14px]">
                  expand_more
                </span>
              </div>
            )}
          </button>

          {/* Subscription Tier Badge */}
          {!isCollapsed ? (
            <div className="mt-2 px-2">
              <span className="text-text-tertiary text-[10px] font-medium tracking-wider uppercase">
                {currentTier} plan
              </span>
            </div>
          ) : (
            <div className="mt-1 flex justify-center">
              <span
                className="text-text-tertiary text-[9px] font-medium tracking-wider uppercase"
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
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <label
                className={cn(
                  "text-text-secondary font-medium tracking-wider uppercase",
                  isCompact ? "text-[10px]" : "text-xs",
                )}
              >
                Project
              </label>
              <button
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="New Project"
                onClick={() => setShowCreateProject(true)}
              >
                <span
                  className={cn(
                    "material-symbols-outlined",
                    isCompact ? "text-[14px]" : "text-[16px]",
                  )}
                >
                  add
                </span>
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
                      const rect =
                        projectButtonRef.current.getBoundingClientRect();
                      setProjectDropdownPosition({
                        top: rect.bottom + 4,
                        left: rect.left,
                        width: rect.width,
                      });
                    }
                    setShowProjectDropdown(true);
                  }
                }}
                className={cn(
                  "border-sidebar-border hover:bg-sidebar-hover text-text-primary focus:bg-sidebar-active flex w-full cursor-pointer items-center justify-between rounded-md border bg-transparent transition-all hover:border-gray-600 focus:border-gray-500 focus:outline-none",
                  isCompact
                    ? "py-1 pr-6 pl-2 text-sm"
                    : "py-1.5 pr-8 pl-2.5 text-base",
                )}
              >
                <span className="truncate">
                  {selectedProject?.name || "Select a project"}
                </span>
                <span
                  className={cn(
                    "material-symbols-outlined text-text-secondary pointer-events-none absolute right-1.5",
                    isCompact ? "text-[16px]" : "text-[18px]",
                  )}
                >
                  expand_more
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Prompt Selector */}
        {!isCollapsed && selectedProjectId && (
          <div className="px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between px-0.5">
              <label
                className={cn(
                  "text-text-secondary font-medium tracking-wider uppercase",
                  isCompact ? "text-[10px]" : "text-xs",
                )}
              >
                Prompt
              </label>
              <button
                className="text-text-secondary hover:text-text-primary transition-colors"
                title="New Prompt"
                onClick={() => setShowCreatePrompt(true)}
              >
                <span
                  className={cn(
                    "material-symbols-outlined",
                    isCompact ? "text-[14px]" : "text-[16px]",
                  )}
                >
                  add
                </span>
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
                      const rect =
                        promptButtonRef.current.getBoundingClientRect();
                      setPromptDropdownPosition({
                        top: rect.bottom + 4,
                        left: rect.left,
                        width: rect.width,
                      });
                    }
                    setPromptSearchQuery("");
                    setShowPromptDropdown(true);
                  }
                }}
                className={cn(
                  "border-sidebar-border hover:bg-sidebar-hover text-text-primary focus:bg-sidebar-active flex w-full cursor-pointer items-center justify-between rounded-md border bg-transparent transition-all hover:border-gray-600 focus:border-gray-500 focus:outline-none",
                  isCompact
                    ? "py-1 pr-6 pl-2 text-sm"
                    : "py-1.5 pr-8 pl-2.5 text-base",
                )}
              >
                <span className="truncate">
                  {selectedPrompt?.name || "Select a prompt"}
                </span>
                <span
                  className={cn(
                    "material-symbols-outlined text-text-secondary pointer-events-none absolute right-1.5",
                    isCompact ? "text-[16px]" : "text-[18px]",
                  )}
                >
                  expand_more
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav
          className={cn(
            "sidebar-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto transition-all",
            isCollapsed ? "px-1.5 py-2" : "px-2 py-2",
          )}
        >
          {navigationItems.map((item) => {
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "group relative flex items-center rounded-md font-medium transition-all",
                  isCollapsed
                    ? "justify-center px-0 py-2"
                    : isCompact
                      ? "gap-2 px-2 py-1.5"
                      : "gap-2.5 px-2.5 py-1.5",
                  isCompact ? "text-sm" : "text-base",
                  isActive
                    ? "bg-sidebar-active text-text-primary shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                    : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover",
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <span
                  className={cn(
                    "material-symbols-outlined flex-shrink-0 transition-colors",
                    isCompact ? "text-[18px]" : "text-[20px]",
                    isActive
                      ? "text-text-primary"
                      : "text-text-secondary group-hover:text-text-primary",
                  )}
                  style={{
                    fontVariationSettings:
                      item.filled && isActive
                        ? "'FILL' 1"
                        : `'wght' ${item.weight || 400}`,
                  }}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.label}</span>
                    {item.count && !isCompact && (
                      <span className="text-text-primary ml-auto flex-shrink-0 rounded border border-gray-600 bg-gray-700 px-1.5 text-xs font-semibold">
                        {item.count}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Docs Link */}
        <div
          className={cn(
            "border-sidebar-border mt-auto border-t",
            isCollapsed ? "px-1.5 py-2" : "px-2 py-2",
          )}
        >
          <a
            href="https://forprompt.dev/docs"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "text-text-tertiary hover:text-text-primary flex items-center gap-2 rounded-md transition-colors",
              isCollapsed ? "justify-center p-2" : "px-2 py-1.5",
            )}
            title={isCollapsed ? "Documentation" : undefined}
          >
            <span
              className="material-symbols-outlined text-[18px]"
              style={{ fontVariationSettings: "'wght' 300" }}
            >
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
          className="bg-sidebar-bg border-sidebar-border fixed z-[60] flex flex-col overflow-hidden rounded border py-0.5 shadow-lg"
          style={{
            left: `${projectDropdownPosition.left}px`,
            top: `${projectDropdownPosition.top}px`,
            width: `${projectDropdownPosition.width}px`,
            maxHeight: "240px",
          }}
        >
          <div className="sidebar-scroll flex-1 overflow-y-auto">
            {!projects || projects.length === 0 ? (
              <div className="text-text-secondary px-2.5 py-3 text-center text-xs">
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
                    "flex w-full items-center justify-between px-2.5 py-1 text-left text-xs",
                    selectedProjectId === project._id
                      ? "text-text-primary bg-sidebar-active"
                      : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover",
                  )}
                >
                  <span className="truncate">{project.name}</span>
                  {selectedProjectId === project._id && (
                    <span className="text-[10px]">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
          <div className="border-content-border my-0.5 border-t" />
          <button
            onClick={() => {
              setShowProjectDropdown(false);
              setShowCreateProject(true);
            }}
            className="text-text-primary hover:bg-sidebar-hover w-full px-2.5 py-1 text-left text-xs"
          >
            + New project
          </button>
        </div>
      )}

      {/* Prompt Dropdown - Rendered outside sidebar for proper z-index */}
      {showPromptDropdown && (
        <div
          ref={promptDropdownRef}
          className="bg-sidebar-bg border-sidebar-border fixed z-[60] flex flex-col overflow-hidden rounded border py-0.5 shadow-lg"
          style={{
            left: `${promptDropdownPosition.left}px`,
            top: `${promptDropdownPosition.top}px`,
            width: `${promptDropdownPosition.width}px`,
            maxHeight: "240px",
          }}
        >
          {/* Search Input */}
          <div className="border-content-border border-b px-2.5 py-1.5">
            <div className="relative">
              <span className="material-symbols-outlined text-text-tertiary absolute top-1/2 left-2 -translate-y-1/2 text-[14px]">
                search
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
                className="border-content-border text-text-primary placeholder:text-text-tertiary h-7 w-full rounded border bg-transparent pr-2 pl-7 text-xs focus:border-gray-500 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Prompt List */}
          <div className="sidebar-scroll flex-1 overflow-y-auto">
            {!prompts || prompts.length === 0 ? (
              <div className="text-text-secondary px-2.5 py-3 text-center text-xs">
                No prompts yet
              </div>
            ) : filteredPrompts.length === 0 ? (
              <div className="text-text-secondary px-2.5 py-3 text-center text-xs">
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
                    "flex w-full items-center justify-between px-2.5 py-1 text-left text-xs",
                    selectedPromptId === prompt._id
                      ? "text-text-primary bg-sidebar-active"
                      : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover",
                  )}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate">{prompt.name}</span>
                    <code className="text-text-tertiary truncate font-mono text-[10px]">
                      {prompt.key}
                    </code>
                  </div>
                  {selectedPromptId === prompt._id && (
                    <span className="ml-2 flex-shrink-0 text-[10px]">✓</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Create Button */}
          <div className="border-content-border my-0.5 border-t" />
          <button
            onClick={() => {
              setShowPromptDropdown(false);
              setPromptSearchQuery("");
              setShowCreatePrompt(true);
            }}
            className="text-text-primary hover:bg-sidebar-hover w-full px-2.5 py-1 text-left text-xs"
          >
            + New prompt
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div
          className={cn(
            "animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200",
            isClosingProjectModal ? "opacity-0" : "opacity-100",
          )}
          onClick={closeProjectModal}
        >
          <div
            className={cn(
              "bg-sidebar-bg border-sidebar-border animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-lg border shadow-2xl transition-all duration-200",
              isClosingProjectModal
                ? "scale-95 opacity-0"
                : "scale-100 opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-text-primary mb-4 text-lg font-semibold">
                Create New Project
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Project Name
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g., Customer Support Bot"
                    className="border-content-border text-text-primary placeholder:text-text-tertiary w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Slug (optional)
                  </label>
                  <input
                    type="text"
                    value={newProjectSlug}
                    onChange={(e) => setNewProjectSlug(e.target.value)}
                    placeholder="customer-support-bot"
                    className="border-content-border text-text-primary placeholder:text-text-tertiary w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <p className="text-text-tertiary mt-1 text-xs">
                    Leave empty to auto-generate from name
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closeProjectModal}
                  className="text-text-secondary hover:text-text-primary px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
            "animate-in fade-in fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm transition-opacity duration-200",
            isClosingPromptModal ? "opacity-0" : "opacity-100",
          )}
          onClick={closePromptModal}
        >
          <div
            className={cn(
              "bg-sidebar-bg border-sidebar-border animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-lg border shadow-2xl transition-all duration-200",
              isClosingPromptModal
                ? "scale-95 opacity-0"
                : "scale-100 opacity-100",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h2 className="text-text-primary mb-4 text-lg font-semibold">
                Create New Prompt
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Prompt Key *
                  </label>
                  <input
                    type="text"
                    value={newPromptKey}
                    onChange={(e) => setNewPromptKey(e.target.value)}
                    placeholder="e.g., userContextGeneration"
                    className="border-content-border text-text-primary placeholder:text-text-tertiary w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm focus:border-gray-500 focus:outline-none"
                  />
                  <p className="text-text-tertiary mt-1 text-xs">
                    Unique identifier (alphanumeric, no spaces)
                  </p>
                </div>
                <div>
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g., User Context Generation"
                    className="border-content-border text-text-primary placeholder:text-text-tertiary w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-text-secondary mb-1.5 block text-sm font-medium">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newPromptDescription}
                    onChange={(e) => setNewPromptDescription(e.target.value)}
                    placeholder="What does this prompt do?"
                    className="border-content-border text-text-primary placeholder:text-text-tertiary w-full rounded-md border bg-transparent px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={closePromptModal}
                  className="text-text-secondary hover:text-text-primary px-4 py-2 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePrompt}
                  disabled={!newPromptKey.trim() || !newPromptName.trim()}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
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
          className="bg-sidebar-bg border-sidebar-border fixed left-3 z-[60] w-40 rounded border py-0.5 shadow-lg"
          style={{ top: "72px" }}
        >
          <button
            onClick={() => {
              setShowOrgDropdown(false);
              router.push("/settings");
            }}
            className="text-text-secondary hover:text-text-primary hover:bg-sidebar-hover w-full px-2.5 py-1 text-left text-xs"
          >
            Settings
          </button>
          <button
            onClick={() => {
              setShowOrgDropdown(false);
              router.push("/settings");
            }}
            className="text-text-secondary hover:text-text-primary hover:bg-sidebar-hover w-full px-2.5 py-1 text-left text-xs"
          >
            Manage members
          </button>
          <div className="border-content-border my-0.5 border-t" />
          <button
            onClick={() => setShowSwitchWorkspace(!showSwitchWorkspace)}
            className="text-text-secondary hover:text-text-primary hover:bg-sidebar-hover flex w-full items-center justify-between px-2.5 py-1 text-left text-xs"
          >
            Switch workspace
            <span className="text-[10px]">›</span>
          </button>
          <div className="border-content-border my-0.5 border-t" />
          <button
            onClick={() => {
              setShowOrgDropdown(false);
              clerk.signOut();
            }}
            className="text-text-secondary w-full px-2.5 py-1 text-left text-xs hover:text-red-400"
          >
            Log out
          </button>
        </div>
      )}

      {/* Switch Workspace Submenu */}
      {showOrgDropdown && showSwitchWorkspace && (
        <div
          ref={submenuRef}
          className="bg-sidebar-bg border-sidebar-border fixed left-[172px] z-[61] w-44 rounded border py-0.5 shadow-lg"
          style={{ top: "108px" }}
        >
          {isLoaded &&
            userMemberships.data?.map(({ organization: org }) => (
              <button
                key={org.id}
                onClick={() => handleSelectOrganization(org.id)}
                className={cn(
                  "flex w-full items-center justify-between px-2.5 py-1 text-left text-xs",
                  organization?.id === org.id
                    ? "text-text-primary bg-sidebar-active"
                    : "text-text-secondary hover:text-text-primary hover:bg-sidebar-hover",
                )}
              >
                <span className="truncate">{org.name}</span>
                {organization?.id === org.id && (
                  <span className="text-[10px]">✓</span>
                )}
              </button>
            ))}
          <div className="border-content-border my-0.5 border-t" />
          <button
            onClick={() => {
              setShowOrgDropdown(false);
              setShowSwitchWorkspace(false);
              setShowCreateOrg(true);
            }}
            className="text-text-tertiary hover:text-text-primary hover:bg-sidebar-hover w-full px-2.5 py-1 text-left text-xs"
          >
            + New workspace
          </button>
        </div>
      )}

      {/* Create Organization Modal */}
      {showCreateOrg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateOrg(false)}
        >
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowCreateOrg(false)}
              className="text-text-primary absolute -top-3 -right-3 z-10 rounded-full bg-gray-800 p-2 shadow-lg transition-colors hover:bg-gray-700"
            >
              <span className="material-symbols-outlined text-[20px]">
                close
              </span>
            </button>
            <div className="bg-sidebar-bg border-sidebar-border overflow-hidden rounded-lg border shadow-2xl">
              <CreateOrganization
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-sidebar-bg border-0 shadow-none p-8 w-full min-w-[400px] max-w-[450px]",
                    headerTitle: "text-text-primary text-2xl font-semibold",
                    headerSubtitle: "text-text-secondary text-sm mt-2",
                    formButtonPrimary:
                      "bg-gray-100 hover:bg-white text-gray-900 font-medium px-4 py-2 rounded-md transition-colors shadow-sm",
                    formButtonReset:
                      "border border-content-border text-text-primary hover:bg-sidebar-hover font-medium px-4 py-2 rounded-md transition-colors",
                    formFieldInput:
                      "bg-transparent border-content-border text-text-primary placeholder:text-text-tertiary rounded-md",
                    formFieldLabel:
                      "text-text-secondary text-sm font-medium mb-1.5",
                    formFieldInputShowPasswordButton:
                      "text-text-secondary hover:text-text-primary",
                    identityPreviewEditButton:
                      "text-text-secondary hover:text-text-primary",
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
