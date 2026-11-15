"use client";

import { Minus, Plus } from "lucide-react";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label,
  compact = false,
  className = "",
}: NumberStepperProps) {
  const handleChange = (newValue: number) => {
    onChange(Math.min(max, Math.max(min, newValue)));
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <button
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-panel2 text-muted hover:text-text disabled:opacity-30"
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="h-7 w-14 rounded-lg border border-border bg-panel2 px-1 text-center text-xs font-semibold text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-panel2 text-muted hover:text-text disabled:opacity-30"
        >
          <Plus size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="mb-1 block text-[10px] font-medium text-muted">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleChange(value - step)}
          disabled={value <= min}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-panel2 text-muted hover:text-text disabled:opacity-30"
        >
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="h-8 flex-1 rounded-lg border border-border bg-panel2 px-2 text-center text-xs font-semibold text-text outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          onClick={() => handleChange(value + step)}
          disabled={value >= max}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-panel2 text-muted hover:text-text disabled:opacity-30"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}
