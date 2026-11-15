import clsx from "clsx";
import { ReactNode } from "react";

type Tone = "ok" | "warn" | "bad" | "neutral" | "accent";

const toneClasses: Record<Tone, string> = {
  ok: "bg-good/15 text-good border-good/30",
  warn: "bg-accent2/15 text-accent2 border-accent2/30",
  bad: "bg-bad/15 text-bad border-bad/30",
  neutral: "bg-panel2 text-muted border-border",
  accent: "bg-accent/15 text-accent border-accent/30",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
