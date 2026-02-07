"use client";

import { usePostHog } from "posthog-js/react";
import { useCallback } from "react";
import type { Id } from "~/convex/_generated/dataModel";

/**
 * Analytics hook for tracking crucial user events in ForPrompt.
 * See docs/posthog-analytics.md for event documentation.
 */
export function useAnalytics() {
  const posthog = usePostHog();

  const trackPromptCreated = useCallback(
    (promptId: Id<"prompts">, promptKey: string, projectId: Id<"projects">) => {
      posthog?.capture("prompt_created", {
        prompt_id: promptId,
        prompt_key: promptKey,
        project_id: projectId,
      });
    },
    [posthog]
  );

  const trackVersionDeployed = useCallback(
    (
      promptId: Id<"prompts">,
      promptKey: string,
      versionNumber: number,
      projectId: Id<"projects">
    ) => {
      posthog?.capture("version_deployed", {
        prompt_id: promptId,
        prompt_key: promptKey,
        version_number: versionNumber,
        project_id: projectId,
      });
    },
    [posthog]
  );

  const trackSubscriptionUpgraded = useCallback(
    (fromTier: string, toTier: string, packageId: string) => {
      posthog?.capture("subscription_upgraded", {
        from_tier: fromTier,
        to_tier: toTier,
        package_id: packageId,
      });
    },
    [posthog]
  );

  const trackPaywallViewed = useCallback(
    (currentTier: string, reason?: string, highlightTier?: string) => {
      posthog?.capture("paywall_viewed", {
        current_tier: currentTier,
        reason,
        highlight_tier: highlightTier,
      });
    },
    [posthog]
  );

  const trackApiKeyGenerated = useCallback(
    (projectId: Id<"projects">, isFirstKey: boolean) => {
      posthog?.capture("api_key_generated", {
        project_id: projectId,
        is_first_key: isFirstKey,
      });
    },
    [posthog]
  );

  return {
    trackPromptCreated,
    trackVersionDeployed,
    trackSubscriptionUpgraded,
    trackPaywallViewed,
    trackApiKeyGenerated,
  };
}
