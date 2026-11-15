"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell } from "./AppShell";
import { getBackendToken } from "@/lib/backendClient";

const PUBLIC_ROUTES = ["/", "/privacy", "/terms", "/login"];
// Routes that own the full viewport (no AppShell sidebar/top bar), e.g. the editor
const FULLSCREEN_ROUTES = ["/images"];

export function LayoutGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isFullscreen = FULLSCREEN_ROUTES.includes(pathname);

  useEffect(() => {
    if (isPublic) {
      setIsAuthenticated(true);
      return;
    }
    const token = getBackendToken();
    setIsAuthenticated(!!token);
  }, [pathname, isPublic]);

  useEffect(() => {
    if (isAuthenticated === false && !isPublic) {
      router.push("/login");
    }
  }, [isAuthenticated, isPublic, router]);

  if (isPublic || isFullscreen) {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#080A0F]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppShell>{children}</AppShell>;
}
