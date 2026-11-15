"use client";

import { Input, Label } from "@/components/ui/Input";

interface BorderRadiusInputProps {
  value: number;
  onChange: (radius: number) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function BorderRadiusInput({
  value,
  onChange,
  label = "Radius",
  compact = false,
  className = "",
}: BorderRadiusInputProps) {
  const handleChange = (newValue: number) => {
    onChange(Math.max(0, newValue));
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="h-9 w-20 rounded-xl border border-border bg-panel2 px-2 text-xs text-text outline-none focus:border-accent"
          aria-label={label}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <Label>{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => handleChange(Number(e.target.value))}
      />
    </div>
  );
}
