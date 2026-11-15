"use client";

import { FlipHorizontal, FlipVertical, ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/Input";

type FitValue = "cover" | "contain";

interface ImageFitControlProps {
  value: FitValue;
  onChange: (fit: FitValue) => void;
  variant?: "toggle" | "select";
  className?: string;
}

export function ImageFitControl({
  value,
  onChange,
  variant = "toggle",
  className = "",
}: ImageFitControlProps) {
  if (variant === "toggle") {
    return (
      <button
        onClick={() => onChange(value === "cover" ? "contain" : "cover")}
        title={`Fit: ${value}`}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text ${
          value === "contain" ? "bg-accent/15 text-accent" : ""
        } ${className}`}
      >
        <ImageIcon size={14} />
      </button>
    );
  }

  // variant === "select"
  return (
    <div className={className}>
      <Label>Fit</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FitValue)}
        className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:border-accent focus:outline-none"
      >
        <option value="cover">Cover</option>
        <option value="contain">Contain</option>
      </select>
    </div>
  );
}

interface ImageFlipControlsProps {
  flipH: boolean;
  flipV: boolean;
  onFlipH: () => void;
  onFlipV: () => void;
  variant?: "toolbar" | "panel";
  className?: string;
}

export function ImageFlipControls({
  flipH,
  flipV,
  onFlipH,
  onFlipV,
  variant = "toolbar",
  className = "",
}: ImageFlipControlsProps) {
  if (variant === "toolbar") {
    return (
      <div className={`flex items-center gap-0.5 ${className}`}>
        <button
          onClick={onFlipH}
          title="Flip horizontal"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text ${
            flipH ? "bg-accent/15 text-accent" : ""
          }`}
        >
          <FlipHorizontal size={14} />
        </button>
        <button
          onClick={onFlipV}
          title="Flip vertical"
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-text ${
            flipV ? "bg-accent/15 text-accent" : ""
          }`}
        >
          <FlipVertical size={14} />
        </button>
      </div>
    );
  }

  // variant === "panel"
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={onFlipH}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
          flipH ? "bg-secondary text-text" : "bg-ghost text-muted hover:text-text"
        }`}
      >
        <FlipHorizontal size={14} /> Flip H
      </button>
      <button
        onClick={onFlipV}
        className={`flex items-center gap-1 rounded-lg px-2 py-1 text-xs ${
          flipV ? "bg-secondary text-text" : "bg-ghost text-muted hover:text-text"
        }`}
      >
        <FlipVertical size={14} /> Flip V
      </button>
    </div>
  );
}
