"use client";

import { useAppStore } from "@/store/useAppStore";

/** Avoids rendering stale/empty state before the persisted store has loaded from localStorage. */
export function useHasHydrated(): boolean {
  return useAppStore((s) => s.hasHydrated);
}
