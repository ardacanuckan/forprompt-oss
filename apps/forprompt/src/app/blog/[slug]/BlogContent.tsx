"use client";

import { useState } from "react";

interface BlogContentProps {
  content: string;
}

// Simple markdown to HTML converter for blog content
function parseMarkdown(markdown: string): string {
  let html = markdown;

  // Code blocks with language
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const language = lang || "text";
    return `<pre class="code-block" data-language="${language}"><code>${escapeHtml(code.trim())}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3 class="blog-h3">$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2 class="blog-h2">$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1 class="blog-h1">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="blog-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Unordered lists
  html = html.replace(/^\- (.*$)/gm, '<li class="blog-li">$1</li>');
  html = html.replace(/(<li class="blog-li">.*<\/li>\n?)+/g, '<ul class="blog-ul">$&</ul>');

  // Ordered lists
  html = html.replace(/^\d+\. (.*$)/gm, '<li class="blog-li-ordered">$1</li>');
  html = html.replace(
    /(<li class="blog-li-ordered">.*<\/li>\n?)+/g,
    '<ol class="blog-ol">$&</ol>'
  );

  // Blockquotes
  html = html.replace(/^> (.*$)/gm, '<blockquote class="blog-quote">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="blog-hr" />');

  // Paragraphs
  html = html
    .split("\n\n")
    .map((block) => {
      if (
        block.startsWith("<h") ||
        block.startsWith("<pre") ||
        block.startsWith("<ul") ||
        block.startsWith("<ol") ||
        block.startsWith("<blockquote") ||
        block.startsWith("<hr")
      ) {
        return block;
      }
      if (block.trim()) {
        return `<p class="blog-p">${block.replace(/\n/g, " ")}</p>`;
      }
      return "";
    })
    .join("\n\n");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-6 bg-black/60 border border-white/10 rounded-xl overflow-hidden group">
      <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <span className="text-xs text-white/40 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-white/40 hover:text-white transition-colors flex items-center gap-1.5"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-white/80 font-mono">{code}</code>
      </pre>
    </div>
  );
}

export function BlogContent({ content }: BlogContentProps) {
  // Extract code blocks for special rendering
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }
    // Add code block
    parts.push({
      type: "code",
      content: match[2]?.trim() ?? "",
      language: match[1] || "text",
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return (
    <div className="blog-content">
      {parts.map((part, index) => {
        if (part.type === "code") {
          return <CodeBlock key={index} code={part.content} language={part.language ?? "text"} />;
        }

        const html = parseMarkdown(part.content);
        return (
          <div
            key={index}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}

      <style jsx global>{`
        .blog-content .blog-h1 {
          font-size: 2rem;
          font-weight: 500;
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          color: white;
        }

        .blog-content .blog-h2 {
          font-size: 1.5rem;
          font-weight: 500;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: white;
        }

        .blog-content .blog-h3 {
          font-size: 1.25rem;
          font-weight: 500;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          color: white;
        }

        .blog-content .blog-p {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.75;
          margin-bottom: 1.25rem;
        }

        .blog-content .blog-ul,
        .blog-content .blog-ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .blog-content .blog-li,
        .blog-content .blog-li-ordered {
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.75;
          margin-bottom: 0.5rem;
        }

        .blog-content .blog-quote {
          border-left: 3px solid rgba(255, 255, 255, 0.3);
          padding-left: 1rem;
          margin: 1.5rem 0;
          color: rgba(255, 255, 255, 0.6);
          font-style: italic;
        }

        .blog-content .blog-link {
          color: white;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .blog-content .blog-link:hover {
          color: rgba(255, 255, 255, 0.8);
        }

        .blog-content .inline-code {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.2rem 0.4rem;
          border-radius: 0.25rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875em;
        }

        .blog-content .blog-hr {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 2rem 0;
        }

        .blog-content strong {
          color: white;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
