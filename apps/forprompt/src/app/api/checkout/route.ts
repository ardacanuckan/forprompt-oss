import { Polar } from "@polar-sh/sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * Polar Checkout Handler
 *
 * Redirects users to Polar checkout for subscription purchases.
 * Use with query parameters:
 * - products: Product ID (required)
 * - customerExternalId: Organization's Clerk ID (recommended for linking)
 * - customerEmail: Customer email (optional)
 *
 * Example: /api/checkout?products=PRODUCT_ID&customerExternalId=org_xxx
 */

const isDev = process.env.NODE_ENV === "development";

export async function GET(req: NextRequest) {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const successUrl = process.env.POLAR_SUCCESS_URL;
  const environment = process.env.POLAR_ENVIRONMENT;

  // Validate required environment variables
  if (!accessToken || !successUrl || !environment) {
    console.error("Checkout: Missing required environment variables");
    return NextResponse.json(
      { error: "Checkout is not configured" },
      { status: 500 }
    );
  }

  const url = new URL(req.url);
  const products = url.searchParams.getAll("products");

  if (products.length === 0) {
    return NextResponse.json(
      { error: "Missing products parameter" },
      { status: 400 }
    );
  }

  try {
    const polar = new Polar({
      accessToken,
      server: environment === "sandbox" ? "sandbox" : "production",
    });

    // Build success URL with checkout ID placeholder
    const success = new URL(successUrl);
    success.searchParams.set("checkoutId", "{CHECKOUT_ID}");

    const result = await polar.checkouts.create({
      products,
      successUrl: decodeURI(success.toString()),
      externalCustomerId: url.searchParams.get("customerExternalId") ?? undefined,
      customerEmail: url.searchParams.get("customerEmail") ?? undefined,
      customerName: url.searchParams.get("customerName") ?? undefined,
      metadata: url.searchParams.has("metadata")
        ? JSON.parse(url.searchParams.get("metadata") ?? "{}")
        : undefined,
    });

    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Checkout error:", error);

    // In development, return detailed error info
    if (isDev) {
      return NextResponse.json(
        {
          error: "Checkout failed",
          message: error instanceof Error ? error.message : "Unknown error",
          products,
        },
        { status: 500 }
      );
    }

    // In production, return generic error
    return NextResponse.json(
      { error: "Checkout failed. Please try again." },
      { status: 500 }
    );
  }
}
