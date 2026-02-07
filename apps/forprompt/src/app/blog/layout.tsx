import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "Learn about prompt management, MCP integration, AI prompt best practices, and the latest updates from ForPrompt.",
  keywords: [
    "prompt management blog",
    "MCP tutorials",
    "AI prompts",
    "prompt engineering",
    "LLM best practices",
  ],
  openGraph: {
    title: "Blog | ForPrompt",
    description: "Learn about prompt management, MCP integration, and AI prompt best practices.",
    url: "https://forprompt.dev/blog",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | ForPrompt",
    description: "Learn about prompt management, MCP integration, and AI prompt best practices.",
  },
  alternates: {
    canonical: "https://forprompt.dev/blog",
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
