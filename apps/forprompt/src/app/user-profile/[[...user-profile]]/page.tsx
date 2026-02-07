"use client";

import { SignedIn, SignedOut, RedirectToSignIn, UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <>
      <SignedIn>
        <div className="min-h-screen bg-black flex items-center justify-center py-12">
          <UserProfile
            path="/user-profile"
            appearance={{
              elements: {
                card: "bg-neutral-900 border border-neutral-800 shadow-2xl",
                navbar: "bg-neutral-950 border-r border-neutral-800",
                navbarButton: "text-neutral-400 hover:bg-neutral-800 hover:text-white",
                navbarButtonActive: "bg-neutral-800 text-white",
                headerTitle: "text-white",
                headerSubtitle: "text-neutral-400",
                formButtonPrimary: "bg-white hover:bg-neutral-100 text-black",
                formFieldInput: "bg-transparent border-neutral-700 text-white",
                formFieldLabel: "text-neutral-400",
                profileSectionTitleText: "text-white",
                profileSectionSubtitleText: "text-neutral-400",
              },
            }}
          />
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
