import { CustomerPortal } from "@polar-sh/nextjs";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Polar Customer Portal Handler
 *
 * Redirects authenticated users to their Polar customer portal
 * where they can manage subscriptions, view invoices, etc.
 *
 * Uses getExternalCustomerId to look up customers by their Clerk org ID
 * which was set as external_id during checkout.
 */
const portalHandler = CustomerPortal({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === "sandbox" ? "sandbox" : "production",
  getExternalCustomerId: async (_req: NextRequest) => {
    // Get the current organization from Clerk
    const { orgId } = await auth();

    if (!orgId) {
      throw new Error("No organization selected");
    }

    // Return Clerk org ID - Polar will look up the customer by external_id
    // This was set during checkout via customerExternalId parameter
    return orgId;
  },
});

export async function GET(req: NextRequest) {
  try {
    return await portalHandler(req);
  } catch (error) {
    console.error("Portal error:", error);

    // If customer not found, redirect to pricing page
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    if (errorMessage.includes("not found") || errorMessage.includes("404")) {
      // No subscription yet - redirect to pricing
      return NextResponse.redirect(new URL("/settings/billing", req.url));
    }

    // For other errors, show error page or redirect
    return NextResponse.redirect(
      new URL(`/settings/billing?error=${encodeURIComponent("Unable to open subscription portal. Please try again.")}`, req.url)
    );
  }
}
