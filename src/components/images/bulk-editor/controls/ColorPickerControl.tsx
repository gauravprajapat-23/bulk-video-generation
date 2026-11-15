"use client";

interface ColorPickerControlProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  variant?: "dot" | "labeled" | "input";
  className?: string;
}

export function ColorPickerControl({
  value,
  onChange,
  label,
  variant = "labeled",
  className = "",
}: ColorPickerControlProps) {
  const inputId = `color-${label?.replace(/\s+/g, "-").toLowerCase() || Math.random().toString(36).slice(2)}`;

  if (variant === "dot") {
    return (
      <label
        className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-border bg-panel2 text-muted hover:text-text ${className}`}
        title={label || "Color"}
      >
        <span className="sr-only">{label || "Color"}</span>
        <span
          className="h-4 w-4 rounded-full border border-white/50"
          style={{ backgroundColor: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </label>
    );
  }

  if (variant === "input") {
    return (
      <div className={className}>
        {label && (
          <label className="mb-1 block text-[10px] font-medium text-muted">
            {label}
          </label>
        )}
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-full cursor-pointer rounded-lg border border-border bg-panel2 focus:ring-2 focus:ring-accent/30 focus:outline-none"
        />
      </div>
    );
  }

  // variant === "labeled"
  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-[10px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-panel2"
        >
          <span
            className="h-4 w-4 rounded-full border border-white/50"
            style={{ backgroundColor: value }}
          />
        </label>
        <input
          id={inputId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 flex-1 cursor-pointer rounded-lg border border-border bg-panel2 focus:ring-2 focus:ring-accent/30 focus:outline-none"
        />
      </div>
    </div>
  );
}
