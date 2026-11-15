"use client";

import { useState } from "react";
import { Film, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { AnimationPreset } from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";

export interface AnimationSettingsFormProps {
  value: AnimationPreset;
  onChange: (patch: Partial<AnimationPreset>) => void;
  /** Show Ken Burns toggle checkbox (default: true) */
  showKenBurnsToggle?: boolean;
  /** Show as collapsible section (default: false) */
  collapsible?: boolean;
  /** Initial collapsed state when collapsible (default: false) */
  defaultCollapsed?: boolean;
  /** Compact mode with smaller inputs (default: false) */
  compact?: boolean;
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (!collapsible) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-text">{title}</span>
        </div>
        {children}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-panel2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-bold text-text">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted" /> : <ChevronDown size={14} className="text-muted" />}
      </button>
      {open && <div className="border-t border-border px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

export function AnimationSettingsForm({
  value,
  onChange,
  showKenBurnsToggle = true,
  collapsible = false,
  defaultCollapsed = false,
  compact = false,
}: AnimationSettingsFormProps) {
  function update<K extends keyof AnimationPreset>(key: K, v: AnimationPreset[K]) {
    onChange({ [key]: v });
  }

  const gridClass = compact ? "grid grid-cols-2 gap-3" : "grid grid-cols-2 gap-4";
  const selectClass = compact
    ? "w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
    : "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent";

  return (
    <div className={collapsible ? "" : "space-y-4"}>
      {/* Ken Burns */}
      <Section
        title="Ken Burns Effect"
        icon={<Film size={14} className="text-accent" />}
        defaultOpen={showKenBurnsToggle ? value.kenBurns : !defaultCollapsed}
        collapsible={collapsible}
      >
        {showKenBurnsToggle && (
          <label className="flex items-center gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={value.kenBurns}
              onChange={(e) => update("kenBurns", e.target.checked)}
              className="rounded"
            />
            Enable Ken Burns (subtle zoom/pan)
          </label>
        )}
        {(!showKenBurnsToggle || value.kenBurns) && (
          <>
            <div className={gridClass}>
              <div>
                <Label>Direction</Label>
                <select
                  value={value.kenBurnsDirection}
                  onChange={(e) => update("kenBurnsDirection", e.target.value as AnimationPreset["kenBurnsDirection"])}
                  className={selectClass}
                >
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="pan-left">Pan Left</option>
                  <option value="pan-right">Pan Right</option>
                </select>
              </div>
              <div>
                <Label>Intensity ({(value.kenBurnsIntensity * 100).toFixed(0)}%)</Label>
                {compact ? (
                  <Input
                    type="number"
                    min={0}
                    max={0.2}
                    step={0.01}
                    value={value.kenBurnsIntensity}
                    onChange={(e) =>
                      update("kenBurnsIntensity", Math.max(0, Math.min(0.2, Number(e.target.value) || 0.05)))
                    }
                  />
                ) : (
                  <input
                    type="range"
                    min={0.01}
                    max={0.2}
                    step={0.01}
                    value={value.kenBurnsIntensity}
                    onChange={(e) => update("kenBurnsIntensity", Number(e.target.value))}
                    className="w-full"
                  />
                )}
                <p className="text-[10px] text-muted mt-1">Recommended: 3-8%. Higher values may cause motion sickness.</p>
              </div>
            </div>
          </>
        )}
      </Section>

      {/* Background Effects */}
      <Section
        title="Background Effects"
        icon={<Sparkles size={14} className="text-accent" />}
        defaultOpen={value.backgroundEffect !== "none" && !defaultCollapsed}
        collapsible={collapsible}
      >
        <div className={gridClass}>
          <div>
            <Label>Effect</Label>
            <select
              value={value.backgroundEffect}
              onChange={(e) => update("backgroundEffect", e.target.value as AnimationPreset["backgroundEffect"])}
              className={selectClass}
            >
              <option value="none">None</option>
              <option value="particles">Floating Particles</option>
              <option value="light-leak">Light Leak</option>
              <option value="bokeh">Bokeh</option>
            </select>
          </div>
          {value.backgroundEffect !== "none" && (
            <div>
              <Label>Opacity ({Math.round(value.backgroundOpacity * 100)}%)</Label>
              {compact ? (
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={value.backgroundOpacity}
                  onChange={(e) =>
                    update("backgroundOpacity", Math.max(0, Math.min(1, Number(e.target.value) || 0.15)))
                  }
                />
              ) : (
                <input
                  type="range"
                  min={0.05}
                  max={0.5}
                  step={0.05}
                  value={value.backgroundOpacity}
                  onChange={(e) => update("backgroundOpacity", Number(e.target.value))}
                  className="w-full"
                />
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Ending */}
      <Section
        title="Ending Effect"
        icon={<Film size={14} className="text-accent" />}
        defaultOpen={!defaultCollapsed}
        collapsible={collapsible}
      >
        <div className={gridClass}>
          <div>
            <Label>Type</Label>
            <select
              value={value.endingType}
              onChange={(e) => update("endingType", e.target.value as AnimationPreset["endingType"])}
              className={selectClass}
            >
              <option value="none">None</option>
              <option value="fade-to-black">Fade to Black</option>
              <option value="fade-to-white">Fade to White</option>
              <option value="cta-overlay">CTA Overlay</option>
            </select>
          </div>
          {value.endingType !== "none" && (
            <div>
              <Label>Duration ({value.endingDuration}ms)</Label>
              {compact ? (
                <Input
                  type="number"
                  min={200}
                  max={3000}
                  step={100}
                  value={value.endingDuration}
                  onChange={(e) => update("endingDuration", Math.max(200, Number(e.target.value) || 800))}
                />
              ) : (
                <input
                  type="range"
                  min={300}
                  max={2000}
                  step={100}
                  value={value.endingDuration}
                  onChange={(e) => update("endingDuration", Number(e.target.value))}
                  className="w-full"
                />
              )}
            </div>
          )}
        </div>
        {value.endingType === "cta-overlay" && (
          <div>
            <Label>CTA Text</Label>
            <input
              type="text"
              value={value.endingText ?? ""}
              onChange={(e) => update("endingText", e.target.value)}
              placeholder="Follow for more"
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent"
            />
          </div>
        )}
      </Section>
    </div>
  );
}
