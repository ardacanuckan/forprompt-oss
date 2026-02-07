"use client";

/**
 * Pricing Plans Component
 * Minimal, monochromatic design for subscription tiers
 * Uses Polar.sh for checkout
 */

import { useState } from "react";
import { usePolar } from "~/providers/PolarProvider";
import { Loader2, ExternalLink } from "lucide-react";

const TIER_FEATURES = {
  free: {
    name: "Free",
    description: "Basic prompt management",
    price: "$0",
    features: [
      "1 project",
      "5 prompts",
      "100 traces/month",
      "10K production tokens/month",
      "API access",
      "Webhook support",
    ],
    notIncluded: [
      "AI prompt generation",
      "AI prompt analysis",
      "AI prompt editing",
      "AI enhancement suggestions",
    ],
  },
  pro: {
    name: "Pro",
    description: "Full AI-powered features",
    price: "$29",
    features: [
      "10 projects",
      "100 prompts per project",
      "10,000 traces/month",
      "2M production tokens/month",
      "500K AI tokens/month",
      "AI prompt generation",
      "AI prompt analysis",
      "AI prompt editing",
      "AI enhancement suggestions",
      "10 team members",
    ],
    notIncluded: [],
  },
  enterprise: {
    name: "Enterprise",
    description: "For large organizations",
    price: "$99",
    features: [
      "Unlimited projects",
      "Unlimited prompts",
      "Unlimited traces",
      "Unlimited tokens",
      "All AI features",
      "Unlimited team members",
      "Priority support",
      "Custom integrations",
      "SSO",
    ],
    notIncluded: [],
  },
};

interface PricingPlansProps {
  onSuccess?: () => void;
}

export function PricingPlans({ onSuccess }: PricingPlansProps) {
  const { currentTier, checkout, openPortal, isLoading, cancelAtPeriodEnd, periodEnd } = usePolar();
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: "pro" | "enterprise") => {
    setPurchasingTier(tier);
    try {
      // This redirects to Polar checkout
      checkout(tier);
      // Note: onSuccess won't be called here since we redirect
      // Success is handled via webhook
    } catch (error) {
      console.error("Checkout failed:", error);
      setPurchasingTier(null);
    }
  };

  const renderTierCard = (tier: "free" | "pro" | "enterprise") => {
    const config = TIER_FEATURES[tier];
    const isCurrentTier = currentTier === tier;
    const isUpgrade = tier !== "free" && (currentTier === "free" || (tier === "enterprise" && currentTier === "pro"));

    return (
      <div
        key={tier}
        className={`relative rounded-xl border p-6 transition-all flex flex-col ${
          tier === "pro"
            ? "border-white/30 bg-white/5"
            : isCurrentTier
              ? "border-white/20 bg-white/[0.02]"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
        }`}
      >
        {tier === "pro" && !isCurrentTier && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] text-white/80 uppercase tracking-wider">
            Most Popular
          </div>
        )}
        {isCurrentTier && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/60 uppercase tracking-wider">
            {cancelAtPeriodEnd ? "Cancels soon" : "Current"}
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-medium text-white mb-1">{config.name}</h3>
          <p className="text-sm text-white/40">{config.description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="text-3xl font-light text-white">{config.price}</div>
          {tier !== "free" && <div className="text-xs text-white/40 mt-1">/ month</div>}
        </div>

        {/* Features */}
        <ul className="space-y-2 flex-1">
          {config.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-white/70">
              <span className="text-white/40 mt-0.5">+</span>
              <span>{feature}</span>
            </li>
          ))}
          {config.notIncluded.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-white/30">
              <span className="text-white/20 mt-0.5">−</span>
              <span className="line-through">{feature}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <div className="mt-6">
          {tier === "free" ? (
            <button
              disabled
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"
            >
              {isCurrentTier ? "Current Plan" : "Downgrade via Portal"}
            </button>
          ) : isCurrentTier ? (
            <button
              onClick={openPortal}
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/5 text-white/60 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              Manage Subscription
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          ) : isUpgrade ? (
            <button
              onClick={() => handleCheckout(tier as "pro" | "enterprise")}
              disabled={isLoading || !!purchasingTier}
              className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                tier === "pro"
                  ? "bg-white text-black hover:bg-white/90"
                  : "bg-white/10 text-white hover:bg-white/15 border border-white/10"
              }`}
            >
              {purchasingTier === tier ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirecting...
                </span>
              ) : (
                `Upgrade to ${config.name}`
              )}
            </button>
          ) : (
            <button
              disabled
              className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/5 text-white/40 border border-white/10 cursor-not-allowed"
            >
              Contact Sales
            </button>
          )}
        </div>

        {/* Cancellation notice */}
        {isCurrentTier && cancelAtPeriodEnd && periodEnd && (
          <p className="mt-3 text-xs text-white/40 text-center">
            Access until {periodEnd.toLocaleDateString()}
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium text-white mb-1">Choose your plan</h2>
        <p className="text-sm text-white/50">
          Scale your AI prompt management with the right plan for your team
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 items-stretch">
        {renderTierCard("free")}
        {renderTierCard("pro")}
        {renderTierCard("enterprise")}
      </div>

      {/* Customer Portal Link */}
      {currentTier !== "free" && (
        <div className="text-center">
          <button
            onClick={openPortal}
            className="text-sm text-white/40 hover:text-white/60 transition-colors inline-flex items-center gap-1"
          >
            Manage billing & invoices
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
