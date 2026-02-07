"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [countdown, setCountdown] = useState(3);
  
  const checkoutId = searchParams.get("checkoutId") || searchParams.get("checkout_id");

  useEffect(() => {
    if (countdown <= 0) {
      router.push("/settings");
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px] text-emerald-400">
            check_circle
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold text-white mb-2">
          Payment Successful!
        </h1>
        
        {/* Description */}
        <p className="text-neutral-400 mb-6">
          Thank you for your subscription. Your account has been upgraded.
        </p>

        {/* Checkout ID (optional, for reference) */}
        {checkoutId && (
          <p className="text-xs text-neutral-600 mb-6 font-mono">
            Reference: {checkoutId.slice(0, 8)}...
          </p>
        )}

        {/* Redirect notice */}
        <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
          <span className="material-symbols-outlined text-[16px] animate-spin">
            progress_activity
          </span>
          <span>Redirecting to settings in {countdown}s...</span>
        </div>

        {/* Manual redirect button */}
        <button
          onClick={() => router.push("/settings")}
          className="mt-6 px-6 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-neutral-100 transition-colors"
        >
          Go to Settings Now
        </button>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-neutral-500">Loading...</div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <>
      <SignedIn>
        <Suspense fallback={<LoadingState />}>
          <SuccessContent />
        </Suspense>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
