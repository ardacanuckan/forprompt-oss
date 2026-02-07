"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Wand2, Check, X, RotateCcw, Eye, Minus, Plus, Brain, ChevronDown, ChevronRight, Loader2, MessageCircle } from "lucide-react";
import { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";
import * as Diff from "diff";
import { useAIFeature } from "~/hooks/useAIFeature";
import { EditorModelSelector } from "./EditorModelSelector";

// Get Convex HTTP URL from the Convex cloud URL
function getConvexHttpUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
  // Convert https://xxx.convex.cloud to https://xxx.convex.site
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

interface InterviewOption {
  label: string;
  text: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  responseType?: "edit" | "conversation" | "interview";
  // Edit-specific
  editedPrompt?: string;
  thinking?: string;
  status?: "pending" | "applied" | "rejected";
  // Interview-specific (new format with options)
  question?: string;
  options?: InterviewOption[];
  timestamp: number;
  isError?: boolean;
}

interface PromptEditChatProps {
  selectedVersionId: Id<"promptVersions"> | null;
  currentPrompt: string;
  onApplyEdit: (newPrompt: string) => void;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

// Line-based diff preview component - matches the PromptInlineReviewer style
function LineDiffPreview({ original, edited }: { original: string; edited: string }) {
  const changes = useMemo(() => {
    const lineDiffs = Diff.diffLines(original, edited);
    const result: { type: "removed" | "added" | "unchanged"; line: string }[] = [];

    lineDiffs.forEach(part => {
      const lines = part.value.split('\n').filter((line, idx, arr) =>
        idx < arr.length - 1 || line !== ''
      );

      lines.forEach(line => {
        if (part.added) {
          result.push({ type: "added", line });
        } else if (part.removed) {
          result.push({ type: "removed", line });
        } else {
          result.push({ type: "unchanged", line });
        }
      });
    });

    return result;
  }, [original, edited]);

  // Only show changed lines with some context
  const changedLines = useMemo(() => {
    const contextLines = 1;
    const filtered: typeof changes = [];

    changes.forEach((change, idx) => {
      if (change.type !== "unchanged") {
        // Add context before
        for (let i = Math.max(0, idx - contextLines); i < idx; i++) {
          if (!filtered.includes(changes[i])) {
            filtered.push(changes[i]);
          }
        }
        filtered.push(change);
        // Add context after
        for (let i = idx + 1; i <= Math.min(changes.length - 1, idx + contextLines); i++) {
          if (!filtered.includes(changes[i])) {
            filtered.push(changes[i]);
          }
        }
      }
    });

    return filtered;
  }, [changes]);

  const stats = useMemo(() => {
    const added = changes.filter(c => c.type === "added").length;
    const removed = changes.filter(c => c.type === "removed").length;
    return { added, removed };
  }, [changes]);

  if (stats.added === 0 && stats.removed === 0) {
    return (
      <div className="text-xs text-muted-foreground py-2">No changes detected</div>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-black/30 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-white/5 bg-white/5 flex justify-between items-center">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
        <div className="flex items-center gap-2 text-[10px]">
          {stats.removed > 0 && (
            <span className="text-red-400">-{stats.removed}</span>
          )}
          {stats.added > 0 && (
            <span className="text-emerald-400">+{stats.added}</span>
          )}
        </div>
      </div>
      <div className="max-h-[180px] overflow-y-auto">
        {changedLines.slice(0, 10).map((change, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-stretch text-xs font-mono",
              change.type === "removed" && "bg-red-500/10",
              change.type === "added" && "bg-emerald-500/10"
            )}
          >
            <div className={cn(
              "w-5 flex-shrink-0 flex items-center justify-center border-r",
              change.type === "removed" && "bg-red-500/20 border-red-500/20 text-red-400",
              change.type === "added" && "bg-emerald-500/20 border-emerald-500/20 text-emerald-400",
              change.type === "unchanged" && "bg-white/5 border-white/5 text-muted-foreground"
            )}>
              {change.type === "removed" && <Minus className="w-2.5 h-2.5" />}
              {change.type === "added" && <Plus className="w-2.5 h-2.5" />}
            </div>
            <div className={cn(
              "flex-1 px-2 py-0.5 whitespace-pre-wrap break-all",
              change.type === "removed" && "text-red-300/80",
              change.type === "added" && "text-emerald-300",
              change.type === "unchanged" && "text-muted-foreground"
            )}>
              {change.line || '\u00A0'}
            </div>
          </div>
        ))}
        {changedLines.length > 10 && (
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-white/5 border-t border-white/5">
            +{changedLines.length - 10} more lines
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal thinking panel - supports streaming
function ThinkingPanel({ thinking, isStreaming = false }: { thinking: string; isStreaming?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, isStreaming]);

  useEffect(() => {
    if (isStreaming) setIsExpanded(true);
  }, [isStreaming]);

  if (!thinking && !isStreaming) return null;

  return (
    <div className="rounded-md border border-white/10 bg-white/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/5 transition-colors"
      >
        {isStreaming ? (
          <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
        ) : (
          <Brain className="w-3 h-3 text-muted-foreground" />
        )}
        <span className="text-[10px] text-muted-foreground flex-1 text-left">
          {isStreaming ? "Thinking..." : "Reasoning"}
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div ref={scrollRef} className="px-3 pb-2 max-h-[200px] overflow-y-auto border-t border-white/5">
          <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed pt-2">
            {thinking || "..."}
            {isStreaming && <span className="inline-block w-1 h-3 bg-muted-foreground/50 ml-0.5 animate-pulse" />}
          </p>
        </div>
      )}
    </div>
  );
}

// Conversation message component - for chat responses
function ConversationMessage({ content }: { content: string }) {
  return (
    <div className="bg-white/5 rounded-md px-3 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-[10px] text-blue-400 uppercase tracking-wide">Response</span>
      </div>
      <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
    </div>
  );
}

// Interview options component - Claude Code style with clickable options
function InterviewOptions({
  question,
  options,
  onOptionSelect
}: {
  question: string;
  options: InterviewOption[];
  onOptionSelect: (option: InterviewOption) => void;
}) {
  const [customInput, setCustomInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleOptionClick = (option: InterviewOption) => {
    if (option.text.toLowerCase().includes("other")) {
      setShowCustomInput(true);
    } else {
      onOptionSelect(option);
    }
  };

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onOptionSelect({ label: "Custom", text: customInput.trim() });
    }
  };

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3 space-y-3">
      <p className="text-sm text-foreground">{question}</p>

      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.label}
            onClick={() => handleOptionClick(option)}
            className="w-full flex items-center gap-3 px-3 py-2 bg-black/30 hover:bg-white/10 rounded-md transition-colors text-left group"
          >
            <span className="w-6 h-6 flex items-center justify-center bg-white/10 group-hover:bg-white/20 rounded text-xs font-medium text-muted-foreground group-hover:text-foreground">
              {option.label}
            </span>
            <span className="text-sm text-foreground">{option.text}</span>
          </button>
        ))}
      </div>

      {showCustomInput && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          <textarea
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Tell me what you'd like..."
            className="w-full bg-black/30 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/20 min-h-[60px]"
            rows={2}
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            disabled={!customInput.trim()}
            className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

// Dynamic suggestions based on prompt content
function getSmartSuggestions(prompt: string): string[] {
  const suggestions: string[] = [];
  const promptLower = prompt.toLowerCase();
  const wordCount = prompt.split(/\s+/).length;

  // Length-based suggestions
  if (wordCount > 200) {
    suggestions.push("Make it more concise");
  } else if (wordCount < 50) {
    suggestions.push("Add more detail");
  }

  // Content-based suggestions
  if (!promptLower.includes("example")) {
    suggestions.push("Add examples");
  }
  if (!promptLower.includes("error") && !promptLower.includes("edge case")) {
    suggestions.push("Add error handling instructions");
  }
  if (!promptLower.includes("format") && !promptLower.includes("output")) {
    suggestions.push("Specify output format");
  }
  if (!promptLower.includes("step") && !promptLower.includes("first")) {
    suggestions.push("Add step-by-step structure");
  }

  // Default suggestions if none match
  if (suggestions.length === 0) {
    suggestions.push("Improve clarity", "Make tone more professional", "Simplify language");
  }

  return suggestions.slice(0, 3);
}

// Helper to parse JSON from AI response
function parseJSONResponse<T>(content: string): T | null {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(content);
  } catch {
    // Continue to other strategies
  }

  // Strategy 2: Extract from markdown code blocks
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    try {
      return JSON.parse(match[1].trim());
    } catch {
      // Try next match
    }
  }

  // Strategy 3: Find JSON object in text
  const firstOpen = content.indexOf("{");
  const lastClose = content.lastIndexOf("}");

  if (firstOpen !== -1 && lastClose > firstOpen) {
    let currentClose = lastClose;
    while (currentClose > firstOpen) {
      try {
        return JSON.parse(content.substring(firstOpen, currentClose + 1));
      } catch {
        currentClose = content.lastIndexOf("}", currentClose - 1);
      }
    }
  }

  return null;
}

export function PromptEditChat({ selectedVersionId, currentPrompt, onApplyEdit, selectedModel = "anthropic/claude-sonnet-4.5", onModelChange }: PromptEditChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [pastedSelection, setPastedSelection] = useState("");

  // Streaming state
  const [streamingThinking, setStreamingThinking] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingParsed, setStreamingParsed] = useState<{
    responseType?: "edit" | "conversation" | "interview";
    explanation?: string;
    message?: string;
    question?: string;
  } | null>(null);

  // Conversation history for multi-turn interviews
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Store last request for retry
  const lastRequestRef = useRef<{ instruction: string; selection?: string } | null>(null);

  // Dynamic suggestions based on current prompt
  const suggestions = useMemo(() => getSmartSuggestions(currentPrompt), [currentPrompt]);

  const { checkAIFeature } = useAIFeature();

  // Combined selection (from parent or pasted)
  const activeSelection = pastedSelection;
  const clearActiveSelection = () => {
    setPastedSelection("");
  };

  // Auto-scroll: trigger on messages, streaming content, and processing state
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingThinking, streamingContent, isProcessing]);

  useEffect(() => {
    setMessages([]);
  }, [selectedVersionId]);

  // Auto-focus textarea
  useEffect(() => {
    if (textareaRef.current && !isProcessing) {
      textareaRef.current.focus();
    }
  }, [isProcessing, selectedVersionId]);

  const handleSend = useCallback(async (overrideInstruction?: string, overrideSelection?: string) => {
    const instruction = overrideInstruction ?? input.trim();
    if (!instruction || isProcessing) return;
    if (!checkAIFeature("aiPromptEditing")) return;

    const currentSelection = overrideSelection !== undefined ? overrideSelection : activeSelection;

    const displayContent = currentSelection
      ? `"${currentSelection.slice(0, 40)}${currentSelection.length > 40 ? '...' : ''}" → ${instruction}`
      : instruction;

    if (!overrideInstruction) {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: displayContent,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, userMessage]);
      setInput("");

      lastRequestRef.current = { instruction, selection: currentSelection };
      clearActiveSelection();
    }

    setIsProcessing(true);
    setStreamingThinking("");
    setStreamingContent("");
    setStreamingParsed(null);

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      const convexHttpUrl = getConvexHttpUrl();
      const response = await fetch(`${convexHttpUrl}/api/edit-prompt/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPrompt,
          instruction,
          selection: currentSelection || undefined,
          conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
          model: selectedModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process edit");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let thinkingBuffer = "";
      let contentBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "thinking") {
                thinkingBuffer += parsed.content;
                setStreamingThinking(thinkingBuffer);
              } else if (parsed.type === "content") {
                contentBuffer += parsed.content;
                setStreamingContent(contentBuffer);
                
                // Try to parse the content buffer to show formatted content
                const parsedContent = parseJSONResponse<{
                  responseType?: "edit" | "conversation" | "interview";
                  explanation?: string;
                  message?: string;
                  question?: string;
                }>(contentBuffer);
                
                if (parsedContent) {
                  setStreamingParsed(parsedContent);
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Parse the final content as JSON to extract the response
      const parsed = parseJSONResponse<{
        responseType?: "edit" | "conversation" | "interview";
        // Edit fields
        type?: string;  // Legacy: editType
        editType?: string;
        editedPrompt?: string | { systemPrompt?: string; prompt?: string };
        explanation?: string;
        // Conversation fields
        message?: string;
        // Interview fields (new format with options)
        question?: string;
        options?: Array<{ label: string; text: string }>;
      }>(contentBuffer);

      if (parsed) {
        // Determine response type (default to "edit" for backward compatibility)
        const responseType = parsed.responseType || "edit";

        if (responseType === "conversation") {
          // Conversation response - just chat, no edit
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: parsed.message || "I'm here to help!",
            responseType: "conversation",
            thinking: thinkingBuffer,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          // Clear conversation history after conversation (not part of interview flow)
          setConversationHistory([]);

        } else if (responseType === "interview") {
          // Interview response - AI is asking with options
          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: parsed.question || "How would you like me to help?",
            responseType: "interview",
            question: parsed.question,
            options: parsed.options || [],
            thinking: thinkingBuffer,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          // Update conversation history for multi-turn interview
          setConversationHistory(prev => [
            ...prev,
            { role: "user", content: instruction },
            { role: "assistant", content: contentBuffer }
          ]);

        } else {
          // Edit response (default)
          let newContent: string = currentPrompt;
          const rawEditedPrompt = parsed.editedPrompt;
          if (typeof rawEditedPrompt === 'object' && rawEditedPrompt !== null) {
            if ('systemPrompt' in rawEditedPrompt && rawEditedPrompt.systemPrompt) {
              newContent = rawEditedPrompt.systemPrompt;
            } else if ('prompt' in rawEditedPrompt && rawEditedPrompt.prompt) {
              newContent = rawEditedPrompt.prompt;
            }
          } else if (typeof rawEditedPrompt === 'string') {
            newContent = rawEditedPrompt;
          }

          const editType = parsed.editType || parsed.type || ((currentSelection && currentSelection.length > 0) ? "fragment" : "global");

          // Handle fragment replacement
          if (editType === "fragment" && currentSelection) {
            if (currentPrompt.includes(currentSelection)) {
              newContent = currentPrompt.replace(currentSelection, newContent);
            }
          }

          const assistantMessage: Message = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: parsed.explanation || "Edit applied.",
            responseType: "edit",
            editedPrompt: newContent,
            thinking: thinkingBuffer,
            status: "pending",
            timestamp: Date.now(),
          };

          setMessages(prev => [...prev, assistantMessage]);
          // Clear conversation history after successful edit
          setConversationHistory([]);
        }
      } else {
        // Failed to parse - show error
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Failed to parse AI response. Please try again.",
          thinking: thinkingBuffer,
          timestamp: Date.now(),
          isError: true,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") return;

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setStreamingThinking("");
      setStreamingContent("");
      setStreamingParsed(null);
      abortControllerRef.current = null;
      if (!overrideInstruction) {
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    }
  }, [input, isProcessing, activeSelection, currentPrompt, clearActiveSelection, selectedModel, conversationHistory, checkAIFeature]);

  const handleRetry = () => {
    if (lastRequestRef.current) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.isError) {
          return prev.slice(0, -1);
        }
        return prev;
      });

      handleSend(lastRequestRef.current.instruction, lastRequestRef.current.selection);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData("text");
    if (pastedText && pastedText.trim() && currentPrompt.includes(pastedText.trim())) {
      e.preventDefault();
      setPastedSelection(pastedText.trim());
    }
  };

  const handleApply = (messageId: string, editedPrompt: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: "applied" as const } : msg
      )
    );
    onApplyEdit(editedPrompt);
  };

  const handleReject = (messageId: string) => {
    setMessages(prev =>
      prev.map(msg =>
        msg.id === messageId ? { ...msg, status: "rejected" as const } : msg
      )
    );
  };

  if (!selectedVersionId) {
    return (
      <div className="flex flex-col h-full max-h-full overflow-hidden p-5">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/5">
          <Wand2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Edit</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Select a version to edit</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Edit</span>
          </div>
          {onModelChange && (
            <EditorModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={isProcessing}
            />
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setConversationHistory([]);
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 mb-4 chat-scroll">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground mb-4">Ask a question or describe an edit</p>
            <div className="space-y-2 w-full">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground bg-white/5 hover:bg-white/10 rounded-md transition-all text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="space-y-3">
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[80%] bg-white text-black rounded-md px-3 py-2.5">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )}

            {msg.role === "assistant" && (
              <div className="space-y-3">
                {msg.isError ? (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 space-y-2">
                    <div className="flex items-start gap-2 text-red-400">
                      <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Thinking Panel - show AI's reasoning process */}
                    {msg.thinking && <ThinkingPanel thinking={msg.thinking} />}

                    {/* Conversation Response */}
                    {msg.responseType === "conversation" && (
                      <ConversationMessage content={msg.content} />
                    )}

                    {/* Interview Response */}
                    {msg.responseType === "interview" && msg.question && msg.options && msg.options.length > 0 && (
                      <InterviewOptions
                        question={msg.question}
                        options={msg.options}
                        onOptionSelect={(option: InterviewOption) => {
                          // Add user's selection as a new message and continue the conversation
                          const userMessage: Message = {
                            id: crypto.randomUUID(),
                            role: "user",
                            content: option.text,
                            timestamp: Date.now(),
                          };
                          setMessages(prev => [...prev, userMessage]);
                          handleSend(option.text);
                        }}
                      />
                    )}

                    {/* Edit Response (default) */}
                    {(!msg.responseType || msg.responseType === "edit") && (
                      <>
                        {/* Explanation */}
                        <div className="bg-white/5 rounded-md px-3 py-2.5">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                        </div>

                        {msg.editedPrompt && (
                          <>
                            {msg.status === "pending" && (
                              <LineDiffPreview original={currentPrompt} edited={msg.editedPrompt} />
                            )}

                            {msg.status === "pending" && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApply(msg.id, msg.editedPrompt!)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Review
                                </button>
                                <button
                                  onClick={() => handleReject(msg.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-foreground text-sm font-medium rounded-md transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </div>
                            )}

                            {msg.status === "applied" && (
                              <div className="flex items-center gap-1.5 text-emerald-400 text-xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>Applied</span>
                              </div>
                            )}
                            {msg.status === "rejected" && (
                              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <X className="w-3.5 h-3.5" />
                                <span>Rejected</span>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="space-y-3">
            {streamingThinking && (
              <ThinkingPanel thinking={streamingThinking} isStreaming={true} />
            )}
            {streamingParsed && (
              <div className="bg-white/5 rounded-md px-3 py-2.5">
                {streamingParsed.responseType === "conversation" && streamingParsed.message && (
                  <ConversationMessage content={streamingParsed.message} />
                )}
                {streamingParsed.responseType === "interview" && streamingParsed.question && (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">
                    {streamingParsed.question}
                    <span className="inline-block w-1 h-3 bg-foreground/50 ml-0.5 animate-pulse" />
                  </div>
                )}
                {(!streamingParsed.responseType || streamingParsed.responseType === "edit") && streamingParsed.explanation && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {streamingParsed.explanation}
                    <span className="inline-block w-1 h-3 bg-foreground/50 ml-0.5 animate-pulse" />
                  </p>
                )}
              </div>
            )}
            {!streamingThinking && !streamingParsed && (
              <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Processing...</span>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Selection indicator */}
      {activeSelection && (
        <div className="mb-3 p-2 bg-white/5 rounded-md border border-white/10 flex-shrink-0">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Selection</p>
              <p className="text-xs text-foreground font-mono truncate">
                {activeSelection.slice(0, 50)}{activeSelection.length > 50 ? '...' : ''}
              </p>
            </div>
            <button onClick={clearActiveSelection} className="p-1 hover:bg-white/10 rounded transition-colors">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-center flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={activeSelection ? "What to do with selection..." : "Ask a question or describe an edit..."}
          disabled={isProcessing}
          rows={1}
          className="flex-1 bg-black/30 rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-white/10 h-[40px] overflow-y-auto"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isProcessing}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 h-[40px]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
