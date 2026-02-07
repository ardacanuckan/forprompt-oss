"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface SplashScreenProps {
  /** Minimum time to show splash in ms */
  minDuration?: number;
  /** Is the app ready to show? */
  isReady: boolean;
}

export function SplashScreen({ minDuration = 800, isReady }: SplashScreenProps) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [minPassed, setMinPassed] = useState(false);

  useEffect(() => {
    const minTimer = setTimeout(() => {
      setMinPassed(true);
    }, minDuration);

    return () => clearTimeout(minTimer);
  }, [minDuration]);

  useEffect(() => {
    if (isReady && minPassed) {
      setFadeOut(true);
      const timer = setTimeout(() => setShow(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isReady, minPassed]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity duration-400 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Logo */}
        <div className="relative animate-[fadeIn_0.5s_ease-out]">
          <Image
            src="/logo.png"
            alt="ForPrompt"
            width={48}
            height={48}
            priority
            className="opacity-90"
          />
        </div>

        {/* Loading bar */}
        <div className="w-24 h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white/40 rounded-full"
            style={{
              animation: "loadingBar 1.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes loadingBar {
          0% {
            width: 0%;
            margin-left: 0%;
          }
          50% {
            width: 60%;
            margin-left: 20%;
          }
          100% {
            width: 0%;
            margin-left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
