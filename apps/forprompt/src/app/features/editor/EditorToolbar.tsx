"use client";

import { BarChart3, MessageSquare, Wand2 } from "lucide-react";
import { cn } from "@forprompt/ui";

import type { ToolType } from "@/app/types";

interface EditorToolbarProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
}

export function EditorToolbar({ activeTool, onToolChange }: EditorToolbarProps) {
  const tools = [
    {
      id: "edit" as const,
      icon: Wand2,
      label: "AI Edit",
      description: "Edit prompt with AI",
    },
    {
      id: "analysis" as const,
      icon: BarChart3,
      label: "Analysis",
      description: "Analyze prompt quality",
    },
    {
      id: "test" as const,
      icon: MessageSquare,
      label: "Test",
      description: "Test your prompt",
    },
  ];

  return (
    <div className="w-12 bg-neutral-950 border-l border-neutral-800 flex flex-col items-center py-4 gap-2 flex-shrink-0">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            onClick={() => onToolChange(isActive ? null : tool.id)}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
              "hover:bg-neutral-800",
              isActive && "bg-neutral-800"
            )}
            title={tool.description}
          >
            <Icon
              className={cn(
                "w-5 h-5",
                isActive ? "text-white" : "text-neutral-400"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
