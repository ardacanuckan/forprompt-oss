/**
 * Polar Client Configuration
 *
 * Client-side utilities for Polar.sh integration.
 * Unlike RevenueCat which had a full client SDK, Polar uses
 * server-side checkout and customer portal routes.
 */

/**
 * Product IDs for ForPrompt subscription tiers (monthly only)
 * These should be configured in your Polar dashboard
 */
export const POLAR_PRODUCTS = {
  pro: process.env.NEXT_PUBLIC_POLAR_PRO_PRODUCT_ID || "",
  enterprise: process.env.NEXT_PUBLIC_POLAR_ENTERPRISE_PRODUCT_ID || "",
} as const;

/**
 * Get checkout URL for a product
 * Redirects to /api/checkout which handles the Polar checkout flow
 */
export function getCheckoutUrl(
  productId: string,
  options?: {
    customerExternalId?: string;
    customerEmail?: string;
    customerName?: string;
    metadata?: Record<string, string>;
  }
): string {
  const params = new URLSearchParams({
    products: productId,
  });

  if (options?.customerExternalId) {
    params.set("customerExternalId", options.customerExternalId);
  }

  if (options?.customerEmail) {
    params.set("customerEmail", options.customerEmail);
  }

  if (options?.customerName) {
    params.set("customerName", options.customerName);
  }

  if (options?.metadata) {
    params.set("metadata", encodeURIComponent(JSON.stringify(options.metadata)));
  }

  return `/api/checkout?${params.toString()}`;
}

/**
 * Get customer portal URL
 * Redirects to /api/portal which handles the Polar customer portal
 */
export function getPortalUrl(): string {
  return "/api/portal";
}

/**
 * Redirect to checkout for a specific tier
 */
export function redirectToCheckout(
  tier: "pro" | "enterprise",
  options?: {
    customerExternalId?: string;
    customerEmail?: string;
  }
): void {
  const productId = POLAR_PRODUCTS[tier];

  if (!productId) {
    console.error(`No product ID configured for ${tier}`);
    return;
  }

  const url = getCheckoutUrl(productId, options);
  window.location.href = url;
}

/**
 * Redirect to customer portal
 */
export function redirectToPortal(): void {
  window.location.href = getPortalUrl();
}

export type SubscriptionTier = "free" | "pro" | "enterprise";
