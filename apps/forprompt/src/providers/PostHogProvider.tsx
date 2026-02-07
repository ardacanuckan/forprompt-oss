"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, type ReactNode } from "react";
import { useUser, useOrganization } from "@clerk/nextjs";
import { env } from "~/env";

// Initialize PostHog only on client-side and when configured
if (typeof window !== "undefined" && env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageviews for Next.js App Router
    capture_pageleave: true,
  });
}

function PostHogIdentifier({ children }: { children: ReactNode }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();

  // Identify user when authenticated
  useEffect(() => {
    if (!userLoaded || !env.NEXT_PUBLIC_POSTHOG_KEY) return;

    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.firstName,
        created_at: user.createdAt?.toISOString(),
      });
    } else {
      posthog.reset();
    }
  }, [user, userLoaded]);

  // Set organization as a group for multi-tenancy analytics
  useEffect(() => {
    if (!orgLoaded || !env.NEXT_PUBLIC_POSTHOG_KEY) return;

    if (organization) {
      posthog.group("organization", organization.id, {
        name: organization.name,
        slug: organization.slug,
        created_at: organization.createdAt?.toISOString(),
        members_count: organization.membersCount,
      });
    }
  }, [organization, orgLoaded]);

  return <>{children}</>;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
  // Skip provider if PostHog is not configured
  if (!env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <PostHogIdentifier>{children}</PostHogIdentifier>
    </PHProvider>
  );
}

export { posthog };
