"use client";

import { useCallback } from "react";

export function updateURLParams(params: Record<string, string | null>) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null) {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, "", url.toString());
}

export function useURLParamsUpdater() {
  return useCallback((params: Record<string, string | null>) => {
    updateURLParams(params);
  }, []);
}
