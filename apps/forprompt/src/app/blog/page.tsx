"use client";

import Link from "next/link";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";
import { GrainOverlay, MagneticButton } from "@forprompt/ui";
import { getAllPosts } from "./_content/posts";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-black text-white">
      <GrainOverlay />

      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-neutral-900">
        <div className="flex items-center justify-between px-6 py-3 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Image src="/logo.png" alt="ForPrompt" width={20} height={20} />
            <span className="text-[15px] font-medium text-white">forprompt</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-[13px] text-neutral-400 hover:text-white transition-colors">
              Docs
            </Link>
            <Link href="/mcp" className="text-[13px] text-neutral-400 hover:text-white transition-colors">
              MCP
            </Link>
            <SignInButton mode="modal">
              <button className="px-3.5 py-1.5 text-[13px] font-medium text-black bg-white hover:bg-neutral-200 rounded-md transition-colors">
                Get Started
              </button>
            </SignInButton>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-24 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <span className="inline-block px-2.5 py-1 text-[11px] font-medium text-neutral-400 bg-neutral-900 rounded-md border border-neutral-800 uppercase tracking-wider">
              Articles
            </span>
          </div>
          <h1 className="text-4xl font-medium leading-tight mb-4 tracking-tight">Blog</h1>
          <p className="text-lg text-neutral-400">
            Prompt management, MCP integration, and AI best practices.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-1">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block py-5 border-b border-neutral-900 hover:bg-neutral-950/50 -mx-4 px-4 rounded-lg transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-[10px] font-medium text-neutral-500 bg-neutral-900 rounded border border-neutral-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-medium text-white group-hover:text-neutral-200 transition-colors mb-1.5">
                      {post.title}
                    </h2>

                    {/* Description */}
                    <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2">
                      {post.description}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-xs text-neutral-600">{formatDate(post.date)}</span>
                    <div className="text-[11px] text-neutral-700 mt-0.5">{post.readingTime}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 border-t border-neutral-900">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-xl font-medium mb-3">Ready to simplify prompt management?</h2>
          <p className="text-sm text-neutral-500 mb-6">
            Join teams building better AI experiences with ForPrompt.
          </p>
          <SignInButton mode="modal">
            <MagneticButton size="default" variant="primary">
              Get Started Free
            </MagneticButton>
          </SignInButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-neutral-900">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="ForPrompt" width={16} height={16} />
            <span className="text-xs text-neutral-600">ForPrompt © 2026</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-neutral-500">
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
            <Link href="/mcp" className="hover:text-white transition-colors">MCP</Link>
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
