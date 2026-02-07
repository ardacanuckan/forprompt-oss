"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { SignInButton } from "@clerk/nextjs";
import { GrainOverlay, MagneticButton } from "@forprompt/ui";

// AI Agent configurations
const agentConfigs = [
  {
    id: "cursor",
    name: "Cursor",
    description: "AI-first code editor",
    configPath: ".cursor/mcp.json",
    config: `{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
      }
    }
  }
}`,
    instructions: [
      "Create .cursor folder in your project root",
      "Create mcp.json file inside .cursor folder",
      "Paste the configuration and add your Project API Key",
      "Restart Cursor to activate",
    ],
  },
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    description: "Anthropic's AI assistant",
    configPath: "~/Library/Application Support/Claude/claude_desktop_config.json",
    config: `{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
      }
    }
  }
}`,
    instructions: [
      "Open Claude Desktop settings",
      "Navigate to Developer > Edit Config",
      "Add ForPrompt to mcpServers",
      "Restart Claude Desktop",
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Claude in your terminal",
    configPath: "~/.claude.json",
    config: `{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
      }
    }
  }
}`,
    instructions: [
      "Create or edit ~/.claude.json",
      "Add the mcpServers configuration",
      "Replace your_project_api_key with your Project API Key",
      "Run claude to start using",
    ],
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "With Continue extension",
    configPath: "~/.continue/config.json",
    config: `{
  "mcpServers": [
    {
      "name": "forprompt",
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
      }
    }
  ]
}`,
    instructions: [
      "Install Continue extension in VS Code",
      "Open Continue settings (Cmd+Shift+P > Continue: Settings)",
      "Add ForPrompt to mcpServers array",
      "Reload VS Code window",
    ],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Codeium's AI IDE",
    configPath: "~/.codeium/windsurf/mcp_config.json",
    config: `{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
      }
    }
  }
}`,
    instructions: [
      "Open Windsurf settings",
      "Navigate to MCP configuration",
      "Add ForPrompt server configuration",
      "Restart Windsurf",
    ],
  },
  {
    id: "zed",
    name: "Zed",
    description: "High-performance editor",
    configPath: "~/.config/zed/settings.json",
    config: `{
  "assistant": {
    "version": "2",
    "mcp_servers": {
      "forprompt": {
        "command": "npx",
        "args": ["-y", "@forprompt/sdk", "mcp", "start"],
        "env": {
          "FORPROMPT_PROJECT_API_KEY": "your_project_api_key"
        }
      }
    }
  }
}`,
    instructions: [
      "Open Zed settings (Cmd+,)",
      "Add assistant.mcp_servers configuration",
      "Include ForPrompt server details",
      "Settings auto-reload",
    ],
  },
];

const capabilities = [
  {
    title: "Read & Search Prompts",
    description: "Access your entire prompt library. Search by name, key, or content. View prompt details including purpose, constraints, and version history.",
    commands: [
      "List all my prompts",
      "Show me the customer-support prompt",
      "Find prompts related to onboarding",
      "What are the constraints for sales-agent?",
    ],
  },
  {
    title: "Create New Prompts",
    description: "Create prompts directly from your AI assistant. Define purpose, behavior, constraints, and output format through natural conversation.",
    commands: [
      "Create a prompt for handling refund requests",
      "Make a new code-review prompt",
      "Set up a prompt with key lead-qualifier",
      "Clone support-agent as support-v2",
    ],
  },
  {
    title: "Update & Iterate",
    description: "Modify existing prompts without leaving your workflow. Each change creates a new version automatically.",
    commands: [
      "Update sales-pitch to be more conversational",
      "Add constraint: never promise discounts over 20%",
      "Change the output format to JSON",
      "Make onboarding-bot more friendly",
    ],
  },
  {
    title: "Version Control",
    description: "Track changes, compare versions, and rollback when needed. Every modification is versioned and reversible.",
    commands: [
      "Show version history of support-agent",
      "Compare v2 and v5 of sales-pitch",
      "Rollback customer-service to version 3",
      "What changed in the last update?",
    ],
  },
  {
    title: "Project Integration",
    description: "Let your AI assistant set up ForPrompt in your codebase. Auto-detect language, install SDK, and generate type definitions.",
    commands: [
      "Set up ForPrompt in this project",
      "Generate TypeScript types for my prompts",
      "Show me how to use this prompt in code",
      "Install the Python SDK",
    ],
  },
  {
    title: "Deploy & Activate",
    description: "Manage which version is active in production. Deploy with confidence knowing you can rollback instantly.",
    commands: [
      "Deploy version 4 of onboarding to production",
      "Activate the latest version of support-bot",
      "Which version is currently active?",
      "Rollback to the previous version",
    ],
  },
];

const expandableSections = [
  {
    id: "use-cases",
    title: "Use Cases",
    content: [
      {
        title: "Customer Support Automation",
        description: "Build and iterate on support prompts that handle refunds, order issues, and account problems. Define escalation rules and update behavior based on real conversations.",
      },
      {
        title: "Sales & Lead Qualification",
        description: "Create prompts that qualify leads, schedule demos, and guide conversations. Adjust tone and approach based on conversion data.",
      },
      {
        title: "Code Review Assistants",
        description: "Set up prompts that review code following your team's style guide. Add constraints for security checks, performance patterns, and documentation requirements.",
      },
      {
        title: "Onboarding Flows",
        description: "Design prompts that guide new users through your product. Update messaging and add new features without code changes.",
      },
      {
        title: "Content Generation",
        description: "Manage prompts for blog posts, social media, and marketing copy. Version different tones and formats for A/B testing.",
      },
      {
        title: "Data Analysis",
        description: "Create prompts for analyzing data, generating reports, and extracting insights. Iterate on output formats and analysis depth.",
      },
    ],
  },
  {
    id: "workflow",
    title: "Example Workflow",
    steps: [
      {
        step: "1",
        action: "Create the prompt",
        command: "Create a prompt called support-agent for customer inquiries",
        result: "New prompt created with key support-agent",
      },
      {
        step: "2",
        action: "Define purpose",
        command: "Set purpose: Help customers resolve order and account issues",
        result: "Purpose field updated",
      },
      {
        step: "3",
        action: "Add constraints",
        command: "Add constraints: escalate refunds over $500, verify identity first",
        result: "Constraints added to prompt",
      },
      {
        step: "4",
        action: "Generate output",
        command: "Generate the system prompt",
        result: "Full system prompt generated from configuration",
      },
      {
        step: "5",
        action: "Deploy",
        command: "Deploy to production",
        result: "Prompt synced to your codebase",
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    questions: [
      {
        q: "What is MCP?",
        a: "Model Context Protocol (MCP) is an open standard by Anthropic that lets AI assistants connect to external tools. ForPrompt uses MCP so your AI can access prompts directly.",
      },
      {
        q: "Which tools support MCP?",
        a: "Claude Desktop, Claude Code, Cursor, VS Code (Continue), Windsurf, Zed, and other MCP-compatible tools.",
      },
      {
        q: "How do I get my Project API Key?",
        a: "Sign in to ForPrompt, open your project, go to Project Settings → API Keys, create a new key, and add it to your MCP configuration.",
      },
      {
        q: "Is MCP included in the free tier?",
        a: "Yes. MCP access is available on all plans including free.",
      },
      {
        q: "Can I use multiple AI tools?",
        a: "Yes. Configure ForPrompt in all your tools. They share the same prompts in real-time.",
      },
      {
        q: "Is my data secure?",
        a: "The MCP server runs locally on your machine and communicates with ForPrompt using your encrypted Project API Key.",
      },
      {
        q: "How do team permissions work?",
        a: "Team members share the same Project API Key. Access is controlled at the project level in ForPrompt.",
      },
    ],
  },
];

function CodeBlock({ code, configPath }: { code: string; configPath: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-neutral-800 overflow-hidden bg-neutral-950">
      <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
        <code className="text-xs text-neutral-400 font-mono">{configPath}</code>
        <button
          onClick={handleCopy}
          className="text-xs text-neutral-500 hover:text-white transition-colors flex items-center gap-1.5 px-2 py-1 rounded hover:bg-neutral-800"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[13px] text-neutral-300 overflow-x-auto font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ExpandableSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-neutral-900 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-neutral-950 transition-colors"
      >
        <span className="text-sm font-medium text-white">{title}</span>
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-neutral-900">
          {children}
        </div>
      )}
    </div>
  );
}

export default function MCPPage() {
  const [activeAgent, setActiveAgent] = useState("cursor");
  const selectedAgent = agentConfigs.find((a) => a.id === activeAgent) || agentConfigs[0];

  return (
    <div className="min-h-screen bg-black text-white">
      <GrainOverlay />

      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-900 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3 max-w-5xl mx-auto">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="ForPrompt" width={20} height={20} />
            <span className="text-[15px] font-medium text-white">forprompt</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-[13px] text-neutral-400 hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/blog" className="text-[13px] text-neutral-400 hover:text-white transition-colors">
              Blog
            </Link>
            <SignInButton mode="modal">
              <button className="px-3.5 py-1.5 text-[13px] font-medium text-black bg-white hover:bg-neutral-200 rounded-md transition-colors">
                Get Started
              </button>
            </SignInButton>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 text-[11px] font-medium text-neutral-400 bg-neutral-900 rounded-md border border-neutral-800 uppercase tracking-wider">
              MCP Integration
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-medium leading-[1.1] mb-5 tracking-tight">
            Manage prompts from
            <br />
            <span className="text-white">your AI assistant</span>
          </h1>
          <p className="text-lg text-neutral-400 max-w-2xl leading-relaxed mb-8">
            Connect Claude, Cursor, VS Code, and more to ForPrompt. 
            Read, create, update, and version prompts directly from your development environment.
          </p>
          <div className="flex flex-wrap gap-3">
            <SignInButton mode="modal">
              <MagneticButton size="lg" variant="primary">
                Get Project API Key
              </MagneticButton>
            </SignInButton>
            <Link href="#setup">
              <MagneticButton size="lg" variant="secondary">
                Setup Guide
              </MagneticButton>
            </Link>
          </div>
        </div>
      </section>

      {/* What you can do */}
      <section className="py-16 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium mb-3">What you can do with MCP</h2>
          <p className="text-neutral-500 mb-10">
            Control your prompts through natural language commands
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {capabilities.map((cap) => (
              <div key={cap.title} className="p-5 rounded-lg border border-neutral-900 bg-neutral-950/30">
                <h3 className="text-sm font-medium text-white mb-2">{cap.title}</h3>
                <p className="text-xs text-neutral-500 mb-4 leading-relaxed">{cap.description}</p>
                <div className="space-y-1.5">
                  {cap.commands.map((cmd, idx) => (
                    <div key={idx} className="px-2.5 py-1.5 rounded bg-neutral-900/50 border border-neutral-800">
                      <code className="text-[11px] text-neutral-400">&quot;{cmd}&quot;</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Setup Section */}
      <section id="setup" className="py-16 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-medium mb-3">Setup</h2>
          <p className="text-neutral-500 mb-8">Select your editor and add the configuration</p>

          {/* Agent Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {agentConfigs.map((agent) => (
              <button
                key={agent.id}
                onClick={() => setActiveAgent(agent.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeAgent === agent.id
                    ? "bg-white text-black"
                    : "bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {agent.name}
              </button>
            ))}
          </div>

          {/* Selected Agent Config */}
          {selectedAgent && (
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-base font-medium text-white mb-1">{selectedAgent.name}</h3>
                <p className="text-xs text-neutral-500 mb-6">{selectedAgent.description}</p>
                
                <div className="space-y-3">
                  {selectedAgent.instructions.map((instruction, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-[10px] text-neutral-500">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-neutral-400">{instruction}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <CodeBlock code={selectedAgent.config} configPath={selectedAgent.configPath} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Expandable Sections */}
      <section className="py-16 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto space-y-4">
          
          {/* Use Cases */}
          <ExpandableSection title="Use Cases">
            <div className="grid md:grid-cols-2 gap-4 pt-4">
              {expandableSections[0]?.content?.map((item: { title: string; description: string }, idx: number) => (
                <div key={idx} className="p-4 rounded-lg bg-neutral-950 border border-neutral-900">
                  <h4 className="text-sm font-medium text-white mb-1">{item.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Workflow Example */}
          <ExpandableSection title="Example Workflow: Building a Support Prompt">
            <div className="space-y-4 pt-4">
              {expandableSections[1]?.steps?.map((step: { step: string; action: string; command: string; result: string }) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs text-neutral-500">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white mb-1">{step.action}</div>
                    <div className="px-3 py-2 rounded bg-neutral-950 border border-neutral-800 mb-1">
                      <code className="text-xs text-neutral-400">&quot;{step.command}&quot;</code>
                    </div>
                    <div className="text-xs text-neutral-600">{step.result}</div>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* FAQ */}
          <ExpandableSection title="FAQ">
            <div className="space-y-4 pt-4">
              {expandableSections[2]?.questions?.map((item: { q: string; a: string }, idx: number) => (
                <div key={idx} className="pb-4 border-b border-neutral-900 last:border-0 last:pb-0">
                  <h4 className="text-sm font-medium text-white mb-1">{item.q}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </ExpandableSection>

        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 border-t border-neutral-900">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-medium mb-3">Ready to connect?</h2>
          <p className="text-neutral-500 mb-6">
            Get your Project API Key and start managing prompts from your AI assistant.
          </p>
          <SignInButton mode="modal">
            <MagneticButton size="lg" variant="primary">
              Get Started Free
            </MagneticButton>
          </SignInButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-900">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="ForPrompt" width={16} height={16} />
            <span className="text-xs text-neutral-600">ForPrompt © 2026</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-neutral-500">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <a
              href="https://www.linkedin.com/company/forprompt/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
