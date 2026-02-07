import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexSyncProvider } from "@components/providers";

import { cn } from "@forprompt/ui";
import { ThemeProvider } from "@forprompt/ui/theme";
import { Toaster } from "@forprompt/ui/toast";

import { ConvexClientProvider } from "~/convex/ConvexClientProvider";
import { env } from "~/env";
import { PostHogProvider } from "~/providers/PostHogProvider";

import "~/app/styles.css";

const baseUrl =
  env.VERCEL_ENV === "production"
    ? "https://forprompt.dev"
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "ForPrompt - Prompt management made simple",
    template: "%s | ForPrompt",
  },
  description:
    "Version, test, and deploy AI prompts with MCP support for Claude, Cursor, and VS Code. The easiest way to manage prompts in production.",
  keywords: [
    "prompt management",
    "MCP server",
    "Model Context Protocol",
    "AI prompts",
    "prompt version control",
    "LLM prompts",
    "Claude MCP",
    "Cursor MCP",
    "prompt engineering",
    "AI prompt deployment",
  ],
  authors: [{ name: "ForPrompt" }],
  creator: "ForPrompt",
  publisher: "ForPrompt",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "ForPrompt - Prompt management made simple",
    description:
      "Version, test, and deploy AI prompts with MCP support for Claude, Cursor, and VS Code.",
    url: "https://forprompt.dev",
    siteName: "ForPrompt",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ForPrompt - Prompt management made simple",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ForPrompt - Prompt management made simple",
    description:
      "Version, test, and deploy AI prompts with MCP support for Claude, Cursor, and VS Code.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://forprompt.dev",
  },
};

// JSON-LD Structured Data
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ForPrompt",
  url: "https://forprompt.dev",
  logo: "https://forprompt.dev/logo.png",
  description: "Prompt management made simple for AI teams",
  sameAs: ["https://www.linkedin.com/company/forprompt/"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@forprompt.dev",
    contactType: "customer service",
  },
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "ForPrompt",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web, macOS, Windows, Linux",
  description:
    "Version control, testing, and deployment platform for AI prompts with MCP support",
  url: "https://forprompt.dev",
  author: {
    "@type": "Organization",
    name: "ForPrompt",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available",
  },
  featureList: [
    "Prompt version control",
    "MCP server integration",
    "AI-powered prompt editing",
    "TypeScript and Python SDK",
    "CLI deployment tools",
    "Team collaboration",
  ],
  keywords:
    "prompt management, MCP server, Model Context Protocol, AI prompts, prompt version control",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is ForPrompt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ForPrompt is a prompt management platform that makes it easy to version, test, and deploy AI prompts. It supports MCP (Model Context Protocol) for direct integration with AI agents like Claude, Cursor, and VS Code.",
      },
    },
    {
      "@type": "Question",
      name: "What is MCP and how does ForPrompt support it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MCP (Model Context Protocol) is Anthropic's open protocol that enables AI assistants to access external data sources and tools. ForPrompt provides a native MCP server that allows AI assistants like Claude Desktop, Cursor, and VS Code to read, create, and update prompts directly.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get started with ForPrompt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Install the SDK with 'npm install @forprompt/sdk', initialize your project with 'npx forprompt init', create prompts in the dashboard, and deploy them with 'npx forprompt deploy'. Your prompts are then available as local TypeScript files with zero runtime latency.",
      },
    },
    {
      "@type": "Question",
      name: "Is ForPrompt free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, ForPrompt offers a free tier that includes 5 prompts, 1 project, and 3 team members. Upgrade to Pro for AI-powered features like prompt generation, analysis, and conversation insights.",
      },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#6366f1",
          colorBackground: "#111113",
          colorInputBackground: "#1a1a1c",
          colorInputText: "#ededef",
          colorText: "#ededef",
          colorTextSecondary: "#8a8a8e",
          borderRadius: "0.5rem",
        },
        elements: {
          card: "bg-[#111113] border border-neutral-800",
          modalContent: "bg-[#111113]",
          headerTitle: "text-text-primary",
          headerSubtitle: "text-text-secondary",
          socialButtonsBlockButton:
            "bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-text-primary h-11 px-4",
          socialButtonsBlockButtonText: "text-text-primary text-sm font-medium",
          socialButtonsBlockButtonArrow: "text-text-primary",
          formButtonPrimary: "bg-neutral-200 hover:bg-white text-neutral-900",
          footerActionLink: "text-text-primary hover:text-white",
          identityPreviewText: "text-text-primary",
          identityPreviewEditButton: "text-text-secondary",
          formFieldLabel: "text-text-secondary",
          formFieldInput:
            "bg-neutral-900 border-neutral-800 text-text-primary focus:border-neutral-700",
          dividerLine: "bg-neutral-800",
          dividerText: "text-text-secondary",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning className="dark">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
            rel="stylesheet"
          />
          {/* JSON-LD Structured Data for SEO and AI Discoverability */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema),
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
          />
        </head>
        <body
          className={cn(
            "bg-content-bg text-text-primary min-h-screen font-sans antialiased",
            geistSans.variable,
            geistMono.variable,
          )}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
          >
            <PostHogProvider>
              <ConvexClientProvider>
                <ConvexSyncProvider />
                {props.children}
              </ConvexClientProvider>
            </PostHogProvider>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
