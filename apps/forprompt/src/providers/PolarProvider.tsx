"use client";

/**
 * Polar Provider for React
 *
 * Manages subscription state by fetching from Convex database.
 * Unlike RevenueCat which had a client SDK, Polar uses server-side
 * checkout and webhooks, so we track subscription status in our database.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { api, useQuery } from "~/convex/ConvexClientProvider";
import type { Id } from "~/convex/_generated/dataModel";
import {
  POLAR_PRODUCTS,
  getCheckoutUrl,
  getPortalUrl,
  type SubscriptionTier,
} from "~/lib/polar";

interface PolarProduct {
  id: string;
  name: string;
  tier: SubscriptionTier;
  priceFormatted: string;
}

interface PolarContextType {
  isLoading: boolean;
  currentTier: SubscriptionTier;
  subscriptionStatus: "active" | "cancelled" | "past_due" | "expired" | null;
  cancelAtPeriodEnd: boolean;
  periodEnd: Date | null;
  products: PolarProduct[];
  checkout: (tier: "pro" | "enterprise") => void;
  openPortal: () => void;
}

const PolarContext = createContext<PolarContextType | null>(null);

// Product display information (monthly only)
const PRODUCT_INFO: Record<
  keyof typeof POLAR_PRODUCTS,
  { name: string; tier: SubscriptionTier; priceFormatted: string }
> = {
  pro: { name: "Pro", tier: "pro", priceFormatted: "$29/month" },
  enterprise: { name: "Enterprise", tier: "enterprise", priceFormatted: "$99/month" },
};

export function PolarProvider({ children }: { children: ReactNode }) {
  const { organization } = useOrganization();
  const { user } = useUser();

  // Get Convex organizations to find the one matching Clerk org
  const organizations = useQuery(api.domains.organizations.queries.getUserOrganizations);
  const convexOrg = useMemo(
    () => organizations?.find((o) => o.clerkId === organization?.id),
    [organizations, organization?.id]
  );

  // Fetch subscription status from Convex
  const subscription = useQuery(
    api.domains.subscriptions.queries.getSubscription,
    convexOrg?._id ? { orgId: convexOrg._id as Id<"organizations"> } : "skip"
  );

  // Build products list from configured product IDs
  const products: PolarProduct[] = Object.entries(POLAR_PRODUCTS)
    .filter(([, id]) => id) // Only include products with configured IDs
    .map(([key, id]) => ({
      id,
      ...PRODUCT_INFO[key as keyof typeof POLAR_PRODUCTS],
    }));

  const checkout = useCallback(
    (tier: "pro" | "enterprise") => {
      const productId = POLAR_PRODUCTS[tier];

      if (!productId) {
        console.error(`No product ID configured for ${tier}`);
        return;
      }

      const url = getCheckoutUrl(productId, {
        customerExternalId: organization?.id,
        customerEmail: user?.primaryEmailAddress?.emailAddress,
        customerName: organization?.name || user?.fullName || undefined,
      });

      window.location.href = url;
    },
    [organization?.id, organization?.name, user?.primaryEmailAddress?.emailAddress, user?.fullName]
  );

  const openPortal = useCallback(() => {
    window.location.href = getPortalUrl();
  }, []);

  const currentTier = (subscription?.tier as SubscriptionTier) || "free";
  const subscriptionStatus = subscription?.status as PolarContextType["subscriptionStatus"] || null;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd || false;
  const periodEnd = subscription?.periodEnd ? new Date(subscription.periodEnd) : null;

  return (
    <PolarContext.Provider
      value={{
        isLoading: subscription === undefined,
        currentTier,
        subscriptionStatus,
        cancelAtPeriodEnd,
        periodEnd,
        products,
        checkout,
        openPortal,
      }}
    >
      {children}
    </PolarContext.Provider>
  );
}

export function usePolar() {
  const context = useContext(PolarContext);
  if (!context) {
    throw new Error("usePolar must be used within a PolarProvider");
  }
  return context;
}
