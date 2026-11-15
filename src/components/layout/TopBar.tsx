"use client";

import { usePathname } from "next/navigation";
import { Menu, Server, ServerCrash, PanelLeftClose, PanelLeftOpen } from "lucide-react";

const TITLES: Record<string, string> = {
  "/dashboard": "Video Dashboard",
  "/create": "Create Video",
  "/images": "Bulk Image Generator",
  "/bulk": "Bulk Video Generator",
  "/audio": "Audio Library",
  "/queue": "Render Queue",
  "/youtube": "YouTube Connection",
  "/scheduler": "Upload Scheduler",
};

function titleFor(pathname: string): string {
  const exact = TITLES[pathname];
  if (exact) return exact;
  const base = "/" + pathname.split("/")[1];
  return TITLES[base] ?? "Video Maker";
}

interface TopBarProps {
  onMenuClick: () => void;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
}

export function TopBar({ onMenuClick, onToggleCollapse, collapsed }: TopBarProps) {
  const pathname = usePathname() ?? "/dashboard";

  return (
    <header className="flex items-center gap-3 border-b border-border bg-panel px-4 py-3.5 lg:px-6">
      {/* Mobile hamburger */}
      <button onClick={onMenuClick} className="text-muted hover:text-text lg:hidden">
        <Menu size={20} />
      </button>

      {/* Desktop collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex text-muted hover:text-text transition-colors"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      <h1 className="font-sora text-base font-bold text-text">{titleFor(pathname)}</h1>
    
    </header>
  );
}
