import { NextRequest, NextResponse } from "next/server";

import { generateSetupPrompt } from "../../features/setup/prompt-template";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const apiKey = params.get("key");
  const org = params.get("org") || "My Organization";

  if (!apiKey) {
    return new NextResponse("Missing ?key= parameter", { status: 400 });
  }

  const prompt = generateSetupPrompt({
    apiKey,
    orgName: org,
    baseUrl: process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL!,
  });

  return new NextResponse(prompt, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
