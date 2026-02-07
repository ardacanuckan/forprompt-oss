"use client";

/**
 * Hook for AI features - OSS version (all features enabled)
 */
import { useCallback } from "react";

type AIFeature =
  | "aiPromptGeneration"
  | "aiPromptAnalysis"
  | "aiPromptEditing"
  | "aiEnhancementSuggestions";

export function useAIFeature() {
  const canUseAI = true;

  const requireAIFeature = useCallback(
    (_feature: AIFeature, onAllowed: () => void) => {
      onAllowed();
    },
    [],
  );

  const checkAIFeature = useCallback((_feature: AIFeature): boolean => {
    return true;
  }, []);

  return {
    canUseAI,
    requireAIFeature,
    checkAIFeature,
  };
}
