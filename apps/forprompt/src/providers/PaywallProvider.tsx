"use client";

/**
 * Paywall Provider
 * Global context for managing paywall modal state across the app
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { PaywallModal } from "~/app/features/organization/components/PaywallModal";

interface PaywallContextType {
  openPaywall: (options?: PaywallOptions) => void;
  closePaywall: () => void;
  isOpen: boolean;
}

interface PaywallOptions {
  highlightTier?: "pro" | "enterprise";
  reason?: string;
  onSuccess?: () => void;
}

const PaywallContext = createContext<PaywallContextType | null>(null);

export function PaywallProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<PaywallOptions>({});

  const openPaywall = useCallback((opts?: PaywallOptions) => {
    setOptions(opts || {});
    setIsOpen(true);
  }, []);

  const closePaywall = useCallback(() => {
    setIsOpen(false);
    setOptions({});
  }, []);

  const handleSuccess = useCallback(() => {
    options.onSuccess?.();
    closePaywall();
  }, [options, closePaywall]);

  return (
    <PaywallContext.Provider value={{ openPaywall, closePaywall, isOpen }}>
      {children}
      <PaywallModal
        isOpen={isOpen}
        onClose={closePaywall}
        onSuccess={handleSuccess}
        highlightTier={options.highlightTier}
        reason={options.reason}
      />
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const context = useContext(PaywallContext);
  if (!context) {
    throw new Error("usePaywall must be used within a PaywallProvider");
  }
  return context;
}
