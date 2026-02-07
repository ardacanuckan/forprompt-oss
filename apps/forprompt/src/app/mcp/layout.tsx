import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Server for Prompt Management",
  description: "Connect Claude, Cursor, and VS Code directly to your prompts with ForPrompt's native MCP (Model Context Protocol) server. Read, create, and update prompts from your AI assistant.",
  keywords: [
    "MCP server",
    "Model Context Protocol",
    "Claude MCP",
    "Cursor MCP",
    "VS Code MCP",
    "prompt management MCP",
    "AI assistant prompts",
    "MCP integration",
  ],
  openGraph: {
    title: "MCP Server for Prompt Management | ForPrompt",
    description: "Connect Claude, Cursor, and VS Code directly to your prompts with ForPrompt's native MCP server.",
    url: "https://forprompt.dev/mcp",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MCP Server for Prompt Management | ForPrompt",
    description: "Connect Claude, Cursor, and VS Code directly to your prompts with ForPrompt's native MCP server.",
  },
  alternates: {
    canonical: "https://forprompt.dev/mcp",
  },
};

// MCP Page JSON-LD Schema
const mcpPageSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "MCP Server for Prompt Management",
  description: "Connect Claude, Cursor, and VS Code directly to your prompts with ForPrompt's native MCP server.",
  url: "https://forprompt.dev/mcp",
  isPartOf: {
    "@type": "WebSite",
    name: "ForPrompt",
    url: "https://forprompt.dev",
  },
  about: {
    "@type": "SoftwareApplication",
    name: "ForPrompt MCP Server",
    applicationCategory: "DeveloperApplication",
    description: "MCP server for prompt management - version control, testing, and deployment for AI prompts",
  },
};

export default function MCPLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mcpPageSchema) }}
      />
      {children}
    </>
  );
}
