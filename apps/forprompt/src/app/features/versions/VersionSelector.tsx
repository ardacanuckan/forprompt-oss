"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { api, useQuery, useMutation } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";

interface VersionSelectorProps {
  promptId: Id<"prompts">;
  selectedVersionId: Id<"promptVersions"> | null;
  onVersionSelect: (versionId: Id<"promptVersions"> | null) => void;
}

export function VersionSelector({
  promptId,
  selectedVersionId,
  onVersionSelect,
}: VersionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  const selectedVersion = prompt?.versions.find((v) => v._id === selectedVersionId);

  const filteredVersions = useMemo(() => {
    if (!prompt?.versions) return [];
    if (!searchQuery.trim()) return prompt.versions;

    const query = searchQuery.toLowerCase();
    return prompt.versions.filter(
      (v) =>
        `v${v.versionNumber}`.toLowerCase().includes(query) ||
        v.description?.toLowerCase().includes(query)
    );
  }, [prompt?.versions, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);


  if (!prompt) {
    return (
      <div className="px-3 py-1.5 text-sm text-neutral-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-all",
          "bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700",
          "text-neutral-200",
          isOpen && "bg-neutral-800 border-neutral-700"
        )}
      >
        <span className="material-symbols-outlined text-[16px] text-neutral-400">
          history
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 uppercase tracking-wide font-medium">
            Version
          </span>
          <span className="font-semibold">
            {selectedVersion ? `v${selectedVersion.versionNumber}` : "New"}
          </span>
        </div>
        {selectedVersion && prompt.activeVersionId === selectedVersion._id && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
            active
          </span>
        )}
        <span className={cn(
          "material-symbols-outlined text-[16px] text-neutral-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )}>
          expand_more
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setSearchQuery("");
            }}
          />
          
          <div
            ref={dropdownRef}
            className={cn(
              "absolute z-50 mt-1 rounded-md border border-neutral-800",
              "bg-neutral-950 shadow-lg overflow-hidden",
              "w-[280px]",
              "right-0"
            )}
          >
            {/* Search Input */}
            {prompt.versions.length > 3 && (
              <div className="p-2 border-b border-neutral-800">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[14px] text-neutral-500">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "w-full h-8 pl-7 pr-2 text-sm bg-neutral-900 border border-neutral-800 rounded",
                      "text-neutral-200 placeholder:text-neutral-600",
                      "focus:outline-none focus:border-neutral-700",
                      "transition-colors"
                    )}
                  />
                </div>
              </div>
            )}

            {/* Version List */}
            <div className="max-h-[300px] overflow-y-auto py-1">
              {filteredVersions.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-neutral-500">
                  {searchQuery ? "No versions found" : "No versions yet"}
                </div>
              ) : (
                <>
                  {/* New Version Option */}
                  <button
                    onClick={() => {
                      onVersionSelect(null);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors",
                      "text-neutral-300 hover:bg-neutral-900",
                      !selectedVersionId && "bg-neutral-900/50"
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px] text-emerald-400">add</span>
                    <span>New Version</span>
                  </button>

                  {filteredVersions.length > 0 && (
                    <div className="h-px bg-neutral-800 my-1" />
                  )}

                  {filteredVersions.map((version) => {
                    const isActive = prompt.activeVersionId === version._id;
                    const isSelected = selectedVersionId === version._id;

                    return (
                      <button
                        key={version._id}
                        onClick={() => {
                          onVersionSelect(version._id);
                          setIsOpen(false);
                          setSearchQuery("");
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 transition-colors",
                          "text-neutral-200 hover:bg-neutral-900",
                          isSelected && "bg-neutral-900/70"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            v{version.versionNumber}
                          </span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                              active
                            </span>
                          )}
                          <span className="text-xs text-neutral-500 ml-auto">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                        {version.description && (
                          <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
                            {version.description}
                          </p>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
