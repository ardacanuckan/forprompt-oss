"use client";

/**
 * Paywall Modal Component
 * Minimal, monochromatic design matching the app aesthetic
 * Uses Polar.sh for checkout
 */

import { useState, useEffect, useRef } from "react";
import { usePolar } from "~/providers/PolarProvider";
import { useAnalytics } from "~/hooks/useAnalytics";
import { Loader2, X } from "lucide-react";

const TIER_FEATURES = {
  pro: {
    name: "Pro",
    description: "For growing teams",
    price: "$29",
    features: [
      "500,000 AI tokens/month",
      "2,000,000 production tokens/month",
      "10,000 traces/month",
      "100 prompts",
      "10 projects",
      "10 team members",
      "AI prompt editing",
      "Conversation analysis",
      "Batch reports",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    price: "$99",
    features: [
      "Unlimited AI tokens",
      "Unlimited production tokens",
      "Unlimited traces",
      "Unlimited prompts",
      "Unlimited projects",
      "Unlimited team members",
      "Priority support",
    ],
  },
};

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  highlightTier?: "pro" | "enterprise";
  reason?: string;
}

export function PaywallModal({
  isOpen,
  onClose,
  onSuccess,
  highlightTier = "pro",
  reason,
}: PaywallModalProps) {
  const { currentTier, checkout, isLoading } = usePolar();
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);
  const { trackPaywallViewed, trackSubscriptionUpgraded } = useAnalytics();
  const hasTrackedView = useRef(false);

  // Track paywall view when modal opens
  useEffect(() => {
    if (isOpen && !hasTrackedView.current) {
      trackPaywallViewed(currentTier, reason, highlightTier);
      hasTrackedView.current = true;
    }
    if (!isOpen) {
      hasTrackedView.current = false;
    }
  }, [isOpen, currentTier, reason, highlightTier, trackPaywallViewed]);

  const handleCheckout = async (tier: "pro" | "enterprise") => {
    setPurchasingTier(tier);
    try {
      // Redirect to Polar checkout
      checkout(tier, "monthly");
      // Note: onSuccess/onClose won't be called here since we redirect
      // Success is handled via webhook
    } catch (error) {
      console.error("Checkout failed:", error);
      setPurchasingTier(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-white/10">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-medium text-white mb-2">
              Upgrade your plan
            </h2>
            <p className="text-white/50 text-sm">
              {reason || "Unlock more features and scale your AI prompt management"}
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Pro Plan */}
            <div
              className={`relative rounded-xl border p-6 transition-all ${
                highlightTier === "pro"
                  ? "border-white/30 bg-white/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {highlightTier === "pro" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 uppercase tracking-wider">
                  Recommended
                </div>
              )}

              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Pro</h3>
                  <p className="text-sm text-white/40">For growing teams</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-white">
                    {TIER_FEATURES.pro.price}
                  </div>
                  <div className="text-xs text-white/40">/ month</div>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {TIER_FEATURES.pro.features.slice(0, 6).map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <span className="text-white/40 mt-0.5">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
                {TIER_FEATURES.pro.features.length > 6 && (
                  <li className="text-xs text-white/40 pl-4">
                    + {TIER_FEATURES.pro.features.length - 6} more features
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleCheckout("pro")}
                disabled={isLoading || !!purchasingTier || currentTier === "pro"}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  highlightTier === "pro"
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                }`}
              >
                {purchasingTier === "pro" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </span>
                ) : currentTier === "pro" ? (
                  "Current Plan"
                ) : (
                  "Upgrade to Pro"
                )}
              </button>
            </div>

            {/* Enterprise Plan */}
            <div
              className={`relative rounded-xl border p-6 transition-all ${
                highlightTier === "enterprise"
                  ? "border-white/30 bg-white/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              {highlightTier === "enterprise" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 uppercase tracking-wider">
                  Recommended
                </div>
              )}

              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-1">Enterprise</h3>
                  <p className="text-sm text-white/40">For large organizations</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-light text-white">
                    {TIER_FEATURES.enterprise.price}
                  </div>
                  <div className="text-xs text-white/40">/ month</div>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {TIER_FEATURES.enterprise.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <span className="text-white/40 mt-0.5">+</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCheckout("enterprise")}
                disabled={isLoading || !!purchasingTier || currentTier === "enterprise"}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  highlightTier === "enterprise"
                    ? "bg-white text-black hover:bg-white/90"
                    : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
                }`}
              >
                {purchasingTier === "enterprise" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </span>
                ) : currentTier === "enterprise" ? (
                  "Current Plan"
                ) : (
                  "Upgrade to Enterprise"
                )}
              </button>
            </div>
          </div>

          {/* Current plan indicator */}
          {currentTier !== "free" && (
            <p className="text-center text-sm text-white/40 mt-6">
              You're currently on the{" "}
              <span className="text-white/60 capitalize">{currentTier}</span> plan
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-white/10 bg-white/[0.02]">
          <p className="text-center text-xs text-white/40">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
