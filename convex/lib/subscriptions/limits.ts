/**
 * Subscription tier limits and configuration
 */

export const SUBSCRIPTION_TIERS = {
  free: {
    name: "Free",
    // AI Token limits (internal ForPrompt AI operations)
    monthlyInternalAiTokens: 0, // No AI features for free tier
    // Production limits (SDK logging)
    monthlyProductionTokens: 10_000, // Very limited logging
    monthlyTraces: 100, // Very limited traces
    // Feature limits
    maxPrompts: 5, // Max 5 prompts for free tier
    maxProjects: 1, // Max 1 project for free tier
    maxMembers: 3,
    maxWebhooks: 1,
    // Features - AI features disabled for free tier
    features: {
      aiPromptGeneration: false, // Requires Pro
      aiPromptAnalysis: false, // Requires Pro
      aiPromptEditing: false, // Requires Pro
      aiEnhancementSuggestions: false, // Requires Pro
      conversationAnalysis: false, // Requires Pro
      batchReports: false, // Requires Pro
      versionReports: false, // Requires Pro
      webhooks: true,
      apiAccess: true,
    },
  },
  pro: {
    name: "Pro",
    monthlyInternalAiTokens: 500_000, // ~250 analyses or generations
    monthlyProductionTokens: 2_000_000,
    monthlyTraces: 10_000,
    maxPrompts: 100,
    maxProjects: 10,
    maxMembers: 10,
    maxWebhooks: 5,
    features: {
      aiPromptGeneration: true,
      aiPromptAnalysis: true,
      aiPromptEditing: true,
      aiEnhancementSuggestions: true,
      conversationAnalysis: true,
      batchReports: true,
      versionReports: true,
      webhooks: true,
      apiAccess: true,
    },
  },
  enterprise: {
    name: "Enterprise",
    monthlyInternalAiTokens: -1, // Unlimited
    monthlyProductionTokens: -1, // Unlimited
    monthlyTraces: -1, // Unlimited
    maxPrompts: -1, // Unlimited
    maxProjects: -1, // Unlimited
    maxMembers: -1, // Unlimited
    maxWebhooks: -1, // Unlimited
    features: {
      aiPromptGeneration: true,
      aiPromptAnalysis: true,
      aiPromptEditing: true,
      aiEnhancementSuggestions: true,
      conversationAnalysis: true,
      batchReports: true,
      versionReports: true,
      webhooks: true,
      apiAccess: true,
      prioritySupport: true,
      customIntegrations: true,
      sso: true,
    },
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS;
export type TierConfig = (typeof SUBSCRIPTION_TIERS)[SubscriptionTier];
export type FeatureName = keyof (typeof SUBSCRIPTION_TIERS)["free"]["features"];

/**
 * OSS: Always returns enterprise tier
 */
export function getDefaultTier(): SubscriptionTier {
  return "enterprise";
}

/**
 * Get tier config for a given tier
 */
export function getTierConfig(tier: SubscriptionTier): TierConfig {
  return SUBSCRIPTION_TIERS[tier];
}

/**
 * Check if a feature is available for a tier
 */
export function isFeatureAvailable(
  tier: SubscriptionTier,
  feature: FeatureName,
): boolean {
  const config = SUBSCRIPTION_TIERS[tier];
  return config.features[feature] ?? false;
}

/**
 * Get the limit for a metric (-1 means unlimited)
 */
export function getLimit(
  tier: SubscriptionTier,
  metric:
    | "monthlyInternalAiTokens"
    | "monthlyProductionTokens"
    | "monthlyTraces"
    | "maxPrompts"
    | "maxProjects"
    | "maxMembers"
    | "maxWebhooks",
): number {
  return SUBSCRIPTION_TIERS[tier][metric];
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Helper to get start of current month timestamp
 */
export function getMonthStart(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  return start.getTime();
}

/**
 * Helper to get end of current month timestamp
 */
export function getMonthEnd(date: Date = new Date()): number {
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return end.getTime();
}
