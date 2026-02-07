/**
 * Formatter for tools information data
 */

export interface ToolInfo {
  name: string;
  description: string;
  isRequired?: boolean;
  usageNotes?: string;
  parameters?: string;
}

export interface ToolsInfoData {
  tools: ToolInfo[];
  toolsNotes?: string;
}

/**
 * Formats tools information into a structured section
 */
export function formatToolsInfo(data: ToolsInfoData): string {
  if (!data.tools || data.tools.length === 0) {
    return "";
  }

  let output = `--- LINKED TOOLS ---`;

  for (const tool of data.tools) {
    output += `\n\nTool: ${tool.name}`;
    output += `\nDescription: ${tool.description}`;
    if (tool.isRequired) output += `\nRequired: Yes`;
    if (tool.usageNotes) output += `\nUsage Notes: ${tool.usageNotes}`;
    if (tool.parameters) {
      try {
        const params = JSON.parse(tool.parameters);
        output += `\nParameters: ${JSON.stringify(params, null, 2)}`;
      } catch {
        // Skip malformed JSON
      }
    }
  }

  if (data.toolsNotes) {
    output += `\n\nTool Strategy:\n${data.toolsNotes}`;
  }

  output += `\n--- END LINKED TOOLS ---`;
  return output;
}

