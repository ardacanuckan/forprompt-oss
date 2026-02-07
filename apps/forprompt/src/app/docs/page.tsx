"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const sections = [
  { id: "quickstart", label: "Quick Start" },
  { id: "api", label: "API Reference" },
  { id: "sdk", label: "SDK" },
  { id: "mcp", label: "MCP Server" },
  { id: "logging", label: "Logging" },
  { id: "authentication", label: "Authentication" },
  { id: "versioning", label: "Versioning" },
  { id: "best-practices", label: "Best Practices" },
];

function PageActions({ sectionId }: { sectionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const pageContent = () => document.getElementById('doc-content')?.innerText || '';

  const handleCopy = async (text: string, item: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedItem(item);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const mcpServerUrl = "npx forprompt mcp start";

  const actions = [
    {
      id: 'copy-page',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Copy page',
      description: 'Copy page as Markdown for LLMs',
      action: () => handleCopy(pageContent(), 'copy-page'),
    },
    {
      id: 'open-chatgpt',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
        </svg>
      ),
      title: 'Open in ChatGPT',
      description: 'Ask questions about this page',
      action: () => window.open(`https://chat.openai.com/?q=${encodeURIComponent('Help me understand this documentation: ' + pageUrl)}`, '_blank'),
      external: true,
    },
    {
      id: 'open-claude',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M4.603 15.297l2.265-3.387L4.603 8.7V5.25L12 12l-7.397 6.75v-3.453zm7.397.453L4.603 21.75h14.794L12 15.75zm7.397-6.55v3.453L12 19.5V12l7.397-6.75v3.45l-2.265 3.212 2.265 3.388z"/>
        </svg>
      ),
      title: 'Open in Claude',
      description: 'Ask questions about this page',
      action: () => window.open(`https://claude.ai/new?q=${encodeURIComponent('Help me understand this documentation: ' + pageUrl)}`, '_blank'),
      external: true,
    },
    {
      id: 'open-perplexity',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      title: 'Open in Perplexity',
      description: 'Ask questions about this page',
      action: () => window.open(`https://perplexity.ai/?q=${encodeURIComponent('Help me understand this documentation: ' + pageUrl)}`, '_blank'),
      external: true,
    },
    { id: 'divider-1', divider: true },
    {
      id: 'copy-mcp',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
        </svg>
      ),
      title: 'Copy MCP Server',
      description: 'Copy MCP Server command to clipboard',
      action: () => handleCopy(mcpServerUrl, 'copy-mcp'),
    },
    {
      id: 'connect-cursor',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.5 3l14 9-14 9V3z"/>
        </svg>
      ),
      title: 'Connect to Cursor',
      description: 'Install MCP Server on Cursor',
      action: () => window.open('cursor://settings/mcp', '_blank'),
      external: true,
    },
    {
      id: 'connect-vscode',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.583 2.207L9.429 9.13l-5.22-4.038L2 6.095v11.81l2.209 1.003 5.22-4.038 8.154 6.923L22 19.79V4.21l-4.417-2.003zM4.209 15.263V8.737l3.401 3.263-3.401 3.263zm13.374 1.738l-5.926-5.001 5.926-5.001v10.002z"/>
        </svg>
      ),
      title: 'Connect to VS Code',
      description: 'Install MCP Server on VS Code',
      action: () => window.open('vscode://settings/mcp', '_blank'),
      external: true,
    },
  ];

  return (
    <div className="flex justify-end mb-6 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-[13px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 rounded-md transition-all text-neutral-300 hover:text-neutral-100"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy page
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl z-50 overflow-hidden">
            <div className="py-1">
              {actions.map((action) =>
                action.divider ? (
                  <div key={action.id} className="my-1 border-t border-neutral-800" />
                ) : (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.action?.();
                      if (!action.external) {
                        setTimeout(() => setIsOpen(false), 500);
                      } else {
                        setIsOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-800 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-md bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-neutral-200 group-hover:bg-neutral-700 transition-colors">
                      {action.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-medium text-neutral-200">
                          {copiedItem === action.id ? 'Copied!' : action.title}
                        </span>
                        {action.external && (
                          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">{action.description}</div>
                    </div>
                  </button>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden group">
      <div className="px-3 py-2 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wide">{language}</span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-neutral-500 hover:text-neutral-200 transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          fontSize: "0.75rem",
          background: "transparent",
        }}
        codeTagProps={{
          style: {
            fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("quickstart");

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      <div className="flex h-full w-full">
        {/* Sidebar */}
        <aside className="w-56 border-r border-neutral-900 flex flex-col bg-black">
          <div className="p-5 border-b border-neutral-900">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium hover:opacity-70 transition-opacity">
              <Image src="/logo.png" alt="ForPrompt" width={20} height={20} />
              <span className="text-white">forprompt</span>
            </Link>
          </div>
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="text-[10px] text-neutral-600 uppercase tracking-wider mb-3 px-3">Documentation</div>
            <div className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 text-[13px] rounded-lg transition-all ${
                    activeSection === section.id
                      ? "bg-neutral-900 text-white border border-neutral-800"
                      : "text-neutral-500 hover:text-white hover:bg-neutral-950"
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>
          <div className="p-4 border-t border-neutral-800">
            <div className="text-[10px] text-white/30">© 2026 forprompt</div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-black/20">
          <div className="max-w-2xl mx-auto px-10 py-16">
            <PageActions sectionId={activeSection} />
            <div id="doc-content">
            {activeSection === "quickstart" && (
            <div>
              <h1 className="text-xl font-medium mb-6">Quick Start</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Get up and running with ForPrompt in under 5 minutes.
              </p>

              {/* Key Concept */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-8">
                <p className="text-xs text-emerald-200/80">
                  <strong className="text-emerald-300">How it works:</strong> ForPrompt stores your prompts in the cloud with versioning and AI editing. When you're ready, run <code className="bg-neutral-800 px-1 rounded">forprompt deploy</code> to generate local TypeScript files. Your code imports these files directly — <strong>no runtime API calls needed</strong>.
                </p>
              </div>

              <h2 className="text-sm font-medium mb-3">1. Install the SDK</h2>
              <CodeBlock
                language="bash"
                code={`npm install @forprompt/sdk`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">2. Create a prompt in the dashboard</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Sign in to your dashboard and create a new prompt. Give it a unique key like <code className="bg-neutral-800 px-1 rounded">onboarding</code> or <code className="bg-neutral-800 px-1 rounded">customer-support</code>.
              </p>

              <h2 className="text-sm font-medium mb-3 mt-8">3. Initialize and deploy</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Run these commands in your project directory:
              </p>
              <CodeBlock
                language="bash"
                code={`# Initialize ForPrompt (creates .forprompt config)
npx forprompt init

# Deploy prompts to local files
npx forprompt deploy`}
              />
              <p className="text-xs text-neutral-9000 mt-3 mb-4">
                This creates a <code className="bg-neutral-800 px-1 rounded">forprompt/</code> directory with your prompts as TypeScript files.
              </p>

              <h2 className="text-sm font-medium mb-3 mt-8">4. Import and use</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Import prompts directly — no API key or network calls needed at runtime:
              </p>
              <CodeBlock
                language="typescript"
                code={`// Import your prompt (it's just a string!)
import { onboarding } from "./forprompt";

// Use with any LLM provider
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 1024,
  system: onboarding,  // Your prompt from ForPrompt
  messages: [{ role: "user", content: "Hello!" }]
});`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">5. Update prompts</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                When you update prompts in the dashboard, sync them to your codebase:
              </p>
              <CodeBlock
                language="bash"
                code={`# Sync latest prompts
npx forprompt deploy

# Commit to version control
git add forprompt/
git commit -m "Update prompts"`}
              />

              <div className="mt-8 p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                <h3 className="text-sm font-medium text-white mb-2">That's it!</h3>
                <p className="text-xs text-neutral-400">
                  Your prompts are now managed in ForPrompt (with AI editing, versioning, testing) but your app uses simple local imports with zero latency. Check out the <button onClick={() => setActiveSection("sdk")} className="text-emerald-400 hover:underline">SDK docs</button> for more details.
                </p>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div>
              <h1 className="text-xl font-medium mb-6">API Reference</h1>
              <p className="text-sm text-neutral-400 mb-8">
                All API endpoints use the base URL <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-xs">https://forprompt.dev/api</code>
              </p>

              <div className="space-y-8">
                {/* Get Prompt */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neutral-700 text-white rounded">GET</span>
                    <code className="text-xs font-mono text-neutral-300">/prompts?key=:key</code>
                  </div>
                  <p className="text-xs text-neutral-9000 mb-3">
                    Fetch a prompt by its key. Returns the active version.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`curl "https://forprompt.dev/api/prompts?key=onboarding" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  />
                  <p className="text-xs text-neutral-9000 mt-3 mb-3">Response:</p>
                  <CodeBlock
                    language="json"
                    code={`{
  "key": "onboarding",
  "name": "Onboarding Assistant",
  "description": "Helps users get started",
  "versionNumber": 3,
  "systemPrompt": "You are a helpful assistant...",
  "updatedAt": 1705312200000,
  "purpose": "Guide new users",
  "expectedBehavior": "Friendly and welcoming",
  "inputFormat": "User questions",
  "outputFormat": "Helpful responses",
  "constraints": "Keep responses concise",
  "useCases": "Onboarding flow",
  "additionalNotes": "Updated weekly",
  "toolsNotes": "No tools required"
}`}
                  />
                </div>

                {/* Get Specific Version */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-neutral-700 text-white rounded">GET</span>
                    <code className="text-xs font-mono text-neutral-300">/prompts?key=:key&version=:version</code>
                  </div>
                  <p className="text-xs text-neutral-9000 mb-3">
                    Fetch a specific version of a prompt.
                  </p>
                  <CodeBlock
                    language="bash"
                    code={`curl "https://forprompt.dev/api/prompts?key=onboarding&version=2" \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  />
                </div>
              </div>

              <h2 className="text-sm font-medium mt-10 mb-4">Error Codes</h2>
              <div className="space-y-2 text-xs">
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-12">400</code>
                  <span className="text-neutral-9000">Missing key parameter</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-12">401</code>
                  <span className="text-neutral-9000">Invalid or missing API key</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-12">404</code>
                  <span className="text-neutral-9000">Prompt not found</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-12">429</code>
                  <span className="text-neutral-9000">Rate limit exceeded</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-12">500</code>
                  <span className="text-neutral-9000">Internal server error</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === "sdk" && (
            <div>
              <h1 className="text-xl font-medium mb-6">SDK</h1>
              <p className="text-sm text-neutral-400 mb-4">
                Official TypeScript/JavaScript SDK for ForPrompt. Python SDK coming soon.
              </p>

              {/* Key Concept Alert */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-400 text-lg">💡</span>
                  <div>
                    <p className="text-sm text-emerald-300 font-medium mb-1">Local Files = Recommended Approach</p>
                    <p className="text-xs text-emerald-200/70">
                      ForPrompt generates local TypeScript files that you import directly. <strong>No runtime API calls needed.</strong> This gives you zero latency, offline support, and type safety.
                    </p>
                  </div>
                </div>
              </div>

              <h2 className="text-sm font-medium mb-3">Installation</h2>
              <CodeBlock
                language="bash"
                code={`npm install @forprompt/sdk`}
              />

              {/* Two Approaches Section */}
              <div className="mt-10 mb-8">
                <h2 className="text-base font-medium mb-4">Two Ways to Use ForPrompt</h2>

                <div className="grid grid-cols-2 gap-4">
                  {/* Local Files - Recommended */}
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded font-medium">RECOMMENDED</span>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-2">Local Files</h3>
                    <ul className="text-[11px] text-neutral-9000 space-y-1">
                      <li>✓ Zero latency (no network calls)</li>
                      <li>✓ Works offline</li>
                      <li>✓ Full type safety</li>
                      <li>✓ Version controlled with your code</li>
                      <li>✓ No runtime dependencies</li>
                    </ul>
                  </div>

                  {/* API Fetching */}
                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] bg-neutral-800 text-neutral-400 rounded font-medium">ALTERNATIVE</span>
                    </div>
                    <h3 className="text-sm font-medium text-white mb-2">API Fetching</h3>
                    <ul className="text-[11px] text-neutral-9000 space-y-1">
                      <li>• Real-time updates without deploy</li>
                      <li>• Good for rapid prototyping</li>
                      <li>• Requires network connectivity</li>
                      <li>• Adds latency to requests</li>
                      <li>• Needs API key at runtime</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Local Files Workflow */}
              <div className="border-t border-neutral-800 pt-8 mt-8">
                <h2 className="text-base font-medium mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  Local Files (Recommended)
                </h2>

                <h3 className="text-sm font-medium mb-3 mt-6">Step 1: Initialize your project</h3>
                <CodeBlock
                  language="bash"
                  code={`npx forprompt init`}
                />
                <p className="text-xs text-neutral-9000 mt-2 mb-4">
                  This creates a <code className="bg-neutral-800 px-1 rounded">.forprompt</code> config file with your API key and settings.
                </p>

                <h3 className="text-sm font-medium mb-3 mt-6">Step 2: Deploy prompts to local files</h3>
                <CodeBlock
                  language="bash"
                  code={`npx forprompt deploy`}
                />
                <p className="text-xs text-neutral-9000 mt-2 mb-4">
                  This fetches all your prompts from ForPrompt and creates local TypeScript files:
                </p>
                <CodeBlock
                  language="text"
                  code={`your-project/
├── forprompt/
│   ├── index.ts              # Re-exports all prompts + getPrompt helper
│   ├── onboarding/
│   │   └── prompt.ts         # export const onboarding = "..."
│   ├── customer_support/
│   │   └── prompt.ts         # export const customer_support = "..."
│   └── code_review/
│       └── prompt.ts         # export const code_review = "..."`}
                />

                <h3 className="text-sm font-medium mb-3 mt-6">Step 3: Import and use</h3>
                <CodeBlock
                  language="typescript"
                  code={`// Option 1: Import specific prompt directly
import { onboarding } from "./forprompt";

// Option 2: Use the getPrompt helper (type-safe)
import { getPrompt } from "./forprompt";
const prompt = getPrompt("onboarding");

// Use with any LLM
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  system: prompt,  // It's just a string!
  messages: [{ role: "user", content: "Hello" }]
});`}
                />

                <h3 className="text-sm font-medium mb-3 mt-6">Step 4: Update prompts</h3>
                <p className="text-xs text-neutral-9000 mb-4">
                  When you update prompts in the ForPrompt dashboard, run deploy again:
                </p>
                <CodeBlock
                  language="bash"
                  code={`# Sync latest changes
npx forprompt deploy

# Sync and remove locally deleted prompts
npx forprompt deploy --clean`}
                />

                {/* Template Variables */}
                <h3 className="text-sm font-medium mb-3 mt-8">Using Template Variables</h3>
                <p className="text-xs text-neutral-9000 mb-4">
                  Prompts can contain <code className="bg-neutral-800 px-1 rounded">{"{{variables}}"}</code> for dynamic content:
                </p>
                <CodeBlock
                  language="typescript"
                  code={`// Your prompt in ForPrompt:
// "You are a {{role}} assistant. Help the user with {{task}}."

import { customer_support } from "./forprompt";

// Simple string replacement
function fillTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\\{\\{(\\w+)\\}\\}/g, (_, key) => vars[key] ?? "");
}

const prompt = fillTemplate(customer_support, {
  role: "friendly support",
  task: "billing questions"
});

// Result: "You are a friendly support assistant. Help the user with billing questions."`}
                />
              </div>

              {/* API Fetching Workflow */}
              <div className="border-t border-neutral-800 pt-8 mt-8">
                <h2 className="text-base font-medium mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-neutral-800 text-neutral-400 flex items-center justify-center text-xs font-bold">2</span>
                  API Fetching (Alternative)
                </h2>
                <p className="text-xs text-neutral-9000 mb-4">
                  For cases where you need real-time prompt updates without redeploying, use the API client:
                </p>

                <CodeBlock
                  language="typescript"
                  code={`import { forprompt } from "@forprompt/sdk";

// Auto-loads from FORPROMPT_API_KEY environment variable
const prompt = await forprompt.getPrompt("onboarding");
console.log(prompt.systemPrompt);
console.log(prompt.versionNumber);`}
                />

                <h3 className="text-sm font-medium mb-3 mt-6">Custom Configuration</h3>
                <CodeBlock
                  language="typescript"
                  code={`import { createForPrompt } from "@forprompt/sdk";

const client = createForPrompt({
  apiKey: "fp_xxx",
  baseUrl: "https://forprompt.dev",
});

const prompt = await client.getPrompt("onboarding");`}
                />

                <h3 className="text-sm font-medium mb-3 mt-6">Get Specific Version</h3>
                <CodeBlock
                  language="typescript"
                  code={`const promptV2 = await forprompt.getPrompt("onboarding", { version: 2 });`}
                />

                <h3 className="text-sm font-medium mb-3 mt-6">Get Multiple Prompts</h3>
                <CodeBlock
                  language="typescript"
                  code={`const prompts = await forprompt.getPrompts(["onboarding", "support"]);
prompts.forEach((prompt, key) => {
  console.log(\`\${key}: \${prompt.systemPrompt}\`);
});`}
                />

                <div className="mt-6 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-200/80">
                    <strong className="text-amber-300">⚠️ Note:</strong> API fetching adds network latency to every request. For production apps, prefer local files with <code className="bg-neutral-800 px-1 rounded">forprompt deploy</code>.
                  </p>
                </div>
              </div>

              {/* CLI Reference */}
              <div className="border-t border-neutral-800 pt-8 mt-8">
                <h2 className="text-base font-medium mb-4">CLI Commands</h2>

                <div className="space-y-4">
                  <div>
                    <code className="text-neutral-200 font-mono text-sm">npx forprompt init</code>
                    <p className="text-xs text-neutral-9000 mt-1">Initialize ForPrompt in your project. Creates <code className="bg-neutral-800 px-1 rounded">.forprompt</code> config file.</p>
                  </div>

                  <div>
                    <code className="text-neutral-200 font-mono text-sm">npx forprompt deploy</code>
                    <p className="text-xs text-neutral-9000 mt-1">Fetch all prompts and generate local TypeScript files in <code className="bg-neutral-800 px-1 rounded">./forprompt/</code></p>
                  </div>

                  <div>
                    <code className="text-neutral-200 font-mono text-sm">npx forprompt deploy --clean</code>
                    <p className="text-xs text-neutral-9000 mt-1">Deploy and remove locally deleted prompts.</p>
                  </div>

                  <div>
                    <code className="text-neutral-200 font-mono text-sm">npx forprompt deploy --output ./src/prompts</code>
                    <p className="text-xs text-neutral-9000 mt-1">Deploy to a custom directory.</p>
                  </div>
                </div>
              </div>

              {/* TypeScript Types */}
              <div className="border-t border-neutral-800 pt-8 mt-8">
                <h2 className="text-base font-medium mb-4">TypeScript Types</h2>
                <CodeBlock
                  language="typescript"
                  code={`import type { Prompt, ForPromptConfig, GetPromptOptions } from "@forprompt/sdk";

// API response type
interface Prompt {
  key: string;
  name: string;
  systemPrompt: string;
  versionNumber: number;
  description?: string;
  purpose?: string;
  expectedBehavior?: string;
  // ...more metadata fields
}`}
                />
              </div>

              {/* Best Practice Summary */}
              <div className="border-t border-neutral-800 pt-8 mt-8">
                <h2 className="text-base font-medium mb-4">Recommended Workflow</h2>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <ol className="text-xs text-neutral-300 space-y-3">
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">1.</span>
                      <span>Edit prompts in the ForPrompt dashboard (with AI assistance, testing, versioning)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">2.</span>
                      <span>Run <code className="bg-neutral-800 px-1 rounded">npx forprompt deploy</code> to sync to local files</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">3.</span>
                      <span>Import prompts directly in your code (no API calls)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">4.</span>
                      <span>Commit <code className="bg-neutral-800 px-1 rounded">forprompt/</code> to version control</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-400 font-bold">5.</span>
                      <span>Deploy your app - prompts are bundled with your code!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {activeSection === "mcp" && (
            <div>
              <h1 className="text-xl font-medium mb-6">MCP Server</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Connect AI assistants like Claude Desktop, Cursor, Continue.dev, and Windsurf directly to your ForPrompt prompts using the Model Context Protocol (MCP).
              </p>

              <h2 className="text-sm font-medium mb-3">What is MCP?</h2>
              <p className="text-xs text-neutral-9000 mb-6">
                MCP (Model Context Protocol) is Anthropic's open protocol that enables AI assistants to access external data sources and tools. With ForPrompt's MCP server, AI assistants can read, create, update, and manage your prompts directly.
              </p>

              <h2 className="text-sm font-medium mb-3">Quick Setup</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Generate configuration for your editor:
              </p>
              <CodeBlock
                language="bash"
                code={`# For Claude Code
npx forprompt mcp config --editor=claude-code

# For Claude Desktop
npx forprompt mcp config --editor=claude-desktop

# For Cursor
npx forprompt mcp config --editor=cursor

# For all supported editors
npx forprompt mcp config --all`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Manual Configuration</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Add the following to your editor's MCP configuration file:
              </p>

              <h3 className="text-xs font-medium mb-2 mt-6 text-neutral-300">Claude Desktop</h3>
              <p className="text-[10px] text-neutral-500 mb-2">
                macOS: <code className="bg-neutral-800 px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code><br/>
                Windows: <code className="bg-neutral-800 px-1 rounded">%APPDATA%\Claude\claude_desktop_config.json</code>
              </p>
              <CodeBlock
                language="json"
                code={`{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["forprompt", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your_api_key_here"
      }
    }
  }
}`}
              />

              <h3 className="text-xs font-medium mb-2 mt-6 text-neutral-300">Claude Code</h3>
              <p className="text-[10px] text-neutral-500 mb-2">
                <code className="bg-neutral-800 px-1 rounded">.mcp.json</code> (project root)
              </p>
              <CodeBlock
                language="json"
                code={`{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your_api_key_here"
      }
    }
  }
}`}
              />

              <h3 className="text-xs font-medium mb-2 mt-6 text-neutral-300">Cursor</h3>
              <p className="text-[10px] text-neutral-500 mb-2">
                <code className="bg-neutral-800 px-1 rounded">.cursor/mcp.json</code> (project root)
              </p>
              <CodeBlock
                language="json"
                code={`{
  "mcpServers": {
    "forprompt": {
      "command": "npx",
      "args": ["-y", "@forprompt/sdk", "mcp", "start"],
      "env": {
        "FORPROMPT_API_KEY": "your_api_key_here"
      }
    }
  }
}`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Available Tools</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Once connected, AI assistants can use these tools:
              </p>

              <h3 className="text-xs font-medium mb-2 text-neutral-300">Setup & Integration</h3>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_detect_project</code>
                  <span className="text-neutral-9000">Detect project type, language, package manager</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_setup_project</code>
                  <span className="text-neutral-9000">Get SDK install command</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_generate_config</code>
                  <span className="text-neutral-9000">Generate .forprompt config file</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_generate_example</code>
                  <span className="text-neutral-9000">Generate code examples</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_integration_guide</code>
                  <span className="text-neutral-9000">Framework-specific guides</span>
                </div>
              </div>

              <h3 className="text-xs font-medium mb-2 text-neutral-300">Read Operations</h3>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_get_prompt</code>
                  <span className="text-neutral-9000">Fetch a prompt by key</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_list_prompts</code>
                  <span className="text-neutral-9000">List all prompts</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_search_prompts</code>
                  <span className="text-neutral-9000">Search prompts by text</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_get_prompt_metadata</code>
                  <span className="text-neutral-9000">Get metadata only</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_get_system_prompt</code>
                  <span className="text-neutral-9000">Get raw system prompt</span>
                </div>
              </div>

              <h3 className="text-xs font-medium mb-2 text-neutral-300">Write Operations</h3>
              <div className="space-y-2 text-xs mb-6">
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_create_prompt</code>
                  <span className="text-neutral-9000">Create a new prompt</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_update_prompt</code>
                  <span className="text-neutral-9000">Update prompt metadata</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_create_version</code>
                  <span className="text-neutral-9000">Create new version</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-48">forprompt_delete_prompt</code>
                  <span className="text-neutral-9000">Delete a prompt</span>
                </div>
              </div>

              <h2 className="text-sm font-medium mb-3 mt-8">Example Conversations</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Once configured, you can ask your AI assistant things like:
              </p>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-neutral-300">"Integrate ForPrompt into this project"</span>
                  <p className="text-neutral-500 mt-1">AI will detect your project, provide install commands, and set up configuration.</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-neutral-300">"List my ForPrompt prompts"</span>
                  <p className="text-neutral-500 mt-1">AI will fetch and display all prompts in your project.</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-neutral-300">"Create a customer support prompt with key customer_support_v1"</span>
                  <p className="text-neutral-500 mt-1">AI will create a new prompt with the specified key.</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-neutral-300">"Update the chatbot prompt to be more friendly"</span>
                  <p className="text-neutral-500 mt-1">AI will fetch the current prompt and create a new version with improvements.</p>
                </div>
                <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                  <span className="text-neutral-300">"Show me how to use ForPrompt with Next.js"</span>
                  <p className="text-neutral-500 mt-1">AI will provide a step-by-step integration guide.</p>
                </div>
              </div>

              <h2 className="text-sm font-medium mb-3 mt-8">CLI Commands</h2>
              <CodeBlock
                language="bash"
                code={`# Start MCP server (used by editors)
npx forprompt mcp start

# Generate editor configuration
npx forprompt mcp config --editor=claude-desktop
npx forprompt mcp config --editor=cursor
npx forprompt mcp config --all

# Show server information
npx forprompt mcp info`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Environment Variables</h2>
              <div className="space-y-2 text-xs mb-6">
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-40">FORPROMPT_API_KEY</code>
                  <span className="text-neutral-9000">Your project API key (required)</span>
                </div>
                <div className="flex gap-4">
                  <code className="text-neutral-400 font-mono w-40">FORPROMPT_BASE_URL</code>
                  <span className="text-neutral-9000">Custom API URL (optional)</span>
                </div>
              </div>

              <h2 className="text-sm font-medium mb-3 mt-8">Supported Editors</h2>
              <ul className="text-xs text-neutral-9000 space-y-2">
                <li>• Claude Code (CLI)</li>
                <li>• Claude Desktop</li>
                <li>• Cursor</li>
                <li>• Continue.dev</li>
                <li>• Windsurf</li>
                <li>• VS Code (with MCP extension)</li>
              </ul>
            </div>
          )}

          {activeSection === "logging" && (
            <div>
              <h1 className="text-xl font-medium mb-6">Logging</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Track AI conversations and analyze prompt performance with automatic logging.
              </p>

              <h2 className="text-sm font-medium mb-3">Overview</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                The ForPrompt logger uses a trace/span model to log AI conversations. Each conversation is a "trace" containing multiple "spans" (messages, LLM calls, etc.).
              </p>

              <h2 className="text-sm font-medium mb-3 mt-8">Basic Usage</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Use the default logger instance that auto-loads from environment variables:
              </p>
              <CodeBlock
                language="typescript"
                code={`import { logger } from "@forprompt/sdk";

// Start a trace for a conversation
const traceId = logger.startTrace("onboarding");

// Log user message
await logger.log({
  role: "user",
  content: "Hello, I need help with onboarding"
});

// Log AI response
await logger.log({
  role: "assistant",
  content: "Hi! I'd be happy to help you get started.",
  model: "gpt-4o",
  tokens: {
    input: 15,
    output: 12
  },
  durationMs: 450
});

// End trace (optional)
await logger.endTrace();`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Custom Logger Instance</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Create a custom logger with explicit configuration:
              </p>
              <CodeBlock
                language="typescript"
                code={`import { createLogger } from "@forprompt/sdk";

const logger = createLogger({
  apiKey: "fp_xxx",
  baseUrl: "https://forprompt.dev", // Optional
  source: "my-app" // Optional, defaults to "sdk"
});

logger.startTrace("onboarding");
await logger.log({ role: "user", content: "Hello" });`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Complete Example</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Full example with error handling and metadata:
              </p>
              <CodeBlock
                language="typescript"
                code={`import { logger } from "@forprompt/sdk";
import Anthropic from "@anthropic-ai/sdk";

async function chatWithLogging(userMessage: string) {
  // Start trace
  const traceId = logger.startTrace("onboarding");
  console.log("Trace ID:", traceId);

  try {
    // Log user message
    await logger.log({
      role: "user",
      content: userMessage
    });

    // Call LLM
    const anthropic = new Anthropic();
    const startTime = Date.now();
    
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: userMessage }]
    });

    const durationMs = Date.now() - startTime;

    // Log AI response
    await logger.log({
      role: "assistant",
      content: response.content[0].text,
      model: "claude-sonnet-4-20250514",
      tokens: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens
      },
      durationMs,
      metadata: {
        temperature: 0.7,
        maxTokens: 1024
      }
    });

    return response.content[0].text;
  } catch (error) {
    // Log error as metadata
    await logger.log({
      role: "system",
      content: "Error occurred",
      metadata: { error: error.message }
    });
    throw error;
  } finally {
    // Optionally end trace
    await logger.endTrace();
  }
}`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Continuing Existing Traces</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Continue an existing trace by passing a traceId:
              </p>
              <CodeBlock
                language="typescript"
                code={`// Client-side: Start trace and send traceId to server
const traceId = logger.startTrace("onboarding");
await fetch("/api/chat", {
  method: "POST",
  headers: { "X-Trace-Id": traceId },
  body: JSON.stringify({ message: "Hello" })
});

// Server-side: Continue trace with same traceId
const clientTraceId = request.headers.get("X-Trace-Id");
logger.startTrace("onboarding", { traceId: clientTraceId });
await logger.log({ role: "user", content: "Hello" });`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Log Options</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                The <code className="bg-neutral-800 px-1 rounded">log()</code> method accepts the following options:
              </p>
              <CodeBlock
                language="typescript"
                code={`interface LogOptions {
  role: "user" | "assistant" | "system";
  content: string;
  model?: string; // e.g., "gpt-4o", "claude-sonnet-4"
  tokens?: {
    input?: number;  // Input tokens
    output?: number; // Output tokens
  };
  durationMs?: number; // Duration in milliseconds
  metadata?: Record<string, any>; // Additional metadata
}`}
              />

              <h2 className="text-sm font-medium mb-3 mt-8">Logger Methods</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <code className="text-neutral-300 font-mono">startTrace(promptKey, options?)</code>
                  <p className="text-neutral-9000 mt-1">
                    Start a new trace. Returns the traceId. Optionally pass an existing traceId to continue a trace.
                  </p>
                </div>
                <div>
                  <code className="text-neutral-300 font-mono">log(options)</code>
                  <p className="text-neutral-9000 mt-1">
                    Log a span (message, LLM call, etc.). Automatically creates a trace if none exists.
                  </p>
                </div>
                <div>
                  <code className="text-neutral-300 font-mono">endTrace()</code>
                  <p className="text-neutral-9000 mt-1">
                    End the current trace. Optional - traces can be left open.
                  </p>
                </div>
                <div>
                  <code className="text-neutral-300 font-mono">getTraceId()</code>
                  <p className="text-neutral-9000 mt-1">
                    Get the current trace ID.
                  </p>
                </div>
                <div>
                  <code className="text-neutral-300 font-mono">isTracing()</code>
                  <p className="text-neutral-9000 mt-1">
                    Check if a trace is currently active.
                  </p>
                </div>
              </div>

              <h2 className="text-sm font-medium mb-3 mt-8">Viewing Logs</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                View all logged conversations in your ForPrompt dashboard under the Logs section. You can:
              </p>
              <ul className="text-xs text-neutral-9000 space-y-2 mb-6">
                <li>• View full conversation traces</li>
                <li>• Analyze token usage and costs</li>
                <li>• Track response times</li>
                <li>• Identify problematic conversations</li>
                <li>• Use AI analysis to find improvement opportunities</li>
              </ul>

              <h2 className="text-sm font-medium mb-3 mt-8">Best Practices</h2>
              <div className="space-y-4 text-xs text-neutral-9000">
                <div>
                  <strong className="text-neutral-300">Always log both user and assistant messages</strong>
                  <p className="mt-1">This gives you complete conversation context for analysis.</p>
                </div>
                <div>
                  <strong className="text-neutral-300">Include token counts and duration</strong>
                  <p className="mt-1">This helps track costs and performance over time.</p>
                </div>
                <div>
                  <strong className="text-neutral-300">Use metadata for additional context</strong>
                  <p className="mt-1">Add custom metadata like user ID, session ID, or feature flags.</p>
                </div>
                <div>
                  <strong className="text-neutral-300">Handle errors gracefully</strong>
                  <p className="mt-1">Don't let logging failures break your application. Wrap logging calls in try-catch blocks.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === "authentication" && (
            <div>
              <h1 className="text-xl font-medium mb-6">Authentication</h1>
              <p className="text-sm text-neutral-400 mb-6">
                All API requests require authentication using an API key.
              </p>

              <h2 className="text-sm font-medium mb-3">Getting your API key</h2>
              <ol className="text-xs text-neutral-9000 space-y-2 mb-6 list-decimal list-inside">
                <li>Go to your project dashboard</li>
                <li>Click on Project Settings</li>
                <li>Navigate to API Keys</li>
                <li>Click "Generate New Key"</li>
              </ol>

              <h2 className="text-sm font-medium mb-3">Using your API key</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Include your API key in the <code className="bg-neutral-800 px-1 rounded">X-API-Key</code> header:
              </p>
              <CodeBlock
                language="bash"
                code={`X-API-Key: fp_live_xxxxxxxxxxxxxxxx`}
              />

              <h2 className="text-sm font-medium mb-3 mt-6">Environment Variables</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                The SDK automatically reads from environment variables:
              </p>
              <CodeBlock
                language="bash"
                code={`# .env file
FORPROMPT_API_KEY=fp_live_xxxxxxxxxxxxxxxx
FORPROMPT_BASE_URL=https://forprompt.dev  # Optional`}
              />

              <div className="mt-6 p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
                <p className="text-xs text-neutral-200">
                  <strong>Security:</strong> Never expose your API key in client-side code. Use environment variables and server-side requests.
                </p>
              </div>
            </div>
          )}

          {activeSection === "versioning" && (
            <div>
              <h1 className="text-xl font-medium mb-6">Versioning</h1>
              <p className="text-sm text-neutral-400 mb-6">
                Every prompt change creates a new version. You control which version is active.
              </p>

              <h2 className="text-sm font-medium mb-3">How it works</h2>
              <ul className="text-xs text-neutral-9000 space-y-2 mb-6">
                <li>• Each save creates a new version (v1, v2, v3...)</li>
                <li>• The "active" version is what the API returns by default</li>
                <li>• You can set any version as active from the dashboard</li>
                <li>• Old versions are never deleted</li>
              </ul>

              <h2 className="text-sm font-medium mb-3">Fetching specific versions</h2>
              <p className="text-xs text-neutral-9000 mb-4">
                Using the SDK:
              </p>
              <CodeBlock
                language="typescript"
                code={`// Get active version (default)
const prompt = await forprompt.getPrompt("onboarding");

// Get specific version
const promptV2 = await forprompt.getPrompt("onboarding", { version: 2 });`}
              />
              <p className="text-xs text-neutral-9000 mb-4 mt-4">
                Using the API directly:
              </p>
              <CodeBlock
                language="bash"
                code={`# Get active version (default)
curl "https://forprompt.dev/api/prompts?key=onboarding" \\
  -H "X-API-Key: YOUR_API_KEY"

# Get specific version
curl "https://forprompt.dev/api/prompts?key=onboarding&version=2" \\
  -H "X-API-Key: YOUR_API_KEY"`}
              />

              <h2 className="text-sm font-medium mb-3">Rolling back</h2>
              <p className="text-xs text-neutral-9000">
                To roll back, simply set an older version as "active" in the dashboard. The change takes effect immediately—no code changes needed.
              </p>
            </div>
          )}

          {activeSection === "best-practices" && (
            <div>
              <h1 className="text-xl font-medium mb-6">Best Practices</h1>

              <div className="space-y-8">
                {/* #1 - Local Files */}
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                  <h2 className="text-sm font-medium mb-2 flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">1</span>
                    Always use local files in production
                  </h2>
                  <p className="text-xs text-neutral-9000 mb-3">
                    <strong className="text-neutral-300">Don't make API calls at runtime.</strong> Use <code className="bg-neutral-800 px-1 rounded">forprompt deploy</code> to generate local files and import them directly. This gives you:
                  </p>
                  <ul className="text-xs text-neutral-9000 space-y-1 mb-4">
                    <li>• <strong className="text-neutral-300">Zero latency</strong> — prompts are bundled with your app</li>
                    <li>• <strong className="text-neutral-300">Offline support</strong> — no network dependency</li>
                    <li>• <strong className="text-neutral-300">Version control</strong> — prompts change with your code</li>
                    <li>• <strong className="text-neutral-300">Reliability</strong> — no API downtime risks</li>
                  </ul>
                  <CodeBlock
                    language="bash"
                    code={`# Your deployment workflow
npx forprompt deploy          # Sync prompts
git add forprompt/            # Stage changes
git commit -m "Update prompts" # Commit with your code
git push && deploy            # Deploy together`}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Use descriptive keys</h2>
                  <p className="text-xs text-neutral-9000">
                    Choose keys that describe the prompt's purpose: <code className="bg-neutral-800 px-1 rounded">customer_support</code>, <code className="bg-neutral-800 px-1 rounded">code_review</code>, <code className="bg-neutral-800 px-1 rounded">onboarding_assistant</code>. Use underscores (they become valid TypeScript identifiers).
                  </p>
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Use template variables for dynamic content</h2>
                  <p className="text-xs text-neutral-9000 mb-3">
                    Instead of creating multiple similar prompts, use <code className="bg-neutral-800 px-1 rounded">{"{{variables}}"}</code> for dynamic parts:
                  </p>
                  <CodeBlock
                    language="typescript"
                    code={`// Prompt: "You are a {{role}} assistant for {{company}}."

import { support_agent } from "./forprompt";

const prompt = support_agent
  .replace("{{role}}", "technical support")
  .replace("{{company}}", "Acme Inc");`}
                  />
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Test before activating</h2>
                  <p className="text-xs text-neutral-9000">
                    Use the testing playground to verify your prompt works across different models and edge cases before setting it as the active version.
                  </p>
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Use the MCP server for prompt development</h2>
                  <p className="text-xs text-neutral-9000">
                    Connect your AI coding assistant (Cursor, Claude Code) to ForPrompt via MCP. You can create, edit, and test prompts without leaving your editor.
                  </p>
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Version your prompts with your code</h2>
                  <p className="text-xs text-neutral-9000">
                    Commit the <code className="bg-neutral-800 px-1 rounded">forprompt/</code> directory to version control. This way, prompt changes are tracked alongside code changes, and you can roll back both together if needed.
                  </p>
                </div>

                <div>
                  <h2 className="text-sm font-medium mb-2">Monitor with logging</h2>
                  <p className="text-xs text-neutral-9000">
                    Use the SDK logger to track conversations. The analytics dashboard shows usage patterns, token costs, and helps identify prompts that need improvement.
                  </p>
                </div>

                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <h2 className="text-sm font-medium mb-2 text-amber-300">When to use API fetching</h2>
                  <p className="text-xs text-neutral-9000">
                    API fetching (not local files) makes sense in these cases:
                  </p>
                  <ul className="text-xs text-neutral-9000 mt-2 space-y-1">
                    <li>• <strong className="text-neutral-300">Rapid prototyping</strong> — instant updates without redeploy</li>
                    <li>• <strong className="text-neutral-300">A/B testing</strong> — switch prompts without code changes</li>
                    <li>• <strong className="text-neutral-300">Admin tools</strong> — non-critical internal apps</li>
                  </ul>
                  <p className="text-xs text-neutral-9000 mt-3">
                    Even then, consider adding caching to reduce latency and API calls.
                  </p>
                </div>
              </div>
            </div>
          )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
