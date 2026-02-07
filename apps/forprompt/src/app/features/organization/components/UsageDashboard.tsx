"use client";

import { useOrganization } from "@clerk/nextjs";

import { cn } from "@forprompt/ui";

import type { Id } from "~/convex/_generated/dataModel";
import { api, useQuery } from "~/convex/ConvexClientProvider";

interface UsageBarProps {
  label: string;
  used: number;
  limit: number;
  percentage: number;
  isUnlimited: boolean;
  formatValue?: (value: number) => string;
}

function UsageBar({
  label,
  used,
  limit,
  percentage,
  isUnlimited,
  formatValue,
}: UsageBarProps) {
  const format = formatValue || ((v: number) => v.toLocaleString());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary text-sm">{label}</span>
        <span className="text-text-primary text-sm">
          {format(used)} / {isUnlimited ? "Unlimited" : format(limit)}
        </span>
      </div>
      <div className="bg-sidebar-hover h-2 overflow-hidden rounded-full">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300",
            percentage >= 90
              ? "bg-red-500"
              : percentage >= 70
                ? "bg-yellow-500"
                : "bg-green-500",
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

  const organizations = useQuery(
    api.domains.organizations.queries.getUserOrganizations,
  );
  const convexOrg = organizations?.find(
    (o: any) => o.clerkId === activeOrg?.id,
  );

  const usagePercentage = useQuery(
    api.domains.subscriptions.queries.getUsagePercentage,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip",
  );

  const subscription = useQuery(
    api.domains.subscriptions.queries.getSubscription,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip",
  );

  if (!usagePercentage || !subscription) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="bg-sidebar-hover h-6 w-1/3 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="bg-sidebar-hover h-4 w-1/4 rounded" />
              <div className="bg-sidebar-hover h-2 rounded" />
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
            <h3 className="text-text-primary text-base font-medium">Usage</h3>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wider uppercase",
                tier === "free"
                  ? "border border-white/10 bg-white/5 text-white/50"
                  : tier === "pro"
                    ? "border border-white/20 bg-white/10 text-white/80"
                    : "border border-white/30 bg-white/15 text-white",
              )}
            >
              {usagePercentage.tierName}
            </span>
            {subscription.cancelAtPeriodEnd && (
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                Cancelling
              </span>
            )}
          </div>
          <p className="text-text-secondary mt-0.5 text-xs">
            {tier === "free"
              ? "Basic prompt management"
              : tier === "pro"
                ? "Full AI-powered features"
                : "Unlimited access"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-text-tertiary text-xs">Resets in</p>
          <p className="text-text-primary text-sm font-medium">
            {daysLeft} days
          </p>
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
            <div className="flex items-center justify-between">
              <span className="text-text-secondary text-sm">AI Tokens</span>
              <span className="text-text-tertiary text-xs">Pro required</span>
            </div>
            <div className="bg-sidebar-hover h-2 overflow-hidden rounded-full">
              <div className="h-full w-0 rounded-full bg-white/10" />
            </div>
            <p className="text-text-tertiary text-[11px]">
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
        (tier !== "free" &&
          usagePercentage.internalAiTokens.percentage >= 80)) && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-white/50">
              warning
            </span>
            <div>
              <p className="text-text-primary text-sm font-medium">
                Approaching usage limit
              </p>
              <p className="text-text-secondary mt-0.5 text-xs">
                Consider upgrading your plan to avoid service interruption.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
