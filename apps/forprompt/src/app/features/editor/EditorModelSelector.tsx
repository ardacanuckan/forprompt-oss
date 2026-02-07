"use client";

import { ChevronDown } from "lucide-react";
import { createPortal } from "react-dom";
import { EDITOR_MODELS, THINKING_MODELS } from "@constants/models";
import { cn } from "@forprompt/ui";
import { useState, useRef, useEffect, useMemo } from "react";

interface EditorModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

// Group models by provider
function groupModelsByProvider(models: typeof EDITOR_MODELS) {
  const groups: Record<string, typeof EDITOR_MODELS> = {};
  models.forEach((model) => {
    if (!groups[model.provider]) {
      groups[model.provider] = [];
    }
    groups[model.provider].push(model);
  });
  return groups;
}

export function EditorModelSelector({
  selectedModel,
  onModelChange,
  disabled,
}: EditorModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentModel = EDITOR_MODELS.find((m) => m.id === selectedModel);
  const supportsThinking = THINKING_MODELS.includes(selectedModel);
  
  const groupedModels = useMemo(() => groupModelsByProvider(EDITOR_MODELS), []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        triggerRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
          "bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20",
          "text-muted-foreground hover:text-foreground",
          isOpen && "bg-white/10 border-white/20 text-foreground",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="font-medium">
          {currentModel?.name || "Select"}
        </span>
        {supportsThinking && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
            ext
          </span>
        )}
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
            className={cn(
              "z-[9999] rounded-md border border-white/10",
              "bg-black backdrop-blur-md shadow-2xl overflow-hidden",
              "w-[260px]"
            )}
          >
            <div className="max-h-[360px] overflow-y-auto">
              {Object.entries(groupedModels).map(([provider, models]) => (
                <div key={provider}>
                  {/* Provider header */}
                  <div className="px-2.5 py-1.5 bg-white/5 border-b border-white/5 sticky top-0 z-10 backdrop-blur-sm">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {provider}
                    </span>
                  </div>
                  
                  {/* Models in this provider */}
                  {models.map((model) => {
                    const isThinkingModel = THINKING_MODELS.includes(model.id);
                    const isSelected = model.id === selectedModel;

                    return (
                      <button
                        key={model.id}
                        onClick={() => {
                          onModelChange(model.id);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 transition-colors",
                          "hover:bg-white/10",
                          isSelected && "bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            "text-xs font-medium flex-1",
                            isSelected ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {model.name}
                          </span>
                          {isThinkingModel && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                              ext
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                          {model.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
