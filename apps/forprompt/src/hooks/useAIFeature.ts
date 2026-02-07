"use client";

/**
 * Hook for gating AI features behind subscription
 * Shows paywall for free users when they try to use AI features
 */

import { useCallback } from "react";
import { usePolar } from "~/providers/PolarProvider";
import { usePaywall } from "~/providers/PaywallProvider";

type AIFeature =
  | "aiPromptGeneration"
  | "aiPromptAnalysis"
  | "aiPromptEditing"
  | "aiEnhancementSuggestions";

const FEATURE_MESSAGES: Record<AIFeature, string> = {
  aiPromptGeneration: "AI prompt generation requires a Pro subscription",
  aiPromptAnalysis: "AI prompt analysis requires a Pro subscription",
  aiPromptEditing: "AI prompt editing requires a Pro subscription",
  aiEnhancementSuggestions: "AI enhancement suggestions require a Pro subscription",
};

export function useAIFeature() {
  const { currentTier } = usePolar();
  const { openPaywall } = usePaywall();

  const canUseAI = currentTier !== "free";

  const requireAIFeature = useCallback(
    (feature: AIFeature, onAllowed: () => void) => {
      if (canUseAI) {
        onAllowed();
      } else {
        openPaywall({
          highlightTier: "pro",
          reason: FEATURE_MESSAGES[feature],
        });
      }
    },
    [canUseAI, openPaywall]
  );

  const checkAIFeature = useCallback(
    (feature: AIFeature): boolean => {
      if (!canUseAI) {
        openPaywall({
          highlightTier: "pro",
          reason: FEATURE_MESSAGES[feature],
        });
        return false;
      }
      return true;
    },
    [canUseAI, openPaywall]
  );

  return {
    canUseAI,
    requireAIFeature,
    checkAIFeature,
  };
}
