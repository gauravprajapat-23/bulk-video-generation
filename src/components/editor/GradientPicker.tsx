"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ElementGradient, GradientStop } from "@/lib/bulkImageTypes";

interface GradientPickerProps {
  value: ElementGradient | undefined;
  onChange: (gradient: ElementGradient | undefined) => void;
}

const PRESET_GRADIENTS: ElementGradient[] = [
  {
    type: "linear",
    stops: [
      { offset: 0, color: "#7C5CFC" },
      { offset: 1, color: "#FFB454" },
    ],
    angle: 135,
  },
  {
    type: "linear",
    stops: [
      { offset: 0, color: "#FF4F8B" },
      { offset: 1, color: "#FF9A5C" },
    ],
    angle: 90,
  },
  {
    type: "linear",
    stops: [
      { offset: 0, color: "#3FB967" },
      { offset: 1, color: "#00D4FF" },
    ],
    angle: 180,
  },
  {
    type: "linear",
    stops: [
      { offset: 0, color: "#F0594B" },
      { offset: 1, color: "#FFB454" },
    ],
    angle: 45,
  },
  {
    type: "radial",
    stops: [
      { offset: 0, color: "#7C5CFC" },
      { offset: 1, color: "#FF4F8B" },
    ],
    angle: 0,
  },
  {
    type: "linear",
    stops: [
      { offset: 0, color: "#000000" },
      { offset: 1, color: "#333333" },
    ],
    angle: 180,
  },
];

function gradientToCSS(gradient: ElementGradient): string {
  const stopsStr = gradient.stops
    .sort((a, b) => a.offset - b.offset)
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(", ");

  if (gradient.type === "radial") {
    return `radial-gradient(circle, ${stopsStr})`;
  }
  return `linear-gradient(${gradient.angle}deg, ${stopsStr})`;
}

export function GradientPicker({ value, onChange }: GradientPickerProps) {
  const [customStops, setCustomStops] = useState<GradientStop[]>(
    value?.stops || [
      { offset: 0, color: "#7C5CFC" },
      { offset: 1, color: "#FFB454" },
    ]
  );
  const [angle, setAngle] = useState(value?.angle || 135);
  const [type, setType] = useState<"linear" | "radial">(value?.type || "linear");

  function applyPreset(preset: ElementGradient) {
    setType(preset.type);
    setCustomStops(preset.stops);
    setAngle(preset.angle);
    onChange(preset);
  }

  function updateStops(stops: GradientStop[]) {
    setCustomStops(stops);
    onChange({ type, stops, angle });
  }

  function addStop() {
    const newStop: GradientStop = {
      offset: 0.5,
      color: "#FFFFFF",
    };
    const newStops = [...customStops, newStop].sort((a, b) => a.offset - b.offset);
    updateStops(newStops);
  }

  function removeStop(index: number) {
    if (customStops.length <= 2) return;
    const newStops = customStops.filter((_, i) => i !== index);
    updateStops(newStops);
  }

  function updateStop(index: number, patch: Partial<GradientStop>) {
    const newStops = customStops.map((s, i) => (i === index ? { ...s, ...patch } : s));
    updateStops(newStops);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setType("linear");
            onChange({ type: "linear", stops: customStops, angle });
          }}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            type === "linear" ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
          }`}
        >
          Linear
        </button>
        <button
          type="button"
          onClick={() => {
            setType("radial");
            onChange({ type: "radial", stops: customStops, angle });
          }}
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
            type === "radial" ? "border-accent bg-accent/15 text-accent" : "border-border bg-panel2 text-muted"
          }`}
        >
          Radial
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
          >
            Remove
          </button>
        )}
      </div>

      {type === "linear" && (
        <div>
          <label className="mb-1 block text-[10px] font-semibold text-muted">Angle: {angle}°</label>
          <input
            type="range"
            min={0}
            max={360}
            step={15}
            value={angle}
            onChange={(e) => {
              const newAngle = Number(e.target.value);
              setAngle(newAngle);
              onChange({ type, stops: customStops, angle: newAngle });
            }}
            className="w-full"
          />
        </div>
      )}

      <div>
        <label className="mb-2 block text-[10px] font-semibold text-muted">Presets</label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_GRADIENTS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => applyPreset(preset)}
              className="h-10 rounded-lg border border-border transition hover:scale-105 hover:border-accent"
              style={{ background: gradientToCSS(preset) }}
              title={gradientToCSS(preset)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[10px] font-semibold text-muted">Color Stops</label>
          <button
            type="button"
            onClick={addStop}
            className="flex items-center gap-1 rounded-lg border border-border bg-panel2 px-2 py-1 text-[10px] text-muted transition hover:border-accent hover:text-text"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {customStops.map((stop, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="color"
                value={stop.color}
                onChange={(e) => updateStop(i, { color: e.target.value })}
                className="h-8 w-8 rounded-lg border border-border"
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={stop.offset}
                onChange={(e) => updateStop(i, { offset: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="w-10 text-center font-mono text-[10px] text-muted">
                {Math.round(stop.offset * 100)}%
              </span>
              {customStops.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeStop(i)}
                  className="rounded-lg p-1 text-muted transition hover:bg-red-500/15 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {value && (
        <div
          className="h-16 w-full rounded-xl border border-white/10"
          style={{ background: gradientToCSS(value) }}
        />
      )}
    </div>
  );
}

export { gradientToCSS };
