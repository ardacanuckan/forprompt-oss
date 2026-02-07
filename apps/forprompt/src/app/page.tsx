"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useOrganization,
} from "@clerk/nextjs";
import { PromptWorkspace } from "@features/workspace/PromptWorkspace";
import { ChromaFlow, Shader, Swirl } from "shaders/react";

import { GrainOverlay, MagneticButton } from "@forprompt/ui";
import { useReveal } from "@forprompt/ui/hooks/use-reveal";

import type { Id } from "~/convex/_generated/dataModel";
import { api, useQuery } from "~/convex/ConvexClientProvider";

// Reveal wrapper component
function RevealWrapper({
  children,
  className = "",
  delay = 0,
  direction = "up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "left" | "right";
}) {
  const { ref, isVisible } = useReveal(0.2);

  const getTransform = () => {
    if (isVisible) return "translate-y-0 translate-x-0";
    switch (direction) {
      case "left":
        return "-translate-x-10";
      case "right":
        return "translate-x-10";
      default:
        return "translate-y-10";
    }
  };

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`transition-all duration-700 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      } ${getTransform()} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// Live Demo Component
function LiveDemo() {
  const [activeField, setActiveField] = useState(0);
  const [showGenerated, setShowGenerated] = useState(false);

  const fields = [
    {
      label: "Purpose",
      value: "Handle customer support inquiries for an e-commerce platform",
      color: "emerald",
    },
    {
      label: "Behavior",
      value:
        "Be empathetic, ask clarifying questions, never make promises without verification",
      color: "blue",
    },
    {
      label: "Constraints",
      value: "Don't share internal policies, escalate refunds over $500",
      color: "amber",
    },
  ];

  const generatedPrompt = `You are a customer support assistant for ShopMax...

## Core Purpose
Help customers resolve order issues, process returns, and answer product questions.

## Behavior Guidelines
- Always acknowledge customer frustration
- Ask clarifying questions before making assumptions
- Provide step-by-step solutions

## Constraints
- Never promise refunds without manager approval
- Escalate orders over $500 to senior support`;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveField((prev) => {
        if (prev < fields.length - 1) {
          return prev + 1;
        } else {
          setShowGenerated(true);
          return prev;
        }
      });
    }, 2000);

    const resetInterval = setInterval(() => {
      setActiveField(0);
      setShowGenerated(false);
    }, 12000);

    return () => {
      clearInterval(interval);
      clearInterval(resetInterval);
    };
  }, []);

  return (
    <div className="relative">
      {/* Main Demo Window */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
        {/* Window Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-white/20" />
              <div className="h-3 w-3 rounded-full bg-white/20" />
              <div className="h-3 w-3 rounded-full bg-white/20" />
            </div>
            <span className="text-[13px] text-white/60">
              support-agent.prompt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/30 bg-white/20 px-2 py-0.5 text-[11px] text-white">
              v4 · active
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Configuration Fields */}
          <div className="mb-6 space-y-4">
            {fields.map((field, idx) => (
              <div
                key={field.label}
                className={`transition-all duration-500 ${idx <= activeField ? "opacity-100" : "opacity-30"}`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] tracking-wider text-white/60 uppercase">
                    {field.label}
                  </span>
                  {idx < activeField && (
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] text-white">
                      ✓ Set
                    </span>
                  )}
                  {idx === activeField && !showGenerated && (
                    <span className="animate-pulse rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                      typing...
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-lg border bg-white/5 px-3 py-2 text-[13px] text-white transition-all duration-300 ${
                    idx === activeField && !showGenerated
                      ? "border-white/30"
                      : idx < activeField || showGenerated
                        ? "border-white/10"
                        : "border-white/5"
                  }`}
                >
                  {idx <= activeField ? field.value : "..."}
                  {idx === activeField && !showGenerated && (
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-white" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Generate Button / Generated Output */}
          {!showGenerated ? (
            <button
              className={`w-full rounded-lg py-2.5 text-[13px] font-medium transition-all duration-300 ${
                activeField === fields.length - 1
                  ? "bg-white text-black"
                  : "cursor-not-allowed bg-white/10 text-white/50"
              }`}
            >
              {activeField === fields.length - 1
                ? "Generate System Prompt →"
                : "Complete all fields to generate"}
            </button>
          ) : (
            <div className="overflow-hidden rounded-lg border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3 py-2">
                <span className="text-[11px] tracking-wider text-white/60 uppercase">
                  Generated Output
                </span>
                <span className="text-[10px] text-white">
                  ✓ Ready to deploy
                </span>
              </div>
              <div className="relative max-h-[140px] overflow-hidden p-3 font-mono text-[11px] leading-relaxed text-white/80">
                <pre className="whitespace-pre-wrap">{generatedPrompt}</pre>
                <div className="absolute right-0 bottom-0 left-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Badge */}
      <div className="absolute -top-3 -right-3 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white shadow-xl backdrop-blur-md">
        Live preview
      </div>
    </div>
  );
}

// Product Demo Mockup with 3D effect - Multiple windows
function ProductDemoMockup() {
  return (
    <div
      className="relative h-full min-h-[480px] w-full"
      style={{ perspective: "1200px" }}
    >
      {/* Container for 3D windows - shifted right for better integration */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Back window - Config Interface */}
        <div
          className="absolute w-[380px]"
          style={{
            transform:
              "rotateY(-12deg) rotateX(4deg) translateX(-60px) translateZ(-40px)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/20 bg-black/60 shadow-2xl backdrop-blur-xl">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                  <div className="h-2.5 w-2.5 rounded-full bg-white/30" />
                </div>
                <span className="font-mono text-xs text-white/60">
                  support-agent.prompt
                </span>
              </div>
              <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                v3
              </span>
            </div>

            {/* Content */}
            <div className="space-y-3 p-4">
              <div>
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Purpose
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  Handle customer support inquiries
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Behavior
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  Be empathetic, ask clarifying questions
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Constraints
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                  Escalate refunds over $500
                </div>
              </div>
              <button className="w-full rounded-lg border border-white/20 bg-white/10 py-2.5 text-sm text-white transition-colors hover:bg-white/15">
                Generate System Prompt →
              </button>
            </div>
          </div>
        </div>

        {/* Front window - AI Editor (Cursor-style) */}
        <div
          className="absolute w-[400px]"
          style={{
            transform:
              "rotateY(-8deg) rotateX(2deg) translateX(80px) translateY(20px) translateZ(40px)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="overflow-hidden rounded-2xl border border-white/25 bg-black/80 shadow-2xl shadow-black/50 backdrop-blur-xl">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                </div>
                <span className="font-mono text-xs text-white/60">
                  AI Editor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-white" />
                <span className="text-[10px] text-white/70">AI Active</span>
              </div>
            </div>

            {/* Editor content */}
            <div className="p-4 font-mono text-[11px] leading-relaxed">
              <div className="mb-1 flex gap-3">
                <div className="w-4 text-right text-white/30 select-none">
                  1
                </div>
                <div className="text-white/60"># Customer Support Agent</div>
              </div>
              <div className="mb-1 flex gap-3">
                <div className="w-4 text-right text-white/30 select-none">
                  2
                </div>
                <div className="text-white/80">
                  You are a helpful support assistant...
                </div>
              </div>

              {/* AI suggestion highlight */}
              <div className="-mx-4 my-2 flex gap-3 border-l-2 border-white bg-white/5 px-4 py-2">
                <div className="w-4 text-right text-white/30 select-none">
                  3
                </div>
                <div className="text-[11px]">
                  <span className="text-white/40 line-through">
                    Be polite and helpful
                  </span>
                  <span className="ml-2 text-white">
                    → Acknowledge frustration first
                  </span>
                </div>
              </div>

              <div className="mb-1 flex gap-3">
                <div className="w-4 text-right text-white/30 select-none">
                  4
                </div>
                <div className="text-white/80">
                  - Never make promises without verification
                </div>
              </div>
              <div className="mb-1 flex gap-3">
                <div className="w-4 text-right text-white/30 select-none">
                  5
                </div>
                <div className="text-white/80">
                  - Escalate complex issues to senior support
                </div>
              </div>

              {/* AI input box */}
              <div className="-mx-4 mt-4 border-t border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-white/50">AI:</span>
                  <span className="text-white/80">
                    Make it more empathetic
                    <span className="ml-0.5 animate-pulse">|</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating metrics card - bottom right */}
        <div
          className="absolute right-4 bottom-8 rounded-xl border border-white/20 bg-black/70 p-3 shadow-xl backdrop-blur-xl"
          style={{ transform: "rotateY(-5deg)" }}
        >
          <div className="mb-1 text-[10px] tracking-wider text-white/50 uppercase">
            Performance
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-light text-white">94%</span>
            <span className="text-xs text-white/50">satisfaction</span>
          </div>
          <div className="mt-0.5 text-[10px] text-green-400">
            ↑ 8% after AI edits
          </div>
        </div>

        {/* Live indicator - top */}
        <div
          className="absolute top-4 right-8 rounded-full border border-white/20 bg-black/70 px-3 py-1.5 shadow-xl backdrop-blur-xl"
          style={{ transform: "rotateY(-5deg)" }}
        >
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs text-white/80">Live</span>
          </div>
        </div>
      </div>

      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-[100px]" />
    </div>
  );
}

// Landing page sections
function HeroSection() {
  return (
    <section
      id="hero"
      className="flex min-h-[85vh] w-full shrink-0 items-center px-4 pt-20 pb-10 sm:px-6 md:min-h-screen md:w-screen md:px-12 md:pb-0 lg:px-16"
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-4">
          {/* Left side - Text content */}
          <div className="shrink-0 lg:w-[45%] xl:w-[40%]">
            <RevealWrapper delay={0}>
              <div className="mb-4 inline-block rounded-full border border-white/30 bg-white/10 px-3 py-1.5 backdrop-blur-sm sm:mb-6 sm:px-4">
                <p className="font-mono text-[10px] text-white sm:text-xs">
                  Prompt management for production AI
                </p>
              </div>
            </RevealWrapper>

            <RevealWrapper delay={100}>
              <h1 className="mb-4 font-sans text-3xl leading-[1.1] font-medium tracking-tight text-white sm:mb-6 sm:text-4xl md:text-5xl lg:text-[52px] xl:text-6xl">
                Stop writing prompts.
                <br />
                <span className="text-white">Start configuring them.</span>
              </h1>
            </RevealWrapper>

            <RevealWrapper delay={200}>
              <p className="mb-6 max-w-lg text-sm leading-relaxed text-white/60 sm:mb-8 sm:text-base">
                Define purpose, behavior, and constraints separately. AI
                generates production-ready system prompts. Deploy without code
                changes.
              </p>
            </RevealWrapper>

            <RevealWrapper delay={300}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <SignInButton mode="modal">
                  <MagneticButton size="lg" variant="primary">
                    Start building
                  </MagneticButton>
                </SignInButton>
                <Link href="/docs">
                  <MagneticButton size="lg" variant="secondary">
                    View docs →
                  </MagneticButton>
                </Link>
              </div>
            </RevealWrapper>

            <RevealWrapper delay={400}>
              <p className="mt-4 text-xs text-white/40 sm:mt-6 sm:text-sm">
                Free forever · Upgrade when you need AI features
              </p>
            </RevealWrapper>
          </div>

          {/* Right side - Product Demo (desktop only) */}
          <div className="relative hidden h-[520px] lg:block lg:w-[55%] xl:w-[60%]">
            <RevealWrapper delay={300} direction="right" className="h-full">
              <ProductDemoMockup />
            </RevealWrapper>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhatIsSection({
  scrollContainerRef,
}: {
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const steps = [
    {
      num: "1",
      title: "Configure",
      desc: "Fill in structured fields: purpose, behavior, constraints, tools.",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      num: "2",
      title: "Generate",
      desc: "AI creates a complete system prompt from your configuration.",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
    },
    {
      num: "3",
      title: "Deploy",
      desc: "Sync to your codebase. Import as TypeScript. No redeploy needed.",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
    {
      num: "4",
      title: "Improve",
      desc: "AI analyzes production conversations, suggests improvements.",
      icon: (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
    },
  ];

  // Track scroll position within this section (desktop only)
  useEffect(() => {
    if (isMobile) return;

    const container = scrollContainerRef?.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    const handleScroll = () => {
      const sectionLeft = section.offsetLeft;
      const sectionWidth = section.offsetWidth;
      const viewportWidth = window.innerWidth;
      const scrollLeft = container.scrollLeft;

      // Calculate how far we've scrolled into this section
      const sectionStart = sectionLeft - viewportWidth;
      const sectionEnd = sectionLeft + sectionWidth - viewportWidth;
      const sectionScrollLength = sectionEnd - sectionStart;

      // Progress through this section (0 to 1)
      const progress = Math.max(
        0,
        Math.min(1, (scrollLeft - sectionStart) / sectionScrollLength),
      );
      setScrollProgress(progress);

      // Determine active step based on progress
      const stepIndex = Math.min(
        Math.floor(progress * steps.length),
        steps.length - 1,
      );
      setActiveStep(stepIndex);
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener("scroll", handleScroll);
  }, [scrollContainerRef, steps.length, isMobile]);

  // Mobile: auto-cycle through steps
  useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [isMobile, steps.length]);

  return (
    <section
      id="what-is"
      ref={sectionRef}
      className="relative w-full shrink-0 py-14 md:h-screen md:w-[300vw] md:py-0"
    >
      {/* Sticky content that stays in view while scrolling through the section */}
      <div className="flex items-center px-4 pt-16 sm:px-6 md:sticky md:top-0 md:left-0 md:h-screen md:w-screen md:px-12">
        <div className="mx-auto w-full max-w-5xl">
          <RevealWrapper>
            <div className="mb-6 text-center sm:mb-10">
              <h2 className="mb-2 text-xl font-medium text-white sm:text-2xl md:text-4xl">
                How it works
              </h2>
              <p className="mx-auto max-w-xl px-4 text-xs text-white/50 sm:text-sm">
                From configuration to production in four simple steps
              </p>
            </div>
          </RevealWrapper>

          {/* Flow Visualization */}
          <div className="relative">
            {/* Connection Line (desktop only) */}
            <div className="absolute top-[45px] right-[10%] left-[10%] hidden h-[2px] bg-white/10 md:block">
              {/* Animated progress */}
              <div
                className="h-full bg-white transition-all duration-300 ease-out"
                style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
              />
              {/* Glowing dot */}
              <div
                className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-300 ease-out"
                style={{
                  left: `${(activeStep / (steps.length - 1)) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>

            {/* Steps - Desktop grid */}
            <div className="hidden grid-cols-4 gap-6 md:grid">
              {steps.map((step, idx) => (
                <RevealWrapper key={step.num} delay={idx * 100}>
                  <div
                    className={`group relative transition-all duration-300 ${
                      activeStep === idx ? "scale-105" : "opacity-60"
                    }`}
                  >
                    {/* Node */}
                    <div className="flex flex-col items-center">
                      {/* Circle with icon */}
                      <div
                        className={`relative flex h-[90px] w-[90px] items-center justify-center rounded-full transition-all duration-300 ${
                          activeStep === idx
                            ? "border-2 border-white/50 bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                            : "border border-white/10 bg-white/5"
                        }`}
                      >
                        {/* Pulse ring animation for active */}
                        {activeStep === idx && (
                          <div className="absolute inset-0 animate-ping rounded-full border-2 border-white/50" />
                        )}

                        {/* Inner circle with icon */}
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 ${
                            activeStep === idx
                              ? "bg-white text-black"
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {step.icon}
                        </div>
                      </div>

                      {/* Label */}
                      <div className="mt-4 text-center">
                        <div
                          className={`mb-0.5 font-mono text-[10px] transition-colors ${
                            activeStep === idx ? "text-white" : "text-white/40"
                          }`}
                        >
                          STEP {step.num}
                        </div>
                        <h3
                          className={`mb-1 text-base font-medium transition-colors ${
                            activeStep === idx ? "text-white" : "text-white/70"
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`mx-auto max-w-[160px] text-xs leading-relaxed transition-colors ${
                            activeStep === idx
                              ? "text-white/70"
                              : "text-white/40"
                          }`}
                        >
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                </RevealWrapper>
              ))}
            </div>

            {/* Steps - Mobile carousel view */}
            <div className="md:hidden">
              {/* Active step display */}
              <div className="flex flex-col items-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-white/50 bg-white/20 shadow-[0_0_20px_rgba(255,255,255,0.3)] sm:h-24 sm:w-24">
                  <div className="absolute inset-0 animate-ping rounded-full border-2 border-white/50" />
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black sm:h-12 sm:w-12">
                    {steps[activeStep]?.icon}
                  </div>
                </div>
                <div className="mt-4 px-4 text-center">
                  <div className="mb-1 font-mono text-[10px] text-white">
                    STEP {steps[activeStep]?.num}
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-white sm:text-xl">
                    {steps[activeStep]?.title}
                  </h3>
                  <p className="mx-auto max-w-[280px] text-sm text-white/70">
                    {steps[activeStep]?.desc}
                  </p>
                </div>
              </div>

              {/* Step indicators */}
              <div className="mt-8 flex justify-center gap-2">
                {steps.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveStep(idx)}
                    className={`h-2 rounded-full transition-all ${
                      activeStep === idx ? "w-6 bg-white" : "w-2 bg-white/30"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Mobile: auto-cycle through features
  useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 5); // 3 features + 2 SDK cards
    }, 3000);

    return () => clearInterval(interval);
  }, [isMobile]);

  const features = [
    {
      category: "Prompt Registry",
      title: "Centralized prompt management",
      description:
        "Visual editor for non-technical stakeholders. Version control with comments, branching, and instant rollback. No engineering bottlenecks.",
      highlight: false,
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      stats: { label: "Versions", value: "∞" },
    },
    {
      category: "Evaluations",
      title: "Test before you ship",
      description:
        "Batch evaluations with AI and human graders. Regression testing on every prompt update. Compare outputs across models.",
      highlight: false,
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      stats: { label: "Models", value: "15+" },
    },
    {
      category: "Observability",
      title: "See what's happening in production",
      description:
        "Track cost, latency, and success rates. Debug with full execution logs. AI identifies failure patterns automatically.",
      highlight: true,
      icon: (
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      stats: { label: "Uptime", value: "99.9%" },
    },
  ];

  const sdkCards = [
    {
      category: "TypeScript & Python SDK",
      title: "Deploy in seconds",
      description: "Update prompts from dashboard. Deploy with one command.",
      isCode: true,
    },
    {
      category: "Model Agnostic",
      title: "One prompt, any model",
      description:
        "One prompt template, any model. Switch providers without changing code.",
      isModels: true,
    },
  ];

  // All items for mobile carousel
  const allItems = [...features, ...sdkCards];

  return (
    <section
      id="features"
      className="flex w-full shrink-0 items-center px-4 py-14 sm:px-6 md:min-h-screen md:w-screen md:px-12 md:py-16"
    >
      <div className="mx-auto w-full max-w-7xl">
        <RevealWrapper>
          <div className="mb-6 text-center sm:mb-8">
            <h2 className="mb-2 text-xl font-medium text-white sm:text-2xl md:text-4xl">
              Everything you need for production AI
            </h2>
            <p className="mx-auto max-w-2xl px-2 text-xs text-white/50 sm:text-sm">
              From prototype to production. Manage prompts, run evaluations, and
              monitor performance—all in one platform.
            </p>
          </div>
        </RevealWrapper>

        {/* Desktop Grid */}
        <div className="hidden md:block">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {features.map((feature, idx) => (
              <RevealWrapper key={feature.category} delay={idx * 100}>
                <div
                  className={`flex min-h-[180px] flex-col rounded-xl p-5 transition-all ${
                    feature.highlight
                      ? "border border-white/30 bg-white/15 hover:border-white/50 hover:bg-white/20"
                      : "border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`text-[10px] tracking-wider uppercase ${feature.highlight ? "text-white" : "text-white/50"}`}
                    >
                      {feature.category}
                    </div>
                    <div
                      className={`rounded-lg p-1.5 ${feature.highlight ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}
                    >
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="mb-2 text-base font-medium text-white">
                    {feature.title}
                  </h3>
                  <p className="flex-1 text-[12px] leading-relaxed text-white/60">
                    {feature.description}
                  </p>
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-light text-white">
                        {feature.stats.value}
                      </span>
                      <span className="text-[11px] text-white/40">
                        {feature.stats.label}
                      </span>
                    </div>
                  </div>
                </div>
              </RevealWrapper>
            ))}
          </div>

          {/* SDK & Model Support - Desktop */}
          <div className="grid grid-cols-2 gap-3">
            <RevealWrapper delay={300}>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
                <div className="mb-2 text-[10px] tracking-wider text-white/50 uppercase">
                  TypeScript & Python SDK
                </div>
                <div className="mb-3 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[11px]">
                  <div className="mb-1 text-white/40">// Deploy in seconds</div>
                  <div>
                    <span className="text-white">npx</span>{" "}
                    <span className="text-white">forprompt deploy</span>
                  </div>
                  <div className="mt-1 text-white">✓ 8 prompts synced</div>
                </div>
                <p className="text-[12px] text-white/60">
                  Update prompts from dashboard. Deploy with one command.
                </p>
              </div>
            </RevealWrapper>

            <RevealWrapper delay={400}>
              <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10">
                <div className="mb-2 text-[10px] tracking-wider text-white/50 uppercase">
                  Model Agnostic
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {[
                    "OpenAI",
                    "Anthropic",
                    "Google",
                    "Mistral",
                    "Meta",
                    "Azure",
                  ].map((model) => (
                    <span
                      key={model}
                      className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[10px] text-white/80"
                    >
                      {model}
                    </span>
                  ))}
                </div>
                <p className="text-[12px] text-white/60">
                  One prompt template, any model. Switch providers without
                  changing code.
                </p>
              </div>
            </RevealWrapper>
          </div>
        </div>

        {/* Mobile Carousel */}
        <div className="md:hidden">
          <div className="flex flex-col items-center">
            {/* Feature Card */}
            <div className="w-full max-w-[320px]">
              {activeFeature < 3 ? (
                // Feature cards
                <div
                  className={`flex min-h-[220px] flex-col rounded-xl p-5 transition-all ${
                    features[activeFeature]?.highlight
                      ? "border border-white/30 bg-white/15"
                      : "border border-white/10 bg-white/5 backdrop-blur-sm"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div
                      className={`text-[10px] tracking-wider uppercase ${features[activeFeature]?.highlight ? "text-white" : "text-white/50"}`}
                    >
                      {features[activeFeature]?.category}
                    </div>
                    <div
                      className={`rounded-lg p-2 ${features[activeFeature]?.highlight ? "bg-white/20 text-white" : "bg-white/10 text-white/60"}`}
                    >
                      {features[activeFeature]?.icon}
                    </div>
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-white">
                    {features[activeFeature]?.title}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-white/60">
                    {features[activeFeature]?.description}
                  </p>
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-light text-white">
                        {features[activeFeature]?.stats.value}
                      </span>
                      <span className="text-xs text-white/40">
                        {features[activeFeature]?.stats.label}
                      </span>
                    </div>
                  </div>
                </div>
              ) : activeFeature === 3 ? (
                // SDK card
                <div className="min-h-[220px] rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 text-[10px] tracking-wider text-white/50 uppercase">
                    TypeScript & Python SDK
                  </div>
                  <div className="mb-4 rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-xs">
                    <div className="mb-1 text-white/40">
                      // Deploy in seconds
                    </div>
                    <div>
                      <span className="text-white">npx</span>{" "}
                      <span className="text-white">forprompt deploy</span>
                    </div>
                    <div className="mt-1 text-white">✓ 8 prompts synced</div>
                  </div>
                  <p className="text-sm text-white/60">
                    Update prompts from dashboard. Deploy with one command.
                  </p>
                </div>
              ) : (
                // Models card
                <div className="min-h-[220px] rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <div className="mb-3 text-[10px] tracking-wider text-white/50 uppercase">
                    Model Agnostic
                  </div>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {[
                      "OpenAI",
                      "Anthropic",
                      "Google",
                      "Mistral",
                      "Meta",
                      "Azure",
                    ].map((model) => (
                      <span
                        key={model}
                        className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/80"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-white/60">
                    One prompt template, any model. Switch providers without
                    changing code.
                  </p>
                </div>
              )}
            </div>

            {/* Feature indicators */}
            <div className="mt-6 flex justify-center gap-2">
              {allItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveFeature(idx)}
                  className={`h-2 rounded-full transition-all ${
                    activeFeature === idx ? "w-6 bg-white" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const freeFeatures = [
    "5 prompts",
    "1 project",
    "3 team members",
    "SDK & API access",
    "Webhooks",
    "Version control",
  ];

  const proFeatures = [
    "100 prompts",
    "10 projects",
    "10 team members",
    "AI prompt generation",
    "AI prompt analysis & editing",
    "Conversation analysis",
    "Batch & version reports",
    "2M production tokens/mo",
  ];

  const enterpriseFeatures = [
    "Unlimited prompts & projects",
    "Unlimited team members",
    "Unlimited production tokens",
    "Priority support",
    "Custom integrations",
    "SSO & SAML",
  ];

  return (
    <section
      id="pricing"
      className="flex w-full shrink-0 items-center px-3 py-12 sm:px-6 md:min-h-screen md:w-screen md:px-12 md:py-12"
    >
      <div className="mx-auto w-full max-w-7xl">
        <RevealWrapper>
          <div className="mb-6 text-center sm:mb-12">
            <h2 className="mb-2 text-2xl leading-tight font-light text-white sm:mb-4 sm:text-4xl md:text-5xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto max-w-lg px-4 text-xs text-white/60 sm:text-[16px]">
              Start free and upgrade when you need AI features.
            </p>
          </div>
        </RevealWrapper>

        {/* Mobile: Horizontal scroll cards - centered */}
        <div className="scrollbar-hide snap-x snap-mandatory overflow-x-auto pb-4 md:hidden">
          <div
            className="inline-flex gap-3"
            style={{
              paddingLeft: "calc(50vw - 140px)",
              paddingRight: "calc(50vw - 140px)",
            }}
          >
            {/* Free Plan - Mobile */}
            <div className="w-[280px] flex-shrink-0 snap-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-4">
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Free
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-white">$0</span>
                  <span className="text-xs text-white/50">/ forever</span>
                </div>
                <p className="mt-1.5 text-xs text-white/60">
                  Get started with the basics
                </p>
              </div>

              <div className="mb-5 space-y-2">
                {freeFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs text-white/80"
                  >
                    <span className="text-[10px] text-white/50">+</span> {item}
                  </div>
                ))}
                <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-xs text-white/40">
                  <span className="text-[10px] text-white/30">−</span> No AI
                  features
                </div>
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="secondary"
                  className="w-full"
                >
                  Get started free
                </MagneticButton>
              </SignInButton>
            </div>

            {/* Pro Plan - Mobile */}
            <div className="relative w-[280px] flex-shrink-0 snap-center rounded-2xl border border-white/30 bg-white/15 p-5">
              <div className="absolute top-3 right-3">
                <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-medium text-black">
                  Popular
                </span>
              </div>

              <div className="mb-4">
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Pro
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-white">$20</span>
                  <span className="text-xs text-white/50">/ month</span>
                </div>
                <p className="mt-1.5 text-xs text-white/60">
                  For teams using AI features
                </p>
              </div>

              <div className="mb-5 space-y-2">
                {proFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs text-white/80"
                  >
                    <span className="text-[10px] text-white">+</span> {item}
                  </div>
                ))}
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="primary"
                  className="w-full"
                >
                  Upgrade to Pro
                </MagneticButton>
              </SignInButton>
            </div>

            {/* Enterprise Plan - Mobile */}
            <div className="w-[280px] flex-shrink-0 snap-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              <div className="mb-4">
                <div className="mb-1.5 text-[10px] tracking-wider text-white/50 uppercase">
                  Enterprise
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-light text-white">$250</span>
                  <span className="text-xs text-white/50">/ month</span>
                </div>
                <p className="mt-1.5 text-xs text-white/60">
                  For scaling organizations
                </p>
              </div>

              <div className="mb-5 space-y-2">
                <div className="mb-1.5 text-xs text-white/60">
                  Everything in Pro, plus:
                </div>
                {enterpriseFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-xs text-white/80"
                  >
                    <span className="text-[10px] text-white">+</span> {item}
                  </div>
                ))}
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="secondary"
                  className="w-full"
                >
                  Get Enterprise
                </MagneticButton>
              </SignInButton>
            </div>
          </div>
        </div>

        {/* Mobile swipe indicator */}
        <div className="mt-2 flex justify-center gap-1.5 md:hidden">
          <span className="text-[10px] text-white/40">
            ← Swipe to see all plans →
          </span>
        </div>

        {/* Desktop Grid */}
        <div className="mx-auto hidden max-w-5xl gap-4 sm:gap-6 md:grid md:grid-cols-3">
          {/* Free Plan */}
          <RevealWrapper delay={100}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 sm:p-6">
              <div className="mb-5">
                <div className="mb-2 text-[11px] tracking-wider text-white/50 uppercase">
                  Free
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-light text-white sm:text-[40px]">
                    $0
                  </span>
                  <span className="text-sm text-white/50">/ forever</span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  Get started with the basics
                </p>
              </div>

              <div className="mb-6 flex-1 space-y-2.5">
                {freeFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-[13px] text-white/80"
                  >
                    <span className="text-white/50">+</span> {item}
                  </div>
                ))}
                <div className="flex items-center gap-2.5 border-t border-white/10 pt-2 text-[13px] text-white/40">
                  <span className="text-white/30">−</span> No AI features
                </div>
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="secondary"
                  className="w-full"
                >
                  Get started free
                </MagneticButton>
              </SignInButton>
            </div>
          </RevealWrapper>

          {/* Pro Plan */}
          <RevealWrapper delay={200}>
            <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/30 bg-white/15 p-5 transition-all hover:border-white/50 sm:p-6">
              {/* Popular badge */}
              <div className="absolute top-3 right-3">
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-black">
                  Popular
                </span>
              </div>

              <div className="mb-5">
                <div className="mb-2 text-[11px] tracking-wider text-white/50 uppercase">
                  Pro
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-light text-white sm:text-[40px]">
                    $20
                  </span>
                  <span className="text-sm text-white/50">/ month</span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  For teams using AI features
                </p>
              </div>

              <div className="mb-6 flex-1 space-y-2.5">
                {proFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-[13px] text-white/80"
                  >
                    <span className="text-white">+</span> {item}
                  </div>
                ))}
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="primary"
                  className="w-full"
                >
                  Upgrade to Pro
                </MagneticButton>
              </SignInButton>
            </div>
          </RevealWrapper>

          {/* Enterprise Plan */}
          <RevealWrapper delay={300}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all hover:border-white/20 sm:p-6">
              <div className="mb-5">
                <div className="mb-2 text-[11px] tracking-wider text-white/50 uppercase">
                  Enterprise
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[32px] font-light text-white sm:text-[40px]">
                    $250
                  </span>
                  <span className="text-sm text-white/50">/ month</span>
                </div>
                <p className="mt-2 text-sm text-white/60">
                  For scaling organizations
                </p>
              </div>

              <div className="mb-6 flex-1 space-y-2.5">
                <div className="mb-2 text-[13px] text-white/60">
                  Everything in Pro, plus:
                </div>
                {enterpriseFeatures.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2.5 text-[13px] text-white/80"
                  >
                    <span className="text-white">+</span> {item}
                  </div>
                ))}
              </div>

              <SignInButton mode="modal">
                <MagneticButton
                  size="default"
                  variant="secondary"
                  className="w-full"
                >
                  Get Enterprise
                </MagneticButton>
              </SignInButton>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <section className="flex w-full shrink-0 items-center px-4 py-14 sm:px-6 md:min-h-screen md:w-screen md:px-12 md:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <RevealWrapper>
          <div className="mb-8 text-center sm:mb-12">
            <h2 className="mb-3 text-2xl font-light text-white sm:mb-4 sm:text-3xl md:text-5xl">
              Ready to transform your
              <br />
              <span className="text-white/50">prompt workflow?</span>
            </h2>
            <p className="mx-auto mb-6 max-w-[450px] px-4 text-sm text-white/60 sm:mb-8 sm:text-base">
              Join teams who are shipping better AI experiences faster.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <SignInButton mode="modal">
                <MagneticButton size="lg" variant="primary">
                  Start for free
                </MagneticButton>
              </SignInButton>
              <span className="text-xs text-white/40">
                No credit card required
              </span>
            </div>
          </div>
        </RevealWrapper>

        <RevealWrapper delay={200}>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:pt-8">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="ForPrompt" width={20} height={20} />
              <span className="text-xs text-white/50 sm:text-[14px]">
                forprompt © 2026
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/50 sm:gap-6 sm:text-[14px]">
              <Link href="/docs" className="transition-colors hover:text-white">
                Docs
              </Link>
              <Link href="/mcp" className="transition-colors hover:text-white">
                MCP
              </Link>
              <Link href="/blog" className="transition-colors hover:text-white">
                Blog
              </Link>
              <a
                href="https://www.linkedin.com/company/forprompt/"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-white"
              >
                LinkedIn
              </a>
              <a
                href="mailto:hello@forprompt.dev"
                className="transition-colors hover:text-white"
              >
                Contact
              </a>
            </div>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}

// Landing page with WebGL shader background
function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const shaderContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check when shader is ready
  useEffect(() => {
    const checkShaderReady = () => {
      if (shaderContainerRef.current) {
        const canvas = shaderContainerRef.current.querySelector("canvas");
        if (canvas && canvas.width > 0 && canvas.height > 0) {
          setIsLoaded(true);
          return true;
        }
      }
      return false;
    };

    if (checkShaderReady()) return;

    const intervalId = setInterval(() => {
      if (checkShaderReady()) {
        clearInterval(intervalId);
      }
    }, 100);

    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    return () => {
      clearInterval(intervalId);
      clearTimeout(fallbackTimer);
    };
  }, []);

  // Helper to determine current section from scroll position
  const getSectionFromScroll = (scrollLeft: number) => {
    const vw = window.innerWidth;
    if (scrollLeft < vw) return 0; // Home
    if (scrollLeft < vw * 4) return 1; // What is (300vw section)
    if (scrollLeft < vw * 5) return 2; // Features
    if (scrollLeft < vw * 6) return 3; // Pricing
    return 4; // Contact/Footer
  };

  // Convert vertical wheel scroll to horizontal movement with smooth scrolling (desktop only)
  const scrollTargetRef = useRef(0);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    // Skip horizontal scroll handling on mobile - use native vertical scroll
    if (isMobile) return;

    const container = containerRef.current;
    if (!container) return;

    // Initialize scroll target to current position
    scrollTargetRef.current = container.scrollLeft;

    let animationId: number | null = null;

    const smoothScroll = () => {
      const cont = containerRef.current;
      if (!cont) return;

      const current = cont.scrollLeft;
      const target = scrollTargetRef.current;
      const diff = target - current;

      // Smooth lerp factor
      const lerp = 0.1;

      if (Math.abs(diff) > 1) {
        cont.scrollLeft = current + diff * lerp;
        animationId = requestAnimationFrame(smoothScroll);
      } else {
        cont.scrollLeft = target;
        isScrollingRef.current = false;
        animationId = null;
      }

      // Update section indicator
      const newSection = getSectionFromScroll(cont.scrollLeft);
      setCurrentSection(newSection);
    };

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();

        const cont = containerRef.current;
        if (!cont) return;

        // Update scroll target
        scrollTargetRef.current += e.deltaY * 1.2;

        // Clamp to valid scroll range
        const maxScroll = cont.scrollWidth - cont.clientWidth;
        scrollTargetRef.current = Math.max(
          0,
          Math.min(scrollTargetRef.current, maxScroll),
        );

        // Start animation if not running
        if (!isScrollingRef.current) {
          isScrollingRef.current = true;
          animationId = requestAnimationFrame(smoothScroll);
        }
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isMobile]);

  return (
    <main className="relative h-screen w-full overflow-hidden bg-black">
      {/* Grain overlay */}
      <GrainOverlay />

      {/* WebGL Shader Background */}
      <div
        ref={shaderContainerRef}
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${isLoaded ? "opacity-100" : "opacity-0"}`}
        style={{ contain: "strict" }}
      >
        <Shader className="h-full w-full">
          <Swirl
            colorA="#1275d8"
            colorB="#e19136"
            speed={0.3}
            detail={0.7}
            blend={60}
          />
          <ChromaFlow
            baseColor="#0066ff"
            upColor="#0066ff"
            downColor="#d1d1d1"
            leftColor="#e19136"
            rightColor="#e19136"
            intensity={0.6}
            radius={2.5}
            momentum={12}
            maskType="alpha"
            opacity={0.85}
          />
        </Shader>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Nav */}
      <nav
        className={`fixed top-0 right-0 left-0 z-50 ${
          isLoaded ? "opacity-100 transition-opacity duration-700" : "opacity-0"
        } ${mobileMenuOpen ? "bg-black" : ""}`}
      >
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 md:px-10">
          <Link
            href="/"
            className="flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Image src="/logo.png" alt="ForPrompt" width={20} height={20} />
            <span className="font-sans text-[15px] font-medium tracking-tight text-white">
              forprompt
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {["Home", "What is", "Features", "Pricing"].map((item, index) => {
              // Section scroll positions: Hero(100vw), WhatIs(300vw), Features(100vw), Pricing(100vw)
              const getSectionScrollPosition = (idx: number) => {
                const vw = window.innerWidth;
                switch (idx) {
                  case 0:
                    return 0; // Home
                  case 1:
                    return vw; // What is (start of 300vw section)
                  case 2:
                    return vw * 4; // Features (after 300vw section)
                  case 3:
                    return vw * 5; // Pricing
                  default:
                    return 0;
                }
              };

              return (
                <button
                  key={item}
                  onClick={() => {
                    if (containerRef.current) {
                      const targetPosition = getSectionScrollPosition(index);
                      // Update scroll target for wheel handler
                      scrollTargetRef.current = targetPosition;
                      // Use native smooth scroll for nav clicks
                      containerRef.current.scrollTo({
                        left: targetPosition,
                        behavior: "smooth",
                      });
                      setCurrentSection(index);
                    }
                  }}
                  className={`group relative font-sans text-[13px] font-medium transition-colors ${
                    currentSection === index
                      ? "text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {item}
                  <span
                    className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-300 ${
                      currentSection === index
                        ? "w-full"
                        : "w-0 group-hover:w-full"
                    }`}
                  />
                </button>
              );
            })}
            <Link
              href="/docs"
              className="group relative font-sans text-[13px] font-medium text-white/60 transition-colors hover:text-white"
            >
              Docs
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              href="/mcp"
              className="group relative font-sans text-[13px] font-medium text-white/60 transition-colors hover:text-white"
            >
              MCP
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
            <Link
              href="/blog"
              className="group relative font-sans text-[13px] font-medium text-white/60 transition-colors hover:text-white"
            >
              Blog
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SignInButton mode="modal">
              <button className="hidden px-4 py-2 text-[13px] font-medium text-white/70 transition-colors hover:text-white sm:block">
                Sign in
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="rounded-full bg-white px-3 py-2 text-[12px] font-medium text-black transition-colors hover:bg-white/90 sm:px-4 sm:text-[13px]">
                Sign up
              </button>
            </SignInButton>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="ml-1 flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10 md:hidden"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="absolute top-full right-0 left-0 bg-black shadow-2xl md:hidden">
            <div className="space-y-1 px-5 py-5">
              {["Home", "What is", "Features", "Pricing"].map((item, index) => {
                // Section IDs for vertical scrolling on mobile
                const sectionIds = ["hero", "what-is", "features", "pricing"];

                return (
                  <button
                    key={item}
                    onClick={() => {
                      const sectionEl = document.getElementById(
                        sectionIds[index] ?? "",
                      );
                      if (sectionEl) {
                        sectionEl.scrollIntoView({ behavior: "smooth" });
                      }
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full rounded-xl px-4 py-3 text-left text-[15px] font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    {item}
                  </button>
                );
              })}
              <Link
                href="/docs"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-[15px] font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                Docs
              </Link>
              <Link
                href="/mcp"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-[15px] font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                MCP
              </Link>
              <Link
                href="/blog"
                onClick={() => setMobileMenuOpen(false)}
                className="block rounded-xl px-4 py-3 text-[15px] font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
              >
                Blog
              </Link>
              <div className="mt-3 border-t border-white/15 pt-3">
                <SignInButton mode="modal">
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-xl px-4 py-3 text-left text-[15px] font-medium text-white/70 transition-all hover:bg-white/10 hover:text-white"
                  >
                    Sign in
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Scroll Container - Horizontal on desktop, Vertical on mobile */}
      <div
        ref={containerRef}
        className={`relative z-10 transition-opacity duration-700 ${
          isLoaded ? "opacity-100" : "opacity-0"
        } h-screen overflow-x-hidden overflow-y-auto md:overflow-x-auto md:overflow-y-hidden`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex flex-col md:flex-row">
          <HeroSection />
          <WhatIsSection scrollContainerRef={containerRef} />
          <FeaturesSection />
          <PricingSection />
          <FooterSection />
        </div>
      </div>

      <style jsx global>{`
        div::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}

function SignedInContent() {
  const router = useRouter();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const currentUser = useQuery(api.domains.users.queries.getCurrentUser);

  // Get Convex org from Clerk org ID
  const convexOrg = useQuery(
    api.domains.organizations.queries.getByClerkId,
    orgLoaded && organization ? { clerkId: organization.id } : "skip",
  );

  // Query projects using Convex org ID
  const projects = useQuery(
    api.domains.projects.queries.list,
    convexOrg ? { orgId: convexOrg._id } : "skip",
  );

  useEffect(() => {
    if (currentUser && projects !== undefined && orgLoaded) {
      if (currentUser.onboardingCompleted !== true && projects.length === 0) {
        router.push("/setup");
      }
    }
  }, [currentUser, projects, router, orgLoaded]);

  if (currentUser === undefined || projects === undefined || !orgLoaded) {
    return null;
  }

  return <PromptWorkspace />;
}

export default function HomePage() {
  return (
    <>
      <SignedIn>
        <SignedInContent />
      </SignedIn>

      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}
