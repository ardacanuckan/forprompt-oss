/**
 * Tool format conversion utilities
 * Converts tool definitions to various AI framework formats
 */

interface Tool {
  name: string;
  description: string;
  parameters: string; // JSON schema as string
}

/**
 * Convert tool definition to OpenAI function calling format
 */
export function toOpenAIFormat(tool: Tool) {
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

/**
 * Convert tool definition to Anthropic tool use format
 */
export function toAnthropicFormat(tool: Tool) {
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

/**
 * Convert tool definition to generic JSON format
 */
export function toGenericFormat(tool: Tool) {
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

/**
 * Convert tool definition to markdown documentation
 */
export function toMarkdownDocs(tool: Tool, exampleUsage?: string): string {
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
  
  if (exampleUsage) {
    markdown += `## Example Usage\n\n`;
    markdown += `\`\`\`\n${exampleUsage}\n\`\`\`\n`;
  }
  
  return markdown;
}

/**
 * Convert multiple tools to OpenAI format
 */
export function toolsToOpenAIFormat(tools: Tool[]) {
  return tools.map(toOpenAIFormat);
}

/**
 * Convert multiple tools to Anthropic format
 */
export function toolsToAnthropicFormat(tools: Tool[]) {
  return tools.map(toAnthropicFormat);
}

/**
 * Convert multiple tools to generic format
 */
export function toolsToGenericFormat(tools: Tool[]) {
  return tools.map(toGenericFormat);
}

