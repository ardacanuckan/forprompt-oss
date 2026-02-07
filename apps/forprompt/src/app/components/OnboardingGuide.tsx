"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useOrganization } from "@clerk/nextjs";

import { cn } from "@forprompt/ui";

import { api, useMutation, useQuery } from "~/convex/ConvexClientProvider";

interface OnboardingGuideProps {
  hasProject: boolean;
  hasPrompt: boolean;
  hasVersion: boolean;
  className?: string;
}

export function OnboardingGuide({ className }: OnboardingGuideProps) {
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const { organization, isLoaded: orgLoaded } = useOrganization();

  const convexOrg = useQuery(
    api.domains.organizations.queries.getByClerkId,
    orgLoaded && organization ? { clerkId: organization.id } : "skip",
  );

  const ensureDefaultProject = useMutation(
    api.domains.projects.mutations.ensureDefaultProject,
  );

  useEffect(() => {
    if (!convexOrg) return;
    ensureDefaultProject({ orgId: convexOrg._id })
      .then((result) => setApiKey(result.apiKey))
      .catch(() => {});
  }, [convexOrg, ensureDefaultProject]);

  const curlCommand = useMemo(() => {
    if (!apiKey) return "";
    const params = new URLSearchParams({
      key: apiKey,
      org: organization?.name || "My Organization",
    });
    return `curl -s "https://forprompt.dev/api/setup-prompt?${params.toString()}"`;
  }, [apiKey, organization?.name]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn("flex h-full items-center justify-center p-8", className)}
    >
      <div className="w-full max-w-md text-center">
        <Image
          src="/logo.png"
          alt="ForPrompt"
          width={36}
          height={36}
          className="mx-auto mb-5 rounded-xl"
          priority
        />

        <h1 className="text-xl font-semibold text-white/90">
          Set up ForPrompt
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/40">
          Paste this into Claude Code, Cursor, Windsurf or any AI editor.
          <br />
          It will configure everything automatically.
        </p>

        {curlCommand ? (
          <>
            <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-sm text-white/20">$</span>
                <code className="min-w-0 flex-1 truncate text-left font-mono text-[13px] text-white/60">
                  {curlCommand}
                </code>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    copied
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/90 text-[#0c0c0e] hover:bg-white"
                  }`}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs text-white/20">
              This fetches setup instructions with your API key embedded.
            </p>
          </>
        ) : (
          <div className="mt-6">
            <div className="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-white/40" />
          </div>
        )}
      </div>
    </div>
  );
}
