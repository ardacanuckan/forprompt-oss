"use client";

import { useOrganization } from "@clerk/nextjs";
import { api, useQuery } from "~/convex/ConvexClientProvider";
import type { Id } from "~/convex/_generated/dataModel";
import { cn } from "@forprompt/ui";
import { usePaywall } from "~/providers/PaywallProvider";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  percentage: number;
  isUnlimited: boolean;
  formatValue?: (value: number) => string;
}

function UsageBar({ label, used, limit, percentage, isUnlimited, formatValue }: UsageBarProps) {
  const format = formatValue || ((v: number) => v.toLocaleString());

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-sm text-text-primary">
          {format(used)} / {isUnlimited ? "Unlimited" : format(limit)}
        </span>
      </div>
      <div className="h-2 bg-sidebar-hover rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            percentage >= 90
              ? "bg-red-500"
              : percentage >= 70
                ? "bg-yellow-500"
                : "bg-green-500"
          )}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toLocaleString();
}

export function UsageDashboard() {
  const { organization: activeOrg } = useOrganization();
  const { openPaywall } = usePaywall();

  const organizations = useQuery(api.domains.organizations.queries.getUserOrganizations);
  const convexOrg = organizations?.find((o: any) => o.clerkId === activeOrg?.id);

  const usagePercentage = useQuery(
    api.domains.subscriptions.queries.getUsagePercentage,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip"
  );

  const subscription = useQuery(
    api.domains.subscriptions.queries.getSubscription,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip"
  );

  if (!usagePercentage || !subscription) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 bg-sidebar-hover rounded w-1/3" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-sidebar-hover rounded w-1/4" />
              <div className="h-2 bg-sidebar-hover rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const periodEnd = usagePercentage.periodEnd;
  const daysLeft = Math.ceil((periodEnd - Date.now()) / (1000 * 60 * 60 * 24));
  const tier = usagePercentage.tier;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-text-primary">Usage</h3>
            <span className={cn(
              "px-2 py-0.5 text-[10px] font-medium rounded-full uppercase tracking-wider",
              tier === "free"
                ? "bg-white/5 text-white/50 border border-white/10"
                : tier === "pro"
                  ? "bg-white/10 text-white/80 border border-white/20"
                  : "bg-white/15 text-white border border-white/30"
            )}>
              {usagePercentage.tierName}
            </span>
            {subscription.cancelAtPeriodEnd && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-red-500/10 text-red-400 rounded-full border border-red-500/20">
                Cancelling
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            {tier === "free"
              ? "Basic prompt management"
              : tier === "pro"
                ? "Full AI-powered features"
                : "Unlimited access"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-tertiary">Resets in</p>
          <p className="text-sm font-medium text-text-primary">{daysLeft} days</p>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="space-y-5">
        {/* AI Tokens - Only available for Pro and Enterprise */}
        {tier !== "free" ? (
          <UsageBar
            label="AI Tokens"
            used={usagePercentage.internalAiTokens.used}
            limit={usagePercentage.internalAiTokens.limit}
            percentage={usagePercentage.internalAiTokens.percentage}
            isUnlimited={usagePercentage.internalAiTokens.isUnlimited}
            formatValue={formatTokens}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">AI Tokens</span>
              <span className="text-xs text-text-tertiary">Pro required</span>
            </div>
            <div className="h-2 bg-sidebar-hover rounded-full overflow-hidden">
              <div className="h-full w-0 rounded-full bg-white/10" />
            </div>
            <p className="text-[11px] text-text-tertiary">
              AI features are available on Pro and Enterprise plans
            </p>
          </div>
        )}

        <UsageBar
          label="Production Tokens"
          used={usagePercentage.productionTokens.used}
          limit={usagePercentage.productionTokens.limit}
          percentage={usagePercentage.productionTokens.percentage}
          isUnlimited={usagePercentage.productionTokens.isUnlimited}
          formatValue={formatTokens}
        />

        <UsageBar
          label="Traces"
          used={usagePercentage.traces.used}
          limit={usagePercentage.traces.limit}
          percentage={usagePercentage.traces.percentage}
          isUnlimited={usagePercentage.traces.isUnlimited}
        />
      </div>

      {/* Warning if near limit */}
      {(usagePercentage.productionTokens.percentage >= 80 ||
        usagePercentage.traces.percentage >= 80 ||
        (tier !== "free" && usagePercentage.internalAiTokens.percentage >= 80)) && (
        <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-white/50 text-[18px]">warning</span>
            <div>
              <p className="text-sm font-medium text-text-primary">Approaching usage limit</p>
              <p className="text-xs text-text-secondary mt-0.5">
                Consider upgrading your plan to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade CTA for free tier */}
      {tier === "free" && (
        <div className="p-4 rounded-lg border border-white/10 bg-white/[0.02]">
          <h4 className="text-sm font-medium text-text-primary">Unlock AI Features</h4>
          <p className="text-xs text-text-secondary mt-1">
            Upgrade to Pro to access AI prompt generation, analysis, editing, and more.
          </p>
          <button
            onClick={() => openPaywall({ highlightTier: "pro" })}
            className="mt-3 px-4 py-1.5 bg-white/10 text-white text-xs font-medium rounded hover:bg-white/15 border border-white/10 transition-colors"
          >
            View Plans
          </button>
        </div>
      )}
    </div>
  );
}
