"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "./AppShell";

/**
 * Local creation is open to guests. Authentication is checked by protected
 * server endpoints for account-specific actions such as scheduled publishing.
 */
const STANDALONE_ROUTES = new Set(["/", "/privacy", "/terms", "/login", "/images"]);

export function LayoutGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (STANDALONE_ROUTES.has(pathname)) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
