"use client";

import { useMemo, useState } from "react";
import * as Diff from "diff";
import { Check, X, ArrowRight, RotateCcw, Minus, Plus } from "lucide-react";
import { cn } from "@forprompt/ui";

interface PromptInlineReviewerProps {
  original: string;
  modified: string;
  onApply: (finalContent: string) => void;
  onCancel: () => void;
}

// A ChangeBlock represents a contiguous set of line changes
interface ChangeBlock {
  id: string;
  type: "unchanged" | "modified";
  removedLines: string[];
  addedLines: string[];
  unchangedLines: string[];
}

export function PromptInlineReviewer({ original, modified, onApply, onCancel }: PromptInlineReviewerProps) {
  // Use line-based diffing for cleaner visualization
  const changeBlocks = useMemo(() => {
    const lineDiffs = Diff.diffLines(original, modified);
    const blocks: ChangeBlock[] = [];
    let blockIndex = 0;

    let i = 0;
    while (i < lineDiffs.length) {
      const current = lineDiffs[i];

      if (!current.added && !current.removed) {
        // Unchanged block
        const lines = current.value.split('\n').filter((_, idx, arr) =>
          idx < arr.length - 1 || arr[idx] !== ''
        );
        if (lines.length > 0 || current.value === '\n') {
          blocks.push({
            id: `block-${blockIndex++}`,
            type: "unchanged",
            removedLines: [],
            addedLines: [],
            unchangedLines: current.value === '\n' ? [''] : lines,
          });
        }
        i++;
      } else {
        // Collect contiguous changes (removed followed by added, or just one of them)
        const removedLines: string[] = [];
        const addedLines: string[] = [];

        // Collect all removed lines first
        while (i < lineDiffs.length && lineDiffs[i].removed) {
          const lines = lineDiffs[i].value.split('\n');
          // Don't add empty string at end if it's just from split
          lines.forEach((line, idx) => {
            if (idx < lines.length - 1 || line !== '') {
              removedLines.push(line);
            }
          });
          i++;
        }

        // Then collect all added lines
        while (i < lineDiffs.length && lineDiffs[i].added) {
          const lines = lineDiffs[i].value.split('\n');
          lines.forEach((line, idx) => {
            if (idx < lines.length - 1 || line !== '') {
              addedLines.push(line);
            }
          });
          i++;
        }

        if (removedLines.length > 0 || addedLines.length > 0) {
          blocks.push({
            id: `block-${blockIndex++}`,
            type: "modified",
            removedLines,
            addedLines,
            unchangedLines: [],
          });
        }
      }
    }

    return blocks;
  }, [original, modified]);

  // State for decisions on modified blocks
  const [decisions, setDecisions] = useState<Record<string, "accepted" | "rejected">>({});
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);

  const handleDecision = (id: string, decision: "accepted" | "rejected") => {
    setDecisions(prev => ({ ...prev, [id]: decision }));
  };

  const handleUndo = (id: string) => {
    setDecisions(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleFinish = () => {
    const finalLines: string[] = [];

    changeBlocks.forEach(block => {
      if (block.type === "unchanged") {
        finalLines.push(...block.unchangedLines);
      } else {
        const decision = decisions[block.id] || "accepted";
        if (decision === "accepted") {
          finalLines.push(...block.addedLines);
        } else {
          finalLines.push(...block.removedLines);
        }
      }
    });

    onApply(finalLines.join('\n'));
  };

  const modifiedBlocks = changeBlocks.filter(b => b.type === "modified");
  const pendingCount = modifiedBlocks.filter(b => !decisions[b.id]).length;

  // Calculate line numbers for display
  let currentLineNumber = 1;

  return (
    <div className="flex h-full bg-black/30 rounded-md border border-white/10 overflow-hidden font-mono text-sm relative">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Review Toolbar */}
        <div className="absolute top-3 right-4 z-30 flex items-center gap-2">
          <div className={cn(
            "flex items-center gap-2 px-1.5 py-1 bg-black/50 backdrop-blur rounded-lg border border-white/10 transition-all",
            pendingCount > 0 ? "opacity-100" : "opacity-80 hover:opacity-100"
          )}>
            {pendingCount > 0 && (
              <div className="px-2 py-0.5 text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded border border-amber-500/20">
                {pendingCount} left
              </div>
            )}

            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-3 py-1 bg-white text-black hover:bg-white/90 text-xs font-medium rounded-md transition-colors"
            >
              Finish <ArrowRight className="w-3 h-3 opacity-50" />
            </button>

            <div className="w-px h-3 bg-white/10" />

            <button
              onClick={onCancel}
              className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
              title="Cancel Review"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {changeBlocks.map((block) => {
            if (block.type === "unchanged") {
              const startLine = currentLineNumber;
              currentLineNumber += block.unchangedLines.length;

              return (
                <div key={block.id}>
                  {block.unchangedLines.map((line, idx) => (
                    <div key={idx} className="flex group">
                      <div className="flex-shrink-0 w-[50px] py-0.5 text-right text-xs text-muted-foreground/40 bg-white/5 border-r border-white/5 select-none pr-3">
                        {startLine + idx}
                      </div>
                      <div className="flex-shrink-0 w-[24px] bg-white/5 border-r border-white/5" />
                      <div className="flex-1 py-0.5 px-4 text-neutral-400 whitespace-pre-wrap break-all">
                        {line || '\u00A0'}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            // Modified block
            const status = decisions[block.id] || "pending";
            const isHovered = hoveredBlockId === block.id;
            const startLine = currentLineNumber;

            // Calculate how many lines this block will contribute to final
            if (status === "accepted" || status === "pending") {
              currentLineNumber += block.addedLines.length;
            } else {
              currentLineNumber += block.removedLines.length;
            }

            return (
              <div
                key={block.id}
                className="relative"
                onMouseEnter={() => setHoveredBlockId(block.id)}
                onMouseLeave={() => setHoveredBlockId(null)}
              >
                {/* Floating Actions */}
                {isHovered && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                    {status === "pending" ? (
                      <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg shadow-xl border border-white/10 animate-in fade-in duration-150">
                        <button
                          onClick={() => handleDecision(block.id, "accepted")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-emerald-500/20 text-emerald-400 rounded-md transition-colors text-xs"
                          title="Accept changes"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Accept
                        </button>
                        <div className="w-px h-4 bg-white/10" />
                        <button
                          onClick={() => handleDecision(block.id, "rejected")}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-red-500/20 text-red-400 rounded-md transition-colors text-xs"
                          title="Reject changes"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUndo(block.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-800 text-neutral-400 hover:text-white rounded-lg shadow border border-white/10 text-xs transition-colors"
                        title="Undo decision"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Undo
                      </button>
                    )}
                  </div>
                )}

                {/* Removed lines - only show if pending or rejected */}
                {(status === "pending" || status === "rejected") && block.removedLines.map((line, idx) => (
                  <div
                    key={`removed-${idx}`}
                    className={cn(
                      "flex group transition-opacity duration-200",
                      status === "pending" ? "opacity-100" : "opacity-100"
                    )}
                  >
                    <div className="flex-shrink-0 w-[50px] py-0.5 text-right text-xs text-red-400/60 bg-red-500/10 border-r border-red-500/20 select-none pr-3">
                      {status === "rejected" ? startLine + idx : ''}
                    </div>
                    <div className="flex-shrink-0 w-[24px] bg-red-500/10 border-r border-red-500/20 flex items-center justify-center">
                      <Minus className="w-3 h-3 text-red-400/60" />
                    </div>
                    <div className={cn(
                      "flex-1 py-0.5 px-4 whitespace-pre-wrap break-all transition-all duration-200",
                      status === "pending"
                        ? "bg-red-500/10 text-red-300/80 line-through decoration-red-400/40"
                        : "bg-transparent text-neutral-400"
                    )}>
                      {line || '\u00A0'}
                    </div>
                  </div>
                ))}

                {/* Added lines - only show if pending or accepted */}
                {(status === "pending" || status === "accepted") && block.addedLines.map((line, idx) => (
                  <div
                    key={`added-${idx}`}
                    className="flex group transition-opacity duration-200"
                  >
                    <div className="flex-shrink-0 w-[50px] py-0.5 text-right text-xs text-emerald-400/60 bg-emerald-500/10 border-r border-emerald-500/20 select-none pr-3">
                      {status === "accepted" || status === "pending" ? startLine + idx : ''}
                    </div>
                    <div className="flex-shrink-0 w-[24px] bg-emerald-500/10 border-r border-emerald-500/20 flex items-center justify-center">
                      <Plus className="w-3 h-3 text-emerald-400/60" />
                    </div>
                    <div className={cn(
                      "flex-1 py-0.5 px-4 whitespace-pre-wrap break-all transition-all duration-200",
                      status === "pending"
                        ? "bg-emerald-500/10 text-emerald-200"
                        : "bg-emerald-500/5 text-neutral-300"
                    )}>
                      {line || '\u00A0'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
