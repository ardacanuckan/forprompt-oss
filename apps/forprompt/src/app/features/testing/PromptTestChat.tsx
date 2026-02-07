"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { api, useQuery, useAction } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { DEFAULT_MODEL } from "@constants/models";
import { TestModelSelector } from "./TestModelSelector";

import type { Message } from "@/app/types";

interface PromptTestChatProps {
  selectedVersionId: Id<"promptVersions"> | null;
  selectedModel?: string;
}

export function PromptTestChat({ selectedVersionId, selectedModel: initialModel }: PromptTestChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [selectedModel, setSelectedModel] = useState(initialModel || DEFAULT_MODEL);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedVersion = useQuery(
    api.domains.promptOrchestrator.models.queries.get,
    selectedVersionId ? { versionId: selectedVersionId } : "skip"
  ) as { _id: Id<"promptVersions">; versionNumber: number; systemPrompt: string; isActive: boolean } | undefined | null;

  const testPrompt = useAction(api.domains.promptOrchestrator.models.actions.testPrompt);

  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [selectedVersionId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-focus textarea when component mounts or after sending message
  useEffect(() => {
    if (textareaRef.current && !isTesting) {
      textareaRef.current.focus();
    }
  }, [isTesting, selectedVersionId]);


  const handleTest = async () => {
    if (!input.trim() || !selectedVersionId) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTesting(true);

    try {
      const result = await testPrompt({
        versionId: selectedVersionId,
        userMessage: userMessage.content,
        model: selectedModel,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: result.response,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTesting(false);
      // Focus textarea after message is sent
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  if (!selectedVersion) {
    return (
      <div className="p-5 flex flex-col h-full max-h-full overflow-hidden items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a version to test</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Test</span>
          </div>
          <TestModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isTesting}
          />
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto space-y-4 min-h-0 mb-4 chat-scroll"
      >
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Send a message to test</p>
          </div>
        )}
        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-md px-3 py-2.5 ${
                message.role === "user"
                  ? "bg-white text-black"
                  : "bg-white/5"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
            </div>
          </div>
        ))}
        {isTesting && (
          <div className="flex justify-start">
            <div className="bg-white/5 rounded-md px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-center flex-shrink-0">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isTesting}
          rows={1}
          className="flex-1 bg-black/30 rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-white/10 h-[40px] overflow-y-auto"
        />
        <button
          onClick={handleTest}
          disabled={!input.trim() || isTesting}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-md hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0 h-[40px]"
        >
          Send
        </button>
      </div>
    </div>
  );
}
