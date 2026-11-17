"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getBackendToken } from "@/lib/backendClient";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Clapperboard,
  Images,
  Layers,
  Music2,
  ListVideo,
  Youtube,
  CalendarClock,
  Film,
  Bot,
  Trophy,
  Server,
  ServerCrash,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create Video", icon: Clapperboard },
  { href: "/templates", label: "Video Templates", icon: Trophy },
  { href: "/images", label: "Bulk Images", icon: Images },
  { href: "/bulk", label: "Bulk Videos", icon: Layers },
  { href: "/audio", label: "Audio Library", icon: Music2 },
  { href: "/queue", label: "Render Queue", icon: ListVideo },
  { href: "/youtube", label: "YouTube Connection", icon: Youtube },
  { href: "/scheduler", label: "Upload Scheduler", icon: CalendarClock },
  { href: "/autopilot", label: "Autopilot", icon: Bot },
];

interface SidebarProps {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ onNavigate, collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const backend = useAppStore((s) => s.backend);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    setSignedIn(Boolean(getBackendToken()));
  }, [pathname, backend.connected]);

  return (
    <aside
      className={clsx(
        "flex h-full flex-col border-r border-border bg-panel transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Header */}
      <div
        className={clsx(
          "flex items-center border-b border-border transition-all duration-300",
          collapsed ? "justify-center px-2 py-4" : "gap-2.5 px-5 py-5"
        )}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2.5" title="Video Maker — Home">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent2">
            <Film size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="font-sora text-sm font-bold leading-none text-text whitespace-nowrap">Video Maker</p>
              <p className="text-[10.5px] text-muted leading-none mt-0.5 whitespace-nowrap">Shorts Studio</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "group relative flex items-center rounded-lg font-medium transition-colors",
                collapsed
                  ? "justify-center px-0 py-2.5"
                  : "gap-3 px-3 py-2.5 text-sm",
                active ? "bg-accent text-white" : "text-muted hover:bg-panel2 hover:text-text"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-md bg-panel2 px-2.5 py-1.5 text-xs font-medium text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100 border border-border">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={clsx(
          "border-t border-border transition-all duration-300",
          collapsed ? "px-2 py-3" : "px-4 py-4"
        )}
      >
      

        {!collapsed && (
          <div className="mb-3 rounded-lg border border-border bg-panel2 px-3 py-2.5">
            {signedIn ? (
              <p className="text-xs font-medium text-text">Signed in</p>
            ) : (
              <>
                <p className="text-xs font-semibold text-text">Guest mode</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  Create and download videos without signing in. Files stay in this browser.
                </p>
                <Link
                  href="/login"
                  onClick={onNavigate}
                  className="mt-2 inline-block text-xs font-semibold text-accent hover:underline"
                >
                  Sign in with Google (optional)
                </Link>
              </>
            )}
          </div>
        )}

        {/* Legal links */}
        <div
          className={clsx(
            "flex gap-3 border-t border-border mt-2 pt-2",
            collapsed ? "justify-center" : ""
          )}
        >
          <Link href="/privacy" className="text-[10.5px] text-muted hover:text-text transition-colors" title={collapsed ? "Privacy Policy" : undefined}>
            {collapsed ? "P" : "Privacy"}
          </Link>
          <Link href="/terms" className="text-[10.5px] text-muted hover:text-text transition-colors" title={collapsed ? "Terms of Service" : undefined}>
            {collapsed ? "T" : "Terms"}
          </Link>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={onToggleCollapse}
          className={clsx(
            "mt-3 flex w-full items-center rounded-lg text-muted hover:bg-panel2 hover:text-text transition-colors",
            collapsed ? "justify-center px-0 py-2" : "gap-2 px-3 py-2 text-[11px] font-medium"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} />
          ) : (
            <>
              <PanelLeftClose size={16} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
