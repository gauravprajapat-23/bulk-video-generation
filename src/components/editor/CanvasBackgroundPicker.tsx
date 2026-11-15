"use client";

import { useState } from "react";
import { GradientStop } from "@/lib/bulkImageTypes";

import type { CanvasBackground } from "@/lib/bulkImageTypes";
export type { CanvasBackground };

interface CanvasBackgroundPickerProps {
  value: CanvasBackground;
  onChange: (bg: CanvasBackground) => void;
}

function backgroundToCSS(bg: CanvasBackground): string {
  if (bg.type === "solid") {
    return bg.color;
  }

  if (bg.type === "gradient" && bg.gradient) {
    const stopsStr = bg.gradient.stops
      .sort((a, b) => a.offset - b.offset)
      .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
      .join(", ");

    if (bg.gradient.type === "radial") {
      return `radial-gradient(circle, ${stopsStr})`;
    }
    return `linear-gradient(${bg.gradient.angle}deg, ${stopsStr})`;
  }

  return bg.color;
}

const PRESET_GRADIENTS = [
  { type: "linear" as const, stops: [{ offset: 0, color: "#7C5CFC" }, { offset: 1, color: "#FF4F8B" }], angle: 135 },
  { type: "linear" as const, stops: [{ offset: 0, color: "#0F172A" }, { offset: 1, color: "#1E293B" }], angle: 180 },
  { type: "linear" as const, stops: [{ offset: 0, color: "#F0594B" }, { offset: 1, color: "#FFB454" }], angle: 90 },
  { type: "radial" as const, stops: [{ offset: 0, color: "#1A1F2B" }, { offset: 1, color: "#080A0F" }], angle: 0 },
  { type: "linear" as const, stops: [{ offset: 0, color: "#3FB967" }, { offset: 1, color: "#00D4FF" }], angle: 135 },
  { type: "linear" as const, stops: [{ offset: 0, color: "#101827" }, { offset: 1, color: "#0D1117" }], angle: 270 },
];

export function CanvasBackgroundPicker({ value, onChange }: CanvasBackgroundPickerProps) {
  const [tab, setTab] = useState<"solid" | "gradient" | "pattern">(value.type);

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        {(["solid", "gradient", "pattern"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              if (t === "solid") {
                onChange({ ...value, type: "solid" });
              } else if (t === "gradient") {
                onChange({
                  ...value,
                  type: "gradient",
                  gradient: value.gradient || {
                    type: "linear",
                    stops: [{ offset: 0, color: "#101827" }, { offset: 1, color: "#1A1F2B" }],
                    angle: 180,
                  },
                });
              } else {
                onChange({
                  ...value,
                  type: "pattern",
                  pattern: value.pattern || "dots",
                  patternColor: value.patternColor || "#ffffff",
                  patternSize: value.patternSize || 20,
                });
              }
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              tab === t ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "solid" && (
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-muted">Color</label>
          <input
            type="color"
            value={value.color}
            onChange={(e) => onChange({ ...value, color: e.target.value })}
            className="h-10 w-full rounded-lg border border-border"
          />
        </div>
      )}

      {tab === "gradient" && value.gradient && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...value, gradient: { ...value.gradient!, type: "linear" } })}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                value.gradient.type === "linear" ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
              }`}
            >
              Linear
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, gradient: { ...value.gradient!, type: "radial" } })}
              className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                value.gradient.type === "radial" ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
              }`}
            >
              Radial
            </button>
          </div>

          {value.gradient.type === "linear" && (
            <div>
              <label className="mb-1 block text-[10px] font-semibold text-muted">Angle: {value.gradient.angle}°</label>
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={value.gradient.angle}
                onChange={(e) => onChange({ ...value, gradient: { ...value.gradient!, angle: Number(e.target.value) } })}
                className="w-full"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-[10px] font-semibold text-muted">Presets</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_GRADIENTS.map((preset, i) => {
                const css = `linear-gradient(${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.offset * 100}%`).join(", ")})`;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ ...value, gradient: preset })}
                    className="h-10 rounded-lg border border-border transition hover:scale-105 hover:border-accent"
                    style={{ background: css }}
                  />
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted">Color Stops</label>
            {value.gradient.stops.map((stop, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="color"
                  value={stop.color}
                  onChange={(e) => {
                    const newStops = [...value.gradient!.stops];
                    newStops[i] = { ...newStops[i], color: e.target.value };
                    onChange({ ...value, gradient: { ...value.gradient!, stops: newStops } });
                  }}
                  className="h-8 w-8 rounded-lg border border-border"
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={stop.offset}
                  onChange={(e) => {
                    const newStops = [...value.gradient!.stops];
                    newStops[i] = { ...newStops[i], offset: Number(e.target.value) };
                    onChange({ ...value, gradient: { ...value.gradient!, stops: newStops } });
                  }}
                  className="flex-1"
                />
                <span className="w-10 text-center font-mono text-[10px] text-muted">
                  {Math.round(stop.offset * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pattern" && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted">Pattern</label>
            <div className="grid grid-cols-2 gap-2">
              {(["dots", "lines", "diagonal", "grid"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...value, pattern: p })}
                  className={`rounded-lg border px-3 py-3 text-xs font-semibold transition ${
                    value.pattern === p ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted">Pattern Color</label>
            <input
              type="color"
              value={value.patternColor || "#ffffff"}
              onChange={(e) => onChange({ ...value, patternColor: e.target.value })}
              className="h-10 w-full rounded-lg border border-border"
            />
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-semibold text-muted">Pattern Size: {value.patternSize || 20}px</label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={value.patternSize || 20}
              onChange={(e) => onChange({ ...value, patternSize: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        className="h-16 w-full rounded-xl border border-white/10"
        style={{ background: backgroundToCSS(value) }}
      />
    </div>
  );
}

export function generateBackgroundPattern(bg: CanvasBackground): string {
  if (bg.type === "solid") return bg.color;
  if (bg.type === "gradient" && bg.gradient) {
    const stopsStr = bg.gradient.stops
      .sort((a, b) => a.offset - b.offset)
      .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
      .join(", ");
    if (bg.gradient.type === "radial") return `radial-gradient(circle, ${stopsStr})`;
    return `linear-gradient(${bg.gradient.angle}deg, ${stopsStr})`;
  }
  return bg.color;
}

export function generateCanvasBackgroundCSS(bg: CanvasBackground, canvasWidth: number, canvasHeight: number): string {
  if (bg.type === "solid") return bg.color;
  if (bg.type === "gradient" && bg.gradient) {
    return generateBackgroundPattern(bg);
  }
  // Pattern
  const size = bg.patternSize || 20;
  const color = bg.patternColor || "#ffffff";
  const opacity = 0.15;
  const colorWithOpacity = `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;

  if (bg.pattern === "dots") {
    return `radial-gradient(circle, ${colorWithOpacity} 1px, transparent 1px)`;
  }
  if (bg.pattern === "lines") {
    return `repeating-linear-gradient(0deg, transparent, transparent ${size - 1}px, ${colorWithOpacity} ${size - 1}px, ${colorWithOpacity} ${size}px)`;
  }
  if (bg.pattern === "diagonal") {
    return `repeating-linear-gradient(45deg, transparent, transparent ${size - 1}px, ${colorWithOpacity} ${size - 1}px, ${colorWithOpacity} ${size}px)`;
  }
  if (bg.pattern === "grid") {
    return `linear-gradient(${colorWithOpacity} 1px, transparent 1px), linear-gradient(90deg, ${colorWithOpacity} 1px, transparent 1px)`;
  }
  return bg.color;
}
