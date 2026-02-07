"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  RedirectToSignIn,
  SignedIn,
  SignedOut,
  useOrganization,
  useUser,
} from "@clerk/nextjs";

import type { Id } from "~/convex/_generated/dataModel";
import { api, useMutation, useQuery } from "~/convex/ConvexClientProvider";

interface SetupState {
  projectId: Id<"projects"> | null;
  apiKey: string | null;
  loading: boolean;
  error: string | null;
}

function SetupContent() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const [state, setState] = useState<SetupState>({
    projectId: null,
    apiKey: null,
    loading: true,
    error: null,
  });
  const [copied, setCopied] = useState(false);

  const convexOrg = useQuery(
    api.domains.organizations.queries.getByClerkId,
    orgLoaded && organization ? { clerkId: organization.id } : "skip",
  );

  const ensureDefaultProject = useMutation(
    api.domains.projects.mutations.ensureDefaultProject,
  );
  const completeOnboarding = useMutation(
    api.domains.users.mutations.completeOnboarding,
  );

  useEffect(() => {
    if (!userLoaded || !orgLoaded || !convexOrg) return;

    if (!user || !organization) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "User or organization not found",
      }));
      return;
    }

    const initializeProject = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const result = await ensureDefaultProject({ orgId: convexOrg._id });
        setState({
          projectId: result.projectId,
          apiKey: result.apiKey,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to create project",
        }));
      }
    };

    initializeProject();
  }, [
    userLoaded,
    orgLoaded,
    user,
    organization,
    convexOrg,
    ensureDefaultProject,
  ]);

  const handleRetry = () => {
    if (!convexOrg) return;
    setState({ projectId: null, apiKey: null, loading: true, error: null });
    ensureDefaultProject({ orgId: convexOrg._id })
      .then((result) =>
        setState({
          projectId: result.projectId,
          apiKey: result.apiKey,
          loading: false,
          error: null,
        }),
      )
      .catch((err) =>
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to create project",
        })),
      );
  };

  const promptUrl = useMemo(() => {
    if (!state.apiKey) return "";
    const base = "https://forprompt.dev";
    const params = new URLSearchParams({
      key: state.apiKey,
      org: organization?.name || "My Organization",
    });
    return `${base}/api/setup-prompt?${params.toString()}`;
  }, [state.apiKey, organization?.name]);

  const curlCommand = `curl -s "${promptUrl}"`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (state.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101012]">
        <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101012]">
        <div className="text-center">
          <p className="mb-4 text-sm text-[#9a9a9e]">{state.error}</p>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-white px-5 py-2 text-sm font-medium text-[#101012] hover:bg-white/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#0c0c0e] px-6">
      <div className="w-full max-w-xl text-center">
        <Image
          src="/logo.png"
          alt="ForPrompt"
          width={40}
          height={40}
          className="mx-auto mb-6 rounded-xl"
        />

        <h1 className="text-3xl font-bold tracking-tight text-white">
          Connect your AI editor
        </h1>
        <p className="mt-3 text-base text-[#a1a1a6]">
          Paste this into Claude Code, Cursor, Windsurf or any AI editor.
          <br />
          It will fetch and execute the setup automatically.
        </p>

        <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-sm text-[#6e6e73]">$</span>
            <code className="min-w-0 flex-1 truncate text-left font-mono text-sm text-white/80">
              {curlCommand}
            </code>
            <button
              onClick={handleCopy}
              className={`shrink-0 rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                copied
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-white text-[#0c0c0e] hover:bg-white/90"
              }`}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <button
          onClick={async () => {
            try {
              await completeOnboarding();
              router.push("/");
            } catch (err) {
              console.error("Failed to complete onboarding:", err);
            }
          }}
          className="mt-12 text-sm text-[#6e6e73] underline decoration-[#6e6e73]/30 underline-offset-4 transition-colors hover:text-white hover:decoration-white/30"
        >
          Skip to dashboard
        </button>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <>
      <SignedIn>
        <SetupContent />
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
