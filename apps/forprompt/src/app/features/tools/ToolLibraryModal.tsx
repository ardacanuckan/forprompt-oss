"use client";

import { useState } from "react";
import { api, useQuery } from "~/convex/ConvexClientProvider";
import { Button } from "@forprompt/ui/button";
import { cn } from "@forprompt/ui";
import { Id } from "~/convex/_generated/dataModel";

interface ToolLibraryModalProps {
  orgId: Id<"organizations">;
  promptId: Id<"prompts">;
  onSelectTool: (toolId: Id<"organizationTools">) => void;
  onCreateNew: () => void;
  onClose: () => void;
  excludeToolIds?: Id<"organizationTools">[];
}

export function ToolLibraryModal({
  orgId,
  onSelectTool,
  onCreateNew,
  onClose,
  excludeToolIds = [],
}: ToolLibraryModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const tools = useQuery(api.domains.tools.queries.listOrgTools, {
    orgId,
    category: selectedCategory || undefined,
    search: searchQuery || undefined,
  });

  const categories = ["database", "api", "utility", "file", "communication", "analytics", "other"];

  // Filter out already selected tools
  const availableTools = tools?.filter(
    (tool) => !excludeToolIds.includes(tool._id)
  ) || [];

  const parseParameters = (parametersJson: string) => {
    try {
      const schema = JSON.parse(parametersJson);
      const paramCount = schema.properties ? Object.keys(schema.properties).length : 0;
      return paramCount;
    } catch {
      return 0;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-200">Tool Library</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Select tools to add to your prompt
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-500">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-6"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#404040 transparent'
          }}
        >
          {!tools ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <span className="material-symbols-outlined text-[32px] text-neutral-600 animate-spin">
                  progress_activity
                </span>
                <p className="text-sm text-neutral-500 mt-2">Loading tools...</p>
              </div>
            </div>
          ) : availableTools.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <span className="material-symbols-outlined text-[48px] text-neutral-600">
                  construction
                </span>
                <p className="text-sm text-neutral-400 mt-3">
                  {searchQuery || selectedCategory
                    ? "No tools found matching your filters"
                    : "No tools in your library yet"}
                </p>
                <Button
                  onClick={onCreateNew}
                  size="sm"
                  className="mt-4 h-9 px-4 bg-white text-black hover:bg-white/90"
                >
                  <span className="material-symbols-outlined text-[16px] mr-1.5">
                    add
                  </span>
                  Create First Tool
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableTools.map((tool) => {
                const paramCount = parseParameters(tool.parameters);
                
                return (
                  <div
                    key={tool._id}
                    className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-neutral-200 truncate">
                          {tool.name}
                        </h3>
                        {tool.category && (
                          <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 mt-1">
                            {tool.category}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={() => onSelectTool(tool._id)}
                        size="sm"
                        className="h-7 px-3 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-0 ml-2"
                      >
                        Add
                      </Button>
                    </div>
                    
                    <p className="text-xs text-neutral-500 line-clamp-2 mb-3">
                      {tool.description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-xs text-neutral-600">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">
                          tune
                        </span>
                        {paramCount} {paramCount === 1 ? "parameter" : "parameters"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between">
          <p className="text-xs text-neutral-500">
            {availableTools.length} {availableTools.length === 1 ? "tool" : "tools"} available
          </p>
          <Button
            onClick={onCreateNew}
            size="sm"
            className="h-9 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-0"
          >
            <span className="material-symbols-outlined text-[16px] mr-1.5">
              add
            </span>
            Create New Tool
          </Button>
        </div>
      </div>
    </div>
  );
}

