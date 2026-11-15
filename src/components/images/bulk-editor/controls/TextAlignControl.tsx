"use client";

import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

type AlignValue = "left" | "center" | "right";

interface TextAlignControlProps {
  value: AlignValue;
  onChange: (align: AlignValue) => void;
  variant?: "toolbar" | "panel";
  className?: string;
}

export function TextAlignControl({
  value,
  onChange,
  variant = "toolbar",
  className = "",
}: TextAlignControlProps) {
  const options: { align: AlignValue; icon: typeof AlignLeft; label: string }[] = [
    { align: "left", icon: AlignLeft, label: "Align left" },
    { align: "center", icon: AlignCenter, label: "Align center" },
    { align: "right", icon: AlignRight, label: "Align right" },
  ];

  if (variant === "toolbar") {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        {options.map(({ align, icon: Icon, label }) => (
          <button
            key={align}
            onClick={() => onChange(align)}
            title={label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text ${
              value === align
                ? "bg-accent/15 text-accent"
                : "hover:bg-panel2"
            }`}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    );
  }

  // variant === "panel"
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {options.map(({ align, icon: Icon, label }) => (
        <button
          key={align}
          onClick={() => onChange(align)}
          title={label}
          className={`flex h-8 flex-1 items-center justify-center rounded-lg border border-border ${
            value === align
              ? "border-accent bg-accent/15 text-accent"
              : "bg-panel2 text-muted hover:text-text"
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
