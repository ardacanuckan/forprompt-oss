"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, useQuery, useMutation, useAction } from "~/convex/ConvexClientProvider";
import { Button } from "@forprompt/ui/button";
import { Id } from "~/convex/_generated/dataModel";
import { PromptCompletenessBar } from "./PromptCompletenessBar";
import { ToolLibraryModal, ToolDefinitionEditor, ToolExporter } from "../tools";
import { useAIFeature } from "~/hooks/useAIFeature";

interface PromptInformationProps {
  promptId: Id<"prompts">;
  onViewChange?: (view: string) => void;
  onVersionCreated?: (versionId: Id<"promptVersions">) => void;
  isNewPrompt?: boolean;
}

type FieldKey = "purpose" | "expectedBehavior" | "inputFormat" | "outputFormat" | "constraints" | "useCases" | "additionalNotes" | "toolsNotes" | "referencePrompt";

interface FieldConfig {
  key: FieldKey;
  label: string;
  placeholder: string;
  maxLength: number;
  rows: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function PromptInformation({ promptId, onViewChange, onVersionCreated, isNewPrompt = false }: PromptInformationProps) {
  const prompt = useQuery(api.domains.promptOrchestrator.queries.getPromptWithTools, { promptId });
  const completeness = useQuery(api.domains.promptOrchestrator.queries.calculateCompleteness, { promptId });
  const updateInformation = useMutation(api.domains.promptOrchestrator.mutations.updateInformation);
  const createTool = useMutation(api.domains.tools.mutations.createTool);
  const addToolToPrompt = useMutation(api.domains.tools.mutations.addToolToPrompt);
  const removeToolFromPrompt = useMutation(api.domains.tools.mutations.removeToolFromPrompt);
  const updatePromptToolConfig = useMutation(api.domains.tools.mutations.updatePromptToolConfig);
  const createVersion = useMutation(api.domains.promptOrchestrator.models.mutations.create);
  const generatePromptAction = useAction(api.domains.promptOrchestrator.models.actions.generatePromptFromInfo);
  const enhanceFieldAction = useAction(api.domains.promptOrchestrator.models.actions.enhanceFieldText);
  const extractInfoAction = useAction(api.domains.promptOrchestrator.models.actions.extractInfoFromPrompt);

  const [formData, setFormData] = useState({
    purpose: "",
    expectedBehavior: "",
    inputFormat: "",
    outputFormat: "",
    constraints: "",
    useCases: "",
    additionalNotes: "",
    toolsNotes: "",
    referencePrompt: "",
  });

  const [showToolLibrary, setShowToolLibrary] = useState(false);
  const [showToolEditor, setShowToolEditor] = useState(false);
  const [showToolExporter, setShowToolExporter] = useState(false);
  const [editingTool, setEditingTool] = useState<{ toolId: Id<"organizationTools">; usageNotes: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [generatedVersionNumber, setGeneratedVersionNumber] = useState<number | null>(null);
  const [existingPromptText, setExistingPromptText] = useState("");
  const [showImportOption, setShowImportOption] = useState(false);
  const [enhancingField, setEnhancingField] = useState<FieldKey | null>(null);
  const [pendingSave, setPendingSave] = useState<{ field: FieldKey; value: string } | null>(null);
  const [userChoice, setUserChoice] = useState<'none' | 'config'>('none');

  // Debounce the pending save
  const debouncedSave = useDebounce(pendingSave, 800);

  // Track which prompt we've loaded data for
  const loadedPromptId = useRef<string | null>(null);

  const project = useQuery(
    api.domains.projects.queries.get,
    prompt?.projectId ? { projectId: prompt.projectId } : "skip"
  );

  // Load initial data from prompt - reset when promptId changes
  useEffect(() => {
    if (prompt && loadedPromptId.current !== promptId) {
      loadedPromptId.current = promptId;
      setFormData({
        purpose: prompt.purpose || "",
        expectedBehavior: prompt.expectedBehavior || "",
        inputFormat: prompt.inputFormat || "",
        outputFormat: prompt.outputFormat || "",
        constraints: prompt.constraints || "",
        useCases: prompt.useCases || "",
        additionalNotes: prompt.additionalNotes || "",
        toolsNotes: prompt.toolsNotes || "",
        referencePrompt: prompt.referencePrompt || "",
      });
      // Reset other states when switching prompts
      setExistingPromptText("");
      setShowImportOption(false);
      setPendingSave(null);
      setUserChoice('none');
    }
  }, [prompt, promptId]);

  // Auto-skip choice screen if prompt has versions (handles case when version is created in Editor)
  useEffect(() => {
    if (!isNewPrompt && userChoice === 'none') {
      setUserChoice('config');
    }
  }, [isNewPrompt, userChoice]);

  // Handle debounced save
  useEffect(() => {
    if (debouncedSave) {
      const saveData = async () => {
        setIsSaving(true);
        try {
          await updateInformation({ promptId, [debouncedSave.field]: debouncedSave.value || undefined });
        } catch (error: any) {
          console.error("Failed to save:", error);
        } finally {
          setIsSaving(false);
        }
      };
      saveData();
    }
  }, [debouncedSave, promptId, updateInformation]);

  const handleFieldChange = (field: FieldKey, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setPendingSave({ field, value });
  };

  const { checkAIFeature } = useAIFeature();

  const handleEnhanceField = async (field: FieldKey) => {
    const value = formData[field];
    if (!value || typeof value !== 'string' || !value.trim()) return;
    if (!checkAIFeature("aiEnhancementSuggestions")) return;

    setEnhancingField(field);
    try {
      const result = await enhanceFieldAction({
        fieldName: field,
        fieldValue: value,
        context: formData.purpose ? `Prompt purpose: ${formData.purpose}` : undefined,
      });
      setFormData((prev) => ({ ...prev, [field]: result.enhancedText }));
      // Save immediately after enhance
      await updateInformation({ promptId, [field]: result.enhancedText });
    } catch (error: any) {
      alert(`Failed to enhance: ${error.message}`);
    } finally {
      setEnhancingField(null);
    }
  };

  const handleAddTool = async (toolId: Id<"organizationTools">) => {
    try {
      await addToolToPrompt({ promptId, toolId, isRequired: false, usageNotes: undefined });
      setShowToolLibrary(false);
    } catch (error: any) {
      alert(`Failed to add tool: ${error.message}`);
    }
  };

  const handleCreateTool = async (toolData: any) => {
    if (!project?.orgId) return;
    try {
      const toolId = await createTool({ orgId: project.orgId, ...toolData });
      await addToolToPrompt({ promptId, toolId, isRequired: false, usageNotes: undefined });
      setShowToolEditor(false);
    } catch (error: any) {
      alert(`Failed to create tool: ${error.message}`);
      throw error;
    }
  };

  const handleRemoveTool = async (toolId: Id<"organizationTools">) => {
    try {
      await removeToolFromPrompt({ promptId, toolId });
    } catch (error: any) {
      alert(`Failed to remove tool: ${error.message}`);
    }
  };

  const handleToggleRequired = async (toolId: Id<"organizationTools">, isRequired: boolean) => {
    try {
      await updatePromptToolConfig({ promptId, toolId, isRequired: !isRequired });
    } catch (error: any) {
      alert(`Failed to update tool: ${error.message}`);
    }
  };

  const handleUpdateUsageNotes = async (toolId: Id<"organizationTools">, notes: string) => {
    try {
      await updatePromptToolConfig({ promptId, toolId, usageNotes: notes || undefined });
    } catch (error: any) {
      console.error("Failed to update usage notes:", error);
    }
  };

  const handleGeneratePrompt = async () => {
    // Check if there's enough information to generate
    const hasBasicInfo = formData.purpose.trim() || formData.expectedBehavior.trim();

    if (!hasBasicInfo && !existingPromptText) {
      alert("Please fill in at least the Purpose or Expected Behavior fields to generate a prompt");
      return;
    }

    if (!checkAIFeature("aiPromptGeneration")) return;

    setIsGenerating(true);
    try {
      let systemPrompt: string;
      let description: string;

      if (existingPromptText) {
        // User wants to import an existing prompt directly
        systemPrompt = existingPromptText;
        description = "Imported from existing prompt";

        // AI Extraction for metadata
        try {
          const extracted = await extractInfoAction({ systemPrompt: existingPromptText });
          
          // Update local state
          const newFormData = {
            ...formData,
            purpose: extracted.purpose || formData.purpose,
            expectedBehavior: extracted.expectedBehavior || formData.expectedBehavior,
            inputFormat: extracted.inputFormat || formData.inputFormat,
            outputFormat: extracted.outputFormat || formData.outputFormat,
            constraints: Array.isArray(extracted.constraints) 
              ? extracted.constraints.join('\n') 
              : (extracted.constraints || formData.constraints),
            useCases: extracted.useCases || formData.useCases,
            toolsNotes: extracted.toolsAndCapabilities || formData.toolsNotes,
          };
          setFormData(newFormData);

          // Save extracted fields to DB immediately
          await updateInformation({
            promptId,
            purpose: extracted.purpose || undefined,
            expectedBehavior: extracted.expectedBehavior || undefined,
            inputFormat: extracted.inputFormat || undefined,
            outputFormat: extracted.outputFormat || undefined,
            constraints: Array.isArray(extracted.constraints) 
              ? extracted.constraints.join('\n') 
              : (extracted.constraints || undefined),
            useCases: extracted.useCases || undefined,
            toolsNotes: extracted.toolsAndCapabilities || undefined,
          });
        } catch (extractError) {
          console.error("Failed to extract metadata, continuing with just the version creation:", extractError);
        }
      } else {
        // Generate based on the information filled above
        const result = await generatePromptAction({ promptId });
        systemPrompt = result.generatedPrompt;
        description = `AI-generated: ${result.explanation}`;
      }

      const versionId = await createVersion({ promptId, systemPrompt, description, setAsActive: true });

      // New version number - if this is a new prompt, it's v1, otherwise we don't know exact number
      const newVersionNumber = isNewPrompt ? 1 : null;
      setGeneratedVersionNumber(newVersionNumber ?? 1);
      setShowSuccessMessage(true);
      setExistingPromptText("");

      // Redirect if handlers available
      if (onViewChange) onViewChange("editor");
      if (onVersionCreated && versionId) onVersionCreated(versionId);

      setTimeout(() => {
        setShowSuccessMessage(false);
        setGeneratedVersionNumber(null);
      }, 5000);
    } catch (error: any) {
      alert(`Failed to generate/import prompt: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Save as reference - just save the prompt text as reference for manual configuration
  const handleSaveAsReference = async () => {
    if (!existingPromptText.trim()) {
      alert("Please paste a prompt to use as reference");
      return;
    }

    setIsImporting(true);
    try {
      // Save the prompt as referencePrompt field
      await updateInformation({
        promptId,
        referencePrompt: existingPromptText,
      });

      // Update local state
      setFormData((prev) => ({ ...prev, referencePrompt: existingPromptText }));
      setExistingPromptText("");
      setShowImportOption(false);
    } catch (error: any) {
      alert(`Failed to save reference: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const fieldConfigs: FieldConfig[] = [
    { key: "purpose", label: "Purpose", placeholder: "What is the main goal of this prompt? e.g., Generate customer support responses that are helpful and empathetic", maxLength: 4000, rows: 8 },
    { key: "expectedBehavior", label: "Expected Behavior", placeholder: "How should the AI behave? e.g., Be friendly, ask clarifying questions, provide step-by-step solutions", maxLength: 4000, rows: 10 },
    { key: "inputFormat", label: "Input Format", placeholder: "What format will the input follow? e.g., User provides a description of their issue with optional error messages", maxLength: 4000, rows: 8 },
    { key: "outputFormat", label: "Output Format", placeholder: "What format should the output follow? e.g., Structured response with acknowledgment, solution steps, and follow-up", maxLength: 4000, rows: 8 },
    { key: "constraints", label: "Constraints & Rules", placeholder: "What should the AI avoid? e.g., Never make promises about refunds, always escalate billing issues", maxLength: 4000, rows: 8 },
    { key: "useCases", label: "Use Cases", placeholder: "Primary scenarios? e.g., Password resets, technical troubleshooting, product inquiries", maxLength: 4000, rows: 8 },
  ];

  if (!prompt) {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="material-symbols-outlined text-[24px] text-neutral-600 animate-spin">progress_activity</span>
      </div>
    );
  }

  const linkedTools = prompt.tools || [];
  const excludeToolIds = linkedTools.map((pt) => pt.toolId);

  // Choice Screen for new prompts
  if (isNewPrompt && userChoice === 'none') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-md w-full">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 mb-4">
                <span 
                  className="material-symbols-outlined text-[24px] text-neutral-400"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  edit_note
                </span>
              </div>
              <h2 className="text-lg font-medium text-neutral-200 mb-1.5">
                Create your prompt
              </h2>
              <p className="text-sm text-neutral-500">
                Choose how you'd like to get started
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              {/* I have a prompt */}
              <button
                onClick={() => {
                  if (onViewChange) {
                    onViewChange('editor');
                  }
                }}
                className="w-full flex items-center gap-4 p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-700/50 transition-all">
                  <span 
                    className="material-symbols-outlined text-[20px] text-neutral-400"
                    style={{ fontVariationSettings: "'wght' 300" }}
                  >
                    edit
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-neutral-200 mb-1">I have a prompt</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Write or paste your existing system prompt
                  </p>
                </div>
                <span 
                  className="material-symbols-outlined text-[18px] text-neutral-600 group-hover:text-neutral-400 transition-colors"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  arrow_forward
                </span>
              </button>

              {/* Let's create together */}
              <button
                onClick={() => setUserChoice('config')}
                className="w-full flex items-center gap-4 p-5 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-800/70 hover:border-neutral-700 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center flex-shrink-0 group-hover:bg-neutral-700/50 transition-all">
                  <span 
                    className="material-symbols-outlined text-[20px] text-neutral-400"
                    style={{ fontVariationSettings: "'wght' 300" }}
                  >
                    auto_awesome
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-neutral-200 mb-1">Let's create together</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Use AI to generate a prompt from your requirements
                  </p>
                </div>
                <span 
                  className="material-symbols-outlined text-[18px] text-neutral-600 group-hover:text-neutral-400 transition-colors"
                  style={{ fontVariationSettings: "'wght' 300" }}
                >
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Content - Full width with minimal scrollbar */}
      <div
        className="flex-1 overflow-y-auto px-8 py-8"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#404040 transparent'
        }}
      >
        {/* Saving indicator */}
        <div className="h-4 mb-4">
          {isSaving && (
            <div className="text-xs text-neutral-500 animate-pulse">Saving changes...</div>
          )}
        </div>

        {/* Success Message */}
        {showSuccessMessage && generatedVersionNumber && (
          <div className="mb-8 flex items-center gap-3 text-emerald-400 bg-emerald-500/5 px-4 py-3 rounded-lg border border-emerald-500/10">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <div>
              <p className="text-sm font-medium">v{generatedVersionNumber} promptunuz oluşturuldu!</p>
              <p className="text-xs text-emerald-400/60 mt-0.5">Editor sekmesinden düzenleyebilirsiniz.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex-shrink-0 pb-4 border-b border-neutral-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-neutral-400">tune</span>
            </div>
            <h1 className="text-lg font-medium text-neutral-200">Configuration</h1>
          </div>
          <div className="flex items-center gap-3 ml-11">
            <code className="text-xs text-neutral-500 font-mono">{prompt.key}</code>
            <span className="text-neutral-700">•</span>
            <span className="text-xs text-neutral-500">{prompt.name}</span>
          </div>
        </div>

        {/* Intro Section */}
        <div className="mb-8">
          <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">
            Metadata
          </h3>
              <p className="text-sm text-neutral-500">
            {isNewPrompt 
              ? "Add metadata to better organize your prompt, or use AI to generate a version from your configuration"
              : "Update metadata or generate new versions based on your configuration"
            }
              </p>
            </div>
            


        {/* Form Fields - Full Width */}
        <div className="space-y-12 pb-24">
          {/* Reference Prompt Section - Show if there's a saved reference */}
          {formData.referencePrompt && (
            <FieldWithEnhance
              config={{
                key: "referencePrompt",
                label: "Reference Prompt",
                placeholder: "Your original prompt for reference...",
                maxLength: 50000,
                rows: 10,
              }}
              value={formData.referencePrompt}
              onChange={(value) => handleFieldChange("referencePrompt", value)}
              onEnhance={() => handleEnhanceField("referencePrompt")}
              isEnhancing={enhancingField === "referencePrompt"}
              onCopy={async () => {
                try {
                  await navigator.clipboard.writeText(formData.referencePrompt);
                } catch (error) {
                  console.error("Failed to copy:", error);
                }
              }}
              onRemove={async () => {
                await updateInformation({ promptId, referencePrompt: "" });
                setFormData((prev) => ({ ...prev, referencePrompt: "" }));
              }}
            />
          )}

          <div className="space-y-12">
            {fieldConfigs.map((config) => (
              <FieldWithEnhance
                key={config.key}
                config={config}
                value={formData[config.key]}
                onChange={(value) => handleFieldChange(config.key, value)}
                onEnhance={() => handleEnhanceField(config.key)}
                isEnhancing={enhancingField === config.key}
              />
            ))}

            <FieldWithEnhance
              config={{ key: "additionalNotes", label: "Additional Notes", placeholder: "Any other context, examples, or edge cases to consider...", maxLength: 4000, rows: 6 }}
              value={formData.additionalNotes}
              onChange={(value) => handleFieldChange("additionalNotes", value)}
              onEnhance={() => handleEnhanceField("additionalNotes")}
              isEnhancing={enhancingField === "additionalNotes"}
            />
          </div>

          {/* Tools Section */}
          <div className="pt-12 border-t border-neutral-800">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">Tools & Capabilities</h3>
                <p className="text-sm text-neutral-500">Enable external tools for AI interaction</p>
              </div>
              
               <div className="flex items-center gap-3">
                 <button
                  onClick={() => setShowToolLibrary(true)}
                  className="px-4 py-2 text-xs font-medium text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-600 rounded-lg bg-neutral-900/50 transition-all"
                >
                  + Library
                </button>
                <button
                   onClick={() => setShowToolEditor(true)}
                   className="px-4 py-2 text-xs font-medium text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Create New
                </button>
                 {linkedTools.length > 0 && (
                  <button
                    onClick={() => setShowToolExporter(true)}
                    className="p-2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    title="Export Tools"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                  </button>
                )}
               </div>
            </div>

            {/* Tools List */}
            {linkedTools.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-neutral-800/40 rounded-lg bg-neutral-900/10">
                <span className="material-symbols-outlined text-[28px] text-neutral-800 mb-2">construction</span>
                <p className="text-sm text-neutral-600">No tools configured for this prompt yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/50 border-y border-neutral-800/50">
                {linkedTools.map((pt) => {
                  if (!pt.tool) return null;
                  return (
                    <div key={pt._id} className="group py-6 flex items-start justify-between gap-6">
                      
                      <div className="flex items-start gap-5">
                        <div className="mt-0.5 w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-500">
                           <span className="material-symbols-outlined text-[18px]">terminal</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-neutral-200">{pt.tool.name}</span>
                             {pt.isRequired && (
                                <span className="text-xs uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  Required
                                </span>
                              )}
                          </div>
                          <p className="text-sm text-neutral-500 mt-1 max-w-2xl">{pt.tool.description}</p>
                           {pt.usageNotes && (
                              <div className="mt-2 flex items-start gap-2 max-w-2xl">
                                <span className="material-symbols-outlined text-[14px] text-neutral-600 mt-0.5">notes</span>
                                <p className="text-xs text-neutral-400 italic">
                                  {pt.usageNotes}
                                </p>
                              </div>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button
                            onClick={() => setEditingTool({ toolId: pt.toolId, usageNotes: pt.usageNotes || "" })}
                            className="p-2.5 text-neutral-600 hover:text-neutral-300 hover:bg-neutral-900 rounded-lg transition-all"
                          >
                            <span className="material-symbols-outlined text-[18px]">settings_input_component</span>
                          </button>
                          <button
                            onClick={() => handleRemoveTool(pt.toolId)}
                            className="p-2.5 text-neutral-700 hover:text-red-400 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">close</span>
                          </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* General Tool Strategy */}
            {linkedTools.length > 0 && (
              <div className="mt-12 pl-12 border-l border-neutral-800/50">
                <FieldWithEnhance
                  config={{
                    key: "toolsNotes",
                    label: "Execution Strategy",
                    placeholder: "Example: Always check recent data using search before answering. Use the calculator for any numeric result to ensure accuracy.",
                    maxLength: 4000,
                    rows: 4
                  }}
                  value={formData.toolsNotes}
                  onChange={(value) => handleFieldChange("toolsNotes", value)}
                  onEnhance={() => handleEnhanceField("toolsNotes")}
                  isEnhancing={enhancingField === "toolsNotes"}
                />
              </div>
            )}
          </div>

          {/* Generate Section */}
          <div className="pt-12 border-t border-neutral-800">
             <div className="flex items-center justify-between gap-8">
                <div>
                   <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-2">
                    AI Generation
                   </h3>
                   <p className="text-sm text-neutral-500">
                     Generate a new version using the metadata above
                   </p>
                </div>

                 <div className="flex items-center gap-4">
                    {!isNewPrompt && (
                      <button
                        onClick={() => setShowImportOption(!showImportOption)}
                        className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-300 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">file_upload</span>
                        {showImportOption ? "Hide import" : "Import manually"}
                      </button>
                    )}
                    <Button
                      onClick={handleGeneratePrompt}
                      disabled={isGenerating || (!formData.purpose.trim() && !formData.expectedBehavior.trim() && !existingPromptText)}
                      className="px-6 py-2 bg-neutral-100 text-black hover:bg-white disabled:opacity-40 font-medium text-sm rounded-lg transition-all flex items-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                          Generating...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                          Generate with AI
                        </>
                      )}
                    </Button>
                 </div>
             </div>

             {/* Import Existing Prompt for existing prompts */}
             {showImportOption && !isNewPrompt && (
               <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300 space-y-4">
                 <div className="flex items-center justify-between">
                   <label className="text-sm font-medium text-neutral-400">Import Existing Prompt</label>
                   <span className="text-xs text-neutral-600 uppercase">Import Options</span>
                 </div>
                 <textarea
                   value={existingPromptText}
                   onChange={(e) => setExistingPromptText(e.target.value)}
                   placeholder="Paste an existing system prompt here..."
                   rows={8}
                   className="w-full bg-neutral-900/20 border border-neutral-800/80 rounded-lg px-4 py-3 text-sm text-neutral-400 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900/40 transition-all resize-y font-mono"
                 />
                 <div className="flex items-center gap-3 justify-end">
                   <button
                     onClick={handleSaveAsReference}
                     disabled={isGenerating || isImporting || !existingPromptText.trim()}
                     className="px-5 py-2 text-neutral-400 hover:text-neutral-200 disabled:opacity-40 font-medium text-sm transition-all flex items-center gap-2"
                   >
                     {isImporting ? (
                       <>
                         <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                         Saving...
                       </>
                     ) : (
                       <>
                         <span className="material-symbols-outlined text-[16px]">save</span>
                         Save Only
                       </>
                     )}
                   </button>
                   <Button
                     onClick={handleGeneratePrompt}
                     disabled={isGenerating || isImporting || !existingPromptText.trim()}
                     className="px-6 py-2 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 disabled:opacity-40 font-medium text-sm rounded-xl transition-all flex items-center gap-2"
                   >
                     {isGenerating ? (
                       <>
                         <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                         Analyzing...
                       </>
                     ) : (
                       <>
                         <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                         Extract & Create
                       </>
                     )}
                   </Button>
                 </div>
               </div>
             )}

             {/* Summary Pills */}
             <div className="flex flex-wrap gap-2 mt-6">
                 {Object.entries(formData).map(([key, value]) => {
                     if (!value || key === 'toolsNotes') return null;
                     const label = fieldConfigs.find(c => c.key === key)?.label || (key === 'additionalNotes' ? 'Notes' : key);
                     return (
                       <div key={key} className="px-3 py-1 rounded-full bg-neutral-900/50 border border-neutral-800/80 text-xs text-neutral-600 font-medium">
                          {label}
                       </div>
                     )
                 })}
                 {linkedTools.length > 0 && (
                    <div className="px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-500/70 font-medium">
                      {linkedTools.length} Tools Active
                    </div>
                 )}
             </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showToolLibrary && (
        project?.orgId ? (
          <ToolLibraryModal
            orgId={project.orgId}
            promptId={promptId}
            onSelectTool={handleAddTool}
            onCreateNew={() => { setShowToolLibrary(false); setShowToolEditor(true); }}
            onClose={() => setShowToolLibrary(false)}
            excludeToolIds={excludeToolIds}
          />
        ) : (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 p-6 text-center">
              <span className="material-symbols-outlined text-[24px] text-neutral-500 animate-spin">progress_activity</span>
              <p className="text-sm text-neutral-400 mt-2">Loading...</p>
              <button onClick={() => setShowToolLibrary(false)} className="mt-4 px-4 py-2 bg-neutral-800 rounded text-sm text-neutral-300 hover:bg-neutral-700">
                Cancel
              </button>
            </div>
          </div>
        )
      )}

      {showToolEditor && (
        project?.orgId ? (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 w-full max-w-3xl max-h-[90vh] flex flex-col">
              <ToolDefinitionEditor
                orgId={project.orgId}
                onSave={handleCreateTool}
                onCancel={() => setShowToolEditor(false)}
              />
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 p-6 text-center">
              <span className="material-symbols-outlined text-[24px] text-neutral-500 animate-spin">progress_activity</span>
              <p className="text-sm text-neutral-400 mt-2">Loading...</p>
              <button onClick={() => setShowToolEditor(false)} className="mt-4 px-4 py-2 bg-neutral-800 rounded text-sm text-neutral-300 hover:bg-neutral-700">
                Cancel
              </button>
            </div>
          </div>
        )
      )}

      {showToolExporter && (
        <ToolExporter
          tools={linkedTools.map((pt) => pt.tool!).filter(Boolean)}
          onClose={() => setShowToolExporter(false)}
        />
      )}

      {/* Edit Tool Usage Modal */}
      {editingTool && (
        <EditToolUsageModal
          tool={linkedTools.find(pt => pt.toolId === editingTool.toolId)?.tool}
          usageNotes={editingTool.usageNotes}
          isRequired={linkedTools.find(pt => pt.toolId === editingTool.toolId)?.isRequired || false}
          onSave={async (usageNotes, isRequired) => {
            await handleUpdateUsageNotes(editingTool.toolId, usageNotes);
            // updatePromptToolConfig expects the new value directly
            await updatePromptToolConfig({ promptId, toolId: editingTool.toolId, isRequired });
            setEditingTool(null);
          }}
          onClose={() => setEditingTool(null)}
        />
      )}
    </div>
  );
}

// Field Component with Enhance Button and Undo/Redo
interface FieldWithEnhanceProps {
  config: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  onEnhance: () => void;
  isEnhancing: boolean;
  onRemove?: () => void;
  onCopy?: () => void;
}

function FieldWithEnhance({ config, value, onChange, onEnhance, isEnhancing, onRemove, onCopy }: FieldWithEnhanceProps) {
  // History for undo/redo (only tracks AI enhancements, not every keystroke)
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastEnhancedValue, setLastEnhancedValue] = useState<string | null>(null);
  const [showEnhanceSuccess, setShowEnhanceSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (onCopy) {
      onCopy();
    } else if (value) {
      try {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  // Track when value changes from enhancement
  useEffect(() => {
    if (lastEnhancedValue && value === lastEnhancedValue) {
      setShowEnhanceSuccess(true);
      const timer = setTimeout(() => setShowEnhanceSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [value, lastEnhancedValue]);

  const handleEnhance = () => {
    // Save current value to history before enhancing
    if (value && typeof value === 'string' && value.trim()) {
      const newHistory = [...history.slice(0, historyIndex + 1), value];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
    onEnhance();
  };

  // Called after enhancement completes (we detect this by value changing while isEnhancing was true)
  const prevIsEnhancing = useRef(isEnhancing);
  useEffect(() => {
    if (prevIsEnhancing.current && !isEnhancing && value !== history[historyIndex]) {
      // Enhancement just completed, save the new value
      const newHistory = [...history.slice(0, historyIndex + 1), value];
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setLastEnhancedValue(value);
    }
    prevIsEnhancing.current = isEnhancing;
  }, [isEnhancing, value, history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleUndo = () => {
    if (canUndo) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  const handleRedo = () => {
    if (canRedo) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
    }
  };

  return (
    <div className={`relative group ${isEnhancing ? "pointer-events-none opacity-50" : ""}`}>
      {/* Label Row */}
      <div className="flex items-end justify-between mb-3">
        <div className="flex items-baseline gap-1.5 group/label">
          <label className="text-sm font-medium text-neutral-300">
            {config.label}
          </label>
          {onCopy && value && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover/label:opacity-100 transition-opacity text-neutral-600 hover:text-neutral-400 p-0"
              title={copied ? "Copied!" : "Copy"}
            >
              <span className="material-symbols-outlined text-[9px] leading-none">{copied ? "check" : "content_copy"}</span>
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-0.5 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Remove"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
            </button>
          )}
        </div>

        {/* Actions - Visible on Hover/Focus */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {/* Undo/Redo - Minimal */}
          {history.length > 1 && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={handleUndo}
                disabled={!canUndo || isEnhancing}
                className="p-1 text-neutral-600 hover:text-neutral-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="Undo"
              >
                <span className="material-symbols-outlined text-[14px]">undo</span>
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo || isEnhancing}
                className="p-1 text-neutral-600 hover:text-neutral-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                title="Redo"
              >
                <span className="material-symbols-outlined text-[14px]">redo</span>
              </button>
            </div>
          )}

          {/* Character Count */}
          <span className="text-xs text-neutral-600 font-mono">
            {(value?.length || 0)}/{config.maxLength}
          </span>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={config.placeholder}
          rows={config.rows}
          maxLength={config.maxLength}
          disabled={isEnhancing}
          className={`w-full bg-neutral-900/30 border rounded-lg px-4 py-3 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-600 focus:bg-neutral-900/50 transition-all resize-y ${
            isEnhancing
              ? 'border-emerald-500/30 animate-pulse cursor-wait'
              : 'border-neutral-800'
          }`}
        />
        
        {/* Enhance Button / Loading State */}
        {value && typeof value === 'string' && value.trim() && (
          <div className={`absolute bottom-3 right-3 transition-opacity ${isEnhancing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
             {isEnhancing ? (
                <span className="flex items-center gap-2 text-xs text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                  Enhancing...
                </span>
             ) : showEnhanceSuccess ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/10">
                  <span className="material-symbols-outlined text-[14px]">check</span>
                  Refined
                </span>
             ) : (
                <button
                  onClick={handleEnhance}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all"
                  title="Enhance with AI"
                >
                  <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
                  Enhance
                </button>
             )}
          </div>
        )}
      </div>
    </div>
  );
}

// Edit Tool Usage Modal
interface EditToolUsageModalProps {
  tool: { name: string; description: string; category?: string; parameters: string } | null | undefined;
  usageNotes: string;
  isRequired: boolean;
  onSave: (usageNotes: string, isRequired: boolean) => Promise<void>;
  onClose: () => void;
}

function EditToolUsageModal({ tool, usageNotes: initialUsageNotes, isRequired: initialIsRequired, onSave, onClose }: EditToolUsageModalProps) {
  const [usageNotes, setUsageNotes] = useState(initialUsageNotes);
  const [isRequired, setIsRequired] = useState(initialIsRequired);
  const [isSaving, setIsSaving] = useState(false);

  if (!tool) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(usageNotes, isRequired);
    } finally {
      setIsSaving(false);
    }
  };

  // Parse parameters to show
  let parametersList: { name: string; type: string; description?: string }[] = [];
  try {
    const schema = JSON.parse(tool.parameters);
    if (schema.properties) {
      parametersList = Object.entries(schema.properties).map(([name, def]: [string, any]) => ({
        name,
        type: def.type || "string",
        description: def.description,
      }));
    }
  } catch {
    // ignore
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 w-full max-w-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-neutral-500">settings_input_component</span>
            </div>
            <div>
              <h2 className="text-base font-medium text-neutral-100">{tool.name}</h2>
              <p className="text-sm text-neutral-500 mt-0.5">{tool.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#404040 transparent' }}
        >
          {/* Parameters Info */}
          {parametersList.length > 0 && (
            <div>
              <label className="block text-xs uppercase text-neutral-600 font-medium mb-3">Technical Parameters</label>
              <div className="grid grid-cols-1 gap-2">
                {parametersList.map((param) => (
                  <div key={param.name} className="flex items-start gap-3 bg-neutral-900/40 border border-neutral-800/50 rounded-lg p-3">
                    <code className="text-xs px-2 py-1 rounded bg-neutral-950 text-purple-400 border border-purple-500/10">{param.name}</code>
                    <div className="flex-1">
                      <span className="text-xs text-neutral-600 uppercase block mb-1">{param.type}</span>
                      {param.description && (
                        <p className="text-xs text-neutral-400">{param.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="bg-neutral-900/20 border border-neutral-800/50 rounded-lg p-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="w-10 h-6 bg-neutral-800 rounded-full transition-colors peer-checked:bg-emerald-500/20 border border-neutral-700 peer-checked:border-emerald-500/30"></div>
                <div className="absolute left-1 top-1 w-4 h-4 bg-neutral-400 rounded-full transition-all peer-checked:left-5 peer-checked:bg-emerald-400"></div>
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">Strict Requirement</span>
                <p className="text-xs text-neutral-500 mt-0.5">Force the AI to prioritize usage of this tool whenever applicable.</p>
              </div>
            </label>
          </div>

          {/* Usage Notes */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <label className="text-sm font-medium text-neutral-300">Contextual Instructions</label>
              <span className="text-xs text-neutral-600 uppercase">Custom Logic</span>
            </div>
            <p className="text-xs text-neutral-500 mb-3">
              Define the boundaries and specific triggers for this tool. This helps the AI understand "when" to reach for it.
            </p>
            <textarea
              value={usageNotes}
              onChange={(e) => setUsageNotes(e.target.value)}
              placeholder={`Example:\n- Use when the user asks specifically about financial projections.\n- Validate input against ISO-4217 currency codes.\n- Summarize output into a comparative table.`}
              rows={6}
              className="w-full bg-neutral-900/30 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none focus:border-neutral-600 transition-all resize-y font-mono"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-900/10 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-neutral-100 text-black text-sm font-medium rounded-lg hover:bg-white disabled:opacity-50 transition-all"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
