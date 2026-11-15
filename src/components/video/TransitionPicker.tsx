"use client";

import clsx from "clsx";
import { TRANSITION_LABELS, TransitionType } from "@/lib/types";

const OPTIONS: TransitionType[] = ["fade", "slide", "zoom_in", "zoom_out", "ken_burns", "none"];

export function TransitionPicker({
  value,
  onChange,
  size = "md",
}: {
  value: TransitionType;
  onChange: (t: TransitionType) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={clsx(
            "rounded-md border font-semibold transition-colors",
            size === "sm" ? "px-2 py-1 text-[10.5px]" : "px-3 py-1.5 text-xs",
            value === opt ? "border-accent bg-accent/15 text-text" : "border-border bg-panel2 text-muted hover:border-accent/50"
          )}
        >
          {TRANSITION_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}
