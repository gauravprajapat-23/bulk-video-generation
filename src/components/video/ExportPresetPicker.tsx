"use client";

import clsx from "clsx";
import { EXPORT_PRESET_DIMENSIONS, ExportPreset } from "@/lib/types";
import { Smartphone } from "lucide-react";

const PRESETS: ExportPreset[] = ["youtube_shorts", "instagram_reels", "tiktok", "custom"];

export function ExportPresetPicker({
  value,
  onChange,
  customWidth,
  customHeight,
  onCustomSizeChange,
}: {
  value: ExportPreset;
  onChange: (preset: ExportPreset) => void;
  customWidth: number;
  customHeight: number;
  onCustomSizeChange: (w: number, h: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((preset) => {
          const info = EXPORT_PRESET_DIMENSIONS[preset];
          const active = value === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={clsx(
                "flex flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs font-semibold transition-colors",
                active ? "border-accent bg-accent/10 text-text" : "border-border bg-panel2 text-muted hover:border-accent/50"
              )}
            >
              <Smartphone size={16} className={active ? "text-accent" : "text-muted"} />
              {info.label}
              <span className="text-[10.5px] text-muted font-normal">
                {preset === "custom" ? "Set your own" : `${info.width}×${info.height}`}
              </span>
            </button>
          );
        })}
      </div>

      {value === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Width (px)</label>
            <input
              type="number"
              value={customWidth}
              min={240}
              max={2160}
              onChange={(e) => onCustomSizeChange(Number(e.target.value), customHeight)}
              className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-muted">Height (px)</label>
            <input
              type="number"
              value={customHeight}
              min={240}
              max={3840}
              onChange={(e) => onCustomSizeChange(customWidth, Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm text-text focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
