"use client";

import { useState } from "react";
import { Button } from "@forprompt/ui/button";
import { cn } from "@forprompt/ui";

interface Tool {
  name: string;
  description: string;
  parameters: string;
  exampleUsage?: string;
}

// Client-side formatter functions (duplicated from backend)
function toOpenAIFormat(tool: Tool) {
  let parameters;
  try {
    parameters = JSON.parse(tool.parameters);
  } catch (error) {
    parameters = { type: "object", properties: {} };
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters,
  };
}

function toAnthropicFormat(tool: Tool) {
  let inputSchema;
  try {
    inputSchema = JSON.parse(tool.parameters);
  } catch (error) {
    inputSchema = { type: "object", properties: {} };
  }

  return {
    name: tool.name,
    description: tool.description,
    input_schema: inputSchema,
  };
}

function toGenericFormat(tool: Tool) {
  let parameters;
  try {
    parameters = JSON.parse(tool.parameters);
  } catch (error) {
    parameters = { type: "object", properties: {} };
  }

  return {
    name: tool.name,
    description: tool.description,
    schema: parameters,
  };
}

function toMarkdownDocs(tool: Tool): string {
  let parameters;
  try {
    parameters = JSON.parse(tool.parameters);
  } catch (error) {
    parameters = { type: "object", properties: {} };
  }

  let markdown = `# ${tool.name}\n\n`;
  markdown += `${tool.description}\n\n`;
  
  markdown += `## Parameters\n\n`;
  
  if (parameters.properties) {
    const required = parameters.required || [];
    
    for (const [paramName, paramDef] of Object.entries(parameters.properties)) {
      const def = paramDef as any;
      const isRequired = required.includes(paramName);
      const requiredTag = isRequired ? " *(required)*" : " *(optional)*";
      
      markdown += `### ${paramName}${requiredTag}\n\n`;
      markdown += `- **Type:** ${def.type || "any"}\n`;
      if (def.description) {
        markdown += `- **Description:** ${def.description}\n`;
      }
      markdown += `\n`;
    }
  } else {
    markdown += `No parameters defined.\n\n`;
  }
  
  if (tool.exampleUsage) {
    markdown += `## Example Usage\n\n`;
    markdown += `\`\`\`\n${tool.exampleUsage}\n\`\`\`\n`;
  }
  
  return markdown;
}

interface ToolExporterProps {
  tools: Tool[];
  onClose: () => void;
}

type ExportFormat = "openai" | "anthropic" | "generic" | "markdown";

export function ToolExporter({ tools, onClose }: ToolExporterProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("openai");
  const [copied, setCopied] = useState(false);

  const formats = [
    {
      id: "openai" as ExportFormat,
      label: "OpenAI",
      description: "Function calling format",
      icon: "code",
    },
    {
      id: "anthropic" as ExportFormat,
      label: "Anthropic",
      description: "Tool use format",
      icon: "code",
    },
    {
      id: "generic" as ExportFormat,
      label: "Generic JSON",
      description: "Universal format",
      icon: "data_object",
    },
    {
      id: "markdown" as ExportFormat,
      label: "Markdown",
      description: "Documentation",
      icon: "description",
    },
  ];

  const generateExport = () => {
    switch (selectedFormat) {
      case "openai":
        return JSON.stringify(
          tools.map((tool) => toOpenAIFormat(tool)),
          null,
          2
        );
      case "anthropic":
        return JSON.stringify(
          tools.map((tool) => toAnthropicFormat(tool)),
          null,
          2
        );
      case "generic":
        return JSON.stringify(
          tools.map((tool) => toGenericFormat(tool)),
          null,
          2
        );
      case "markdown":
        return tools
          .map((tool) => toMarkdownDocs(tool, tool.exampleUsage))
          .join("\n\n---\n\n");
    }
  };

  const exportContent = generateExport();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleDownload = () => {
    const extension = selectedFormat === "markdown" ? "md" : "json";
    const blob = new Blob([exportContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tools-export.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-neutral-950 rounded-lg shadow-2xl border border-neutral-800 w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-200">Export Tools</h2>
              <p className="text-sm text-neutral-500 mt-1">
                Export {tools.length} {tools.length === 1 ? "tool" : "tools"} in various formats
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Format Selector */}
        <div className="px-6 py-4 border-b border-neutral-800">
          <div className="grid grid-cols-4 gap-2">
            {formats.map((format) => (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={cn(
                  "p-3 rounded-lg border transition-all text-left",
                  selectedFormat === format.id
                    ? "bg-neutral-800 border-neutral-700"
                    : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "material-symbols-outlined text-[16px]",
                      selectedFormat === format.id
                        ? "text-neutral-200"
                        : "text-neutral-500"
                    )}
                  >
                    {format.icon}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      selectedFormat === format.id
                        ? "text-neutral-200"
                        : "text-neutral-400"
                    )}
                  >
                    {format.label}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">{format.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-hidden p-6">
          <div className="h-full bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <span className="text-xs text-neutral-500 font-mono">
                Preview
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neutral-600">
                  {exportContent.split("\n").length} lines
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs text-neutral-300 font-mono whitespace-pre-wrap">
                {exportContent}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-between">
          <div className="text-xs text-neutral-500">
            Ready to export in {formats.find((f) => f.id === selectedFormat)?.label} format
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCopy}
              size="sm"
              className="h-9 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border-0"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button
              onClick={handleDownload}
              size="sm"
              className="h-9 px-4 bg-white text-black hover:bg-white/90"
            >
              <span className="material-symbols-outlined text-[16px] mr-1.5">
                download
              </span>
              Download
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

