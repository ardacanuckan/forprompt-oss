"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { AccountSettingsPanel } from "@features/organization/components/AccountSettingsPanel";

export default function SettingsPage() {
  return (
    <>
      <SignedIn>
        <div className="h-screen bg-black overflow-hidden">
          <AccountSettingsPanel />
        </div>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
