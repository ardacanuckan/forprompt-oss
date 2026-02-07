"use client";

import { useState } from "react";
import { api, useQuery, useMutation, useAction } from "~/convex/ConvexClientProvider";
import { Id } from "~/convex/_generated/dataModel";
import { Button } from "@forprompt/ui/button";
import { cn } from "@forprompt/ui";
import { PromptEditor } from "../editor";
import { PromptAnalysis, PromptTestChat } from "../testing";

type WizardStep = "info" | "editor" | "analysis" | "test";

interface PromptWizardProps {
  promptId: Id<"prompts">;
  onComplete: () => void;
}

export function PromptWizard({ promptId, onComplete }: PromptWizardProps) {
  const [step, setStep] = useState<WizardStep>("info");
  const [existingPrompt, setExistingPrompt] = useState("");
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<Id<"promptVersions"> | null>(null);
  const [selectedModel] = useState("anthropic/claude-3.5-sonnet");

  const prompt = useQuery(api.domains.promptOrchestrator.queries.getPromptWithTools, { promptId });
  const project = useQuery(
    api.domains.projects.queries.get,
    prompt?.projectId ? { projectId: prompt.projectId } : "skip"
  );
  
  const updateInformation = useMutation(api.domains.promptOrchestrator.mutations.updateInformation);
  const createVersion = useMutation(api.domains.promptOrchestrator.models.mutations.create);
  const generatePrompt = useAction(api.domains.promptOrchestrator.models.actions.generatePromptFromInfo);

  const handleGeneratePrompt = async () => {
    if (!existingPrompt && !description) {
      alert("Please either paste an existing prompt or describe what you want");
      return;
    }

    setIsGenerating(true);
    try {
      if (existingPrompt) {
        // User provided existing prompt, create v1 directly
        const versionId = await createVersion({
          promptId,
          systemPrompt: existingPrompt,
          description: "Initial version from existing prompt",
          setAsActive: true,
        });
        setSelectedVersionId(versionId);
        setStep("editor");
      } else {
        // Generate prompt from description and info
        const result = await generatePrompt({
          promptId,
          userDescription: description,
        });
        
        // Create v1 with generated prompt
        const versionId = await createVersion({
          promptId,
          systemPrompt: result.generatedPrompt,
          description: `AI-generated: ${result.explanation}`,
          setAsActive: true,
        });
        setSelectedVersionId(versionId);
        setStep("editor");
      }
    } catch (error: any) {
      alert(`Failed to generate prompt: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const steps = [
    { id: "info", label: "Info", icon: "info" },
    { id: "editor", label: "Editor", icon: "edit_note" },
    { id: "analysis", label: "Analysis", icon: "analytics" },
    { id: "test", label: "Test", icon: "science" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Progress Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px] text-neutral-400">
              auto_awesome
            </span>
          </div>
          <div>
            <h2 className="text-sm font-medium text-neutral-200">Prompt Setup</h2>
            <p className="text-xs text-neutral-500">{prompt?.name}</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors",
                  idx === currentStepIndex && "bg-neutral-800",
                  idx < currentStepIndex && "text-neutral-500",
                  idx > currentStepIndex && "text-neutral-600"
                )}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {idx < currentStepIndex ? "check_circle" : s.icon}
                </span>
                <span className="text-xs font-medium">{s.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <span className="material-symbols-outlined text-[16px] text-neutral-700 mx-1">
                  chevron_right
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {step === "info" && (
          <InfoStep
            prompt={prompt}
            existingPrompt={existingPrompt}
            setExistingPrompt={setExistingPrompt}
            description={description}
            setDescription={setDescription}
            isGenerating={isGenerating}
            onGenerate={handleGeneratePrompt}
            updateInformation={updateInformation}
            promptId={promptId}
            orgId={project?.orgId}
          />
        )}

        {step === "editor" && selectedVersionId && (
          <EditorStep
            promptId={promptId}
            selectedVersionId={selectedVersionId}
            onVersionCreated={setSelectedVersionId}
            onNext={() => setStep("analysis")}
            onBack={() => setStep("info")}
          />
        )}

        {step === "analysis" && selectedVersionId && (
          <AnalysisStep
            selectedVersionId={selectedVersionId}
            onNext={() => setStep("test")}
            onBack={() => setStep("editor")}
            onFixInEditor={() => setStep("editor")}
          />
        )}

        {step === "test" && selectedVersionId && (
          <TestStep
            selectedVersionId={selectedVersionId}
            selectedModel={selectedModel}
            onBack={() => setStep("analysis")}
            onComplete={onComplete}
          />
        )}
      </div>
    </div>
  );
}

// Info Step Component
function InfoStep({
  prompt,
  existingPrompt,
  setExistingPrompt,
  description,
  setDescription,
  isGenerating,
  onGenerate,
  updateInformation,
  promptId,
  orgId,
}: any) {
  const [formData, setFormData] = useState({
    purpose: prompt?.purpose || "",
    expectedBehavior: prompt?.expectedBehavior || "",
    constraints: prompt?.constraints || "",
  });

  const handleFieldChange = async (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    try {
      await updateInformation({
        promptId,
        [field]: value || undefined,
      });
    } catch (error: any) {
      console.error("Failed to save:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-neutral-200 mb-2">
          How do you want your prompt to work?
        </h1>
        <p className="text-sm text-neutral-500">
          Provide information about your prompt to help us generate the best system prompt for you
        </p>
      </div>

      {/* Purpose */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Purpose
          <span className="text-neutral-600 ml-2 text-xs">What is the main goal?</span>
        </label>
        <textarea
          value={formData.purpose}
          onChange={(e) => handleFieldChange("purpose", e.target.value)}
          placeholder="e.g., Generate customer support responses that are helpful and empathetic"
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
        />
      </div>

      {/* Expected Behavior */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Expected Behavior
          <span className="text-neutral-600 ml-2 text-xs">How should the AI behave?</span>
        </label>
        <textarea
          value={formData.expectedBehavior}
          onChange={(e) => handleFieldChange("expectedBehavior", e.target.value)}
          placeholder="e.g., Be friendly, professional, and always ask clarifying questions when needed"
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
        />
      </div>

      {/* Constraints */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Constraints
          <span className="text-neutral-600 ml-2 text-xs">Any limitations or rules?</span>
        </label>
        <textarea
          value={formData.constraints}
          onChange={(e) => handleFieldChange("constraints", e.target.value)}
          placeholder="e.g., Never make promises about refunds, always escalate billing issues"
          rows={3}
          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
        />
      </div>

      {/* Tools Section */}
      <div className="pt-4 border-t border-neutral-800">
        <label className="block text-sm font-medium text-neutral-300 mb-3">
          Tools
          <span className="text-neutral-600 ml-2 text-xs">Configure in the next steps</span>
        </label>
        <div className="text-xs text-neutral-500 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          You can add and configure tools after generating your prompt
        </div>
      </div>

      {/* Existing Prompt or Description */}
      <div className="pt-4 border-t border-neutral-800 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Do you have an existing prompt?
            <span className="text-neutral-600 ml-2 text-xs">(Optional)</span>
          </label>
          <textarea
            value={existingPrompt}
            onChange={(e) => setExistingPrompt(e.target.value)}
            placeholder="Paste your existing system prompt here..."
            rows={6}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none font-mono"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-800" />
          <span className="text-xs text-neutral-500 uppercase">OR</span>
          <div className="flex-1 h-px bg-neutral-800" />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Describe what you want
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="I want a customer support agent that helps users troubleshoot technical issues..."
            rows={4}
            disabled={!!existingPrompt}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-4">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || (!existingPrompt && !description)}
          className="px-6 py-2 bg-white text-black hover:bg-white/90 disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined text-[18px] mr-2 animate-spin">
                progress_activity
              </span>
              Generating...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px] mr-2">
                auto_awesome
              </span>
              {existingPrompt ? "Continue with Prompt" : "Generate Prompt"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Editor Step Component
function EditorStep({
  promptId,
  selectedVersionId,
  onVersionCreated,
  onNext,
  onBack,
}: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto bg-black/40 rounded-lg">
          <PromptEditor
            promptId={promptId}
            selectedVersionId={selectedVersionId}
            onVersionCreated={onVersionCreated}
          />
        </div>
      </div>
      <div className="h-16 px-8 flex items-center justify-between border-t border-neutral-800 flex-shrink-0">
        <Button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          <span className="material-symbols-outlined text-[16px] mr-2">
            arrow_back
          </span>
          Back to Info
        </Button>
        <Button
          onClick={onNext}
          className="px-4 py-2 bg-white text-black hover:bg-white/90"
        >
          Analyze Prompt
          <span className="material-symbols-outlined text-[16px] ml-2">
            arrow_forward
          </span>
        </Button>
      </div>
    </div>
  );
}

// Analysis Step Component
function AnalysisStep({
  selectedVersionId,
  onNext,
  onBack,
  onFixInEditor,
}: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <PromptAnalysis
            selectedVersionId={selectedVersionId}
            onFixInEditor={onFixInEditor}
          />
        </div>
      </div>
      <div className="h-16 px-8 flex items-center justify-between border-t border-neutral-800 flex-shrink-0">
        <Button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          <span className="material-symbols-outlined text-[16px] mr-2">
            arrow_back
          </span>
          Back to Editor
        </Button>
        <Button
          onClick={onNext}
          className="px-4 py-2 bg-white text-black hover:bg-white/90"
        >
          Test Prompt
          <span className="material-symbols-outlined text-[16px] ml-2">
            arrow_forward
          </span>
        </Button>
      </div>
    </div>
  );
}

// Test Step Component
function TestStep({
  selectedVersionId,
  selectedModel,
  onBack,
  onComplete,
}: any) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <PromptTestChat
            selectedVersionId={selectedVersionId}
            selectedModel={selectedModel}
          />
        </div>
      </div>
      <div className="h-16 px-8 flex items-center justify-between border-t border-neutral-800 flex-shrink-0">
        <Button
          onClick={onBack}
          className="px-4 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
        >
          <span className="material-symbols-outlined text-[16px] mr-2">
            arrow_back
          </span>
          Back to Analysis
        </Button>
        <Button
          onClick={onComplete}
          className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <span className="material-symbols-outlined text-[16px] mr-2">
            check_circle
          </span>
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

