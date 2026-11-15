import clsx from "clsx";

export function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className={clsx("h-1.5 w-full overflow-hidden rounded-full bg-panel2", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
