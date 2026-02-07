import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://forprompt.dev";

  return {
    rules: [
      // Default rule for all crawlers
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/settings/", "/_next/", "/sign-in/", "/user-profile/"],
      },
      // OpenAI ChatGPT
      {
        userAgent: "GPTBot",
        allow: "/",
      },
      // ChatGPT browsing mode
      {
        userAgent: "ChatGPT-User",
        allow: "/",
      },
      // Perplexity AI
      {
        userAgent: "PerplexityBot",
        allow: "/",
      },
      // Anthropic Claude
      {
        userAgent: "anthropic-ai",
        allow: "/",
      },
      // Claude web search
      {
        userAgent: "Claude-Web",
        allow: "/",
      },
      // Common Crawl (used for AI training)
      {
        userAgent: "CCBot",
        allow: "/",
      },
      // Cohere AI
      {
        userAgent: "cohere-ai",
        allow: "/",
      },
      // ByteDance AI
      {
        userAgent: "Bytespider",
        allow: "/",
      },
      // Google AI / Bard
      {
        userAgent: "Google-Extended",
        allow: "/",
      },
      // Meta AI
      {
        userAgent: "FacebookBot",
        allow: "/",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
