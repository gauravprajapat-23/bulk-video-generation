"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

export function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-muted transition disabled:cursor-not-allowed disabled:opacity-45",
        active
          ? "border-accent bg-accent text-white"
          : "border-border bg-panel2 hover:border-accent/60 hover:text-text",
      )}
    >
      {children}
    </button>
  );
}

export function ToolbarPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-panel2 px-2 py-0.5 text-[11px] text-muted">
      {children}
    </span>
  );
}
