"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SignInButton } from "@clerk/nextjs";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#0a0a0c]/95 border-b border-neutral-800/80 backdrop-blur-xl"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-neutral-200 hover:text-white transition-colors">
          <Image
            src="/logo.png"
            alt="ForPrompt"
            width={24}
            height={24}
            className="invert-0"
          />
          forprompt
        </Link>

        {/* Nav Links - Center */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink href="#features">Features</NavLink>
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="#pricing">Pricing</NavLink>
        </div>

        {/* Sign In */}
        <div className="flex items-center gap-4">
          <SignInButton mode="modal">
            <button className="px-4 py-1.5 text-sm font-medium bg-white text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors">
              Sign in
            </button>
          </SignInButton>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-md hover:bg-neutral-800/50 transition-colors text-neutral-400"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-800/50 bg-[#0a0a0c]/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-3">
            <MobileNavLink href="#features" onClick={() => setMobileMenuOpen(false)}>
              Features
            </MobileNavLink>
            <MobileNavLink href="/docs" onClick={() => setMobileMenuOpen(false)}>
              Docs
            </MobileNavLink>
            <MobileNavLink href="#pricing" onClick={() => setMobileMenuOpen(false)}>
              Pricing
            </MobileNavLink>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http");
  const Component = isExternal ? "a" : Link;

  return (
    <Component
      href={href}
      className="text-sm text-neutral-400 hover:text-neutral-100 transition-colors"
    >
      {children}
    </Component>
  );
}

function MobileNavLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block text-sm text-neutral-300 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
