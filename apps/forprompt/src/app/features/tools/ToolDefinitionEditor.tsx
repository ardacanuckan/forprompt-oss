"use client";

import { useState, useEffect } from "react";
import { Button } from "@forprompt/ui/button";
import { cn } from "@forprompt/ui";
import { Id } from "~/convex/_generated/dataModel";

interface Parameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
}

interface ToolDefinitionEditorProps {
  orgId: Id<"organizations">;
  toolId?: Id<"organizationTools">;
  initialData?: {
    name: string;
    description: string;
    category?: string;
    parameters: string;
    exampleUsage?: string;
  };
  onSave: (data: {
    name: string;
    description: string;
    category?: string;
    parameters: string;
    exampleUsage?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  "database",
  "api",
  "utility",
  "file",
  "communication",
  "analytics",
  "other",
];

export function ToolDefinitionEditor({
  initialData,
  onSave,
  onCancel,
}: ToolDefinitionEditorProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [exampleUsage, setExampleUsage] = useState(initialData?.exampleUsage || "");
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showJsonPreview, setShowJsonPreview] = useState(false);

  // Parse initial parameters
  useEffect(() => {
    if (initialData?.parameters) {
      try {
        const schema = JSON.parse(initialData.parameters);
        const params: Parameter[] = [];
        
        if (schema.properties) {
          const required = schema.required || [];
          for (const [paramName, paramDef] of Object.entries(schema.properties)) {
            const def = paramDef as any;
            params.push({
              name: paramName,
              type: def.type || "string",
              description: def.description || "",
              required: required.includes(paramName),
            });
          }
        }
        
        setParameters(params);
      } catch (error) {
        console.error("Failed to parse parameters:", error);
      }
    }
  }, [initialData]);

  const addParameter = () => {
    setParameters([
      ...parameters,
      { name: "", type: "string", description: "", required: false },
    ]);
  };

  const updateParameter = (index: number, field: keyof Parameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const generateJsonSchema = () => {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    parameters.forEach((param) => {
      if (param.name) {
        properties[param.name] = {
          type: param.type,
          description: param.description || undefined,
        };
        if (param.required) {
          required.push(param.name);
        }
      }
    });

    return JSON.stringify(
      {
        type: "object",
        properties,
        ...(required.length > 0 && { required }),
      },
      null,
      2
    );
  };

  const handleSave = async () => {
    if (!name.trim() || !description.trim()) {
      alert("Name and description are required");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        category: category || undefined,
        parameters: generateJsonSchema(),
        exampleUsage: exampleUsage.trim() || undefined,
      });
    } catch (error: any) {
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh] bg-neutral-950">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-800 flex-shrink-0">
        <h2 className="text-lg font-semibold text-neutral-200">
          {initialData ? "Edit Tool" : "Create New Tool"}
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          Define a reusable tool for your AI agents
        </p>
      </div>

      {/* Content - with custom scrollbar */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-neutral-800 hover:scrollbar-thumb-neutral-700"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#404040 transparent'
        }}
      >
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tool Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., searchDatabase, sendEmail"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this tool do?"
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700"
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Parameters Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-neutral-300">Parameters</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowJsonPreview(!showJsonPreview)}
                className="text-xs text-neutral-500 hover:text-neutral-400 transition-colors"
              >
                {showJsonPreview ? "Hide" : "Show"} JSON
              </button>
              <Button
                onClick={addParameter}
                size="sm"
                className="h-7 px-3 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-0"
              >
                <span className="material-symbols-outlined text-[14px] mr-1">
                  add
                </span>
                Add Parameter
              </Button>
            </div>
          </div>

          {/* JSON Preview */}
          {showJsonPreview && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <pre className="text-xs text-neutral-400 font-mono overflow-x-auto">
                {generateJsonSchema()}
              </pre>
            </div>
          )}

          {/* Parameter List */}
          {parameters.length === 0 ? (
            <div className="text-center py-8 bg-neutral-900 border border-neutral-800 rounded-lg">
              <span className="material-symbols-outlined text-[32px] text-neutral-600">
                tune
              </span>
              <p className="text-sm text-neutral-500 mt-2">
                No parameters defined yet
              </p>
              <p className="text-xs text-neutral-600 mt-1">
                Click "Add Parameter" to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {parameters.map((param, index) => (
                <div
                  key={index}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) =>
                          updateParameter(index, "name", e.target.value)
                        }
                        placeholder="Parameter name"
                        className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                      />
                      <select
                        value={param.type}
                        onChange={(e) =>
                          updateParameter(index, "type", e.target.value)
                        }
                        className="bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 focus:outline-none focus:border-neutral-700"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                      </select>
                    </div>
                    <button
                      onClick={() => removeParameter(index)}
                      className="p-2 text-neutral-500 hover:text-red-500 transition-colors"
                      title="Remove parameter"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={param.description}
                    onChange={(e) =>
                      updateParameter(index, "description", e.target.value)
                    }
                    placeholder="Description"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded px-3 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={param.required}
                      onChange={(e) =>
                        updateParameter(index, "required", e.target.checked)
                      }
                      className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-neutral-400 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-sm text-neutral-400">Required</span>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Example Usage */}
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Example Usage
          </label>
          <textarea
            value={exampleUsage}
            onChange={(e) => setExampleUsage(e.target.value)}
            placeholder="Show how to use this tool..."
            rows={4}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-2 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none font-mono"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3 flex-shrink-0 bg-neutral-950">
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="h-9 px-4"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          size="sm"
          className="h-9 px-4 bg-white text-black hover:bg-white/90"
          disabled={isSaving || !name.trim() || !description.trim()}
        >
          {isSaving ? "Saving..." : initialData ? "Update Tool" : "Create Tool"}
        </Button>
      </div>
    </div>
  );
}

