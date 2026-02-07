"use client";

import { useEffect } from "react";
import { useUser, useOrganizationList } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "~/convex/ConvexClientProvider";

/**
 * Component that syncs Clerk user and organizations to Convex
 * Add this to your layout to ensure data is always in sync
 */
export function ConvexSyncProvider() {
  const { user, isLoaded: userLoaded } = useUser();
  const { userMemberships, isLoaded: orgsLoaded } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  });
  
  const syncCurrentUser = useMutation(api.sync.syncCurrentUser);
  const syncUserOrganizations = useMutation(api.sync.syncUserOrganizations);

  useEffect(() => {
    if (!userLoaded || !user) return;

    // Sync current user
    syncCurrentUser()
      .then(() => {
        console.log("User synced to Convex");
      })
      .catch((error) => {
        console.error("Failed to sync user:", error);
      });
  }, [userLoaded, user, syncCurrentUser]);

  useEffect(() => {
    if (!userLoaded || !orgsLoaded || !user) return;

    // Sync organizations
    const organizations = userMemberships.data?.map(({ organization, role }) => ({
      id: organization.id,
      name: organization.name,
      slug: organization.slug ?? undefined,
      imageUrl: organization.imageUrl ?? undefined,
      role,
    })) ?? [];

    if (organizations.length > 0) {
      syncUserOrganizations({ organizations })
        .then((result) => {
          console.log("Organizations synced to Convex:", result);
        })
        .catch((error) => {
          console.error("Failed to sync organizations:", error);
        });
    }
  }, [userLoaded, orgsLoaded, user, userMemberships.data, syncUserOrganizations]);

  return null;
}

