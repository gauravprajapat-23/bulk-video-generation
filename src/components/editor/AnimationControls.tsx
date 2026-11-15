"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Play, Trash2 } from "lucide-react";
import clsx from "clsx";
import type {
  ElementAnimation,
  ElementAnimations,
  AnimationType,
  EasingType,
} from "@/lib/bulkImageTypes";
import {
  ANIMATION_TYPE_LABELS,
  EASING_LABELS,
} from "@/lib/bulkImageTypes";
import { ANIMATION_PRESETS, ANIMATION_CATEGORY_LABELS } from "@/lib/animationPresets";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface AnimationControlsProps {
  animation: ElementAnimations | undefined;
  updateAnimation: (animation: ElementAnimations | undefined) => void;
  onPreview?: () => void;
}

function AnimationRow({
  label,
  animation,
  onChange,
  onRemove,
  onPreview,
}: {
  label: string;
  animation: ElementAnimation | undefined;
  onChange: (a: ElementAnimation) => void;
  onRemove: () => void;
  onPreview?: () => void;
}) {
  const value: ElementAnimation = animation || {
    type: "fadeIn",
    durationMs: 500,
    delayMs: 0,
    easing: "ease-out",
  };

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-panel2/50 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted">{label}</span>
        <div className="flex gap-1">
          {onPreview && animation && (
            <button
              type="button"
              onClick={onPreview}
              className="rounded p-0.5 text-muted hover:text-accent"
              title="Preview"
            >
              <Play size={10} />
            </button>
          )}
          {animation && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded p-0.5 text-muted hover:text-bad"
              title="Remove"
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Type</Label>
        <Select
          value={value.type}
          onChange={(e) =>
            onChange({ ...value, type: e.target.value as AnimationType })
          }
        >
          {Object.entries(ANIMATION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px]">Duration (ms)</Label>
          <Input
            type="number"
            min={50}
            max={5000}
            step={50}
            value={value.durationMs}
            onChange={(e) =>
              onChange({
                ...value,
                durationMs: Math.max(50, Math.min(5000, Number(e.target.value) || 500)),
              })
            }
          />
        </div>
        <div>
          <Label className="text-[10px]">Delay (ms)</Label>
          <Input
            type="number"
            min={0}
            max={5000}
            step={50}
            value={value.delayMs}
            onChange={(e) =>
              onChange({
                ...value,
                delayMs: Math.max(0, Math.min(5000, Number(e.target.value) || 0)),
              })
            }
          />
        </div>
      </div>

      <div>
        <Label className="text-[10px]">Easing</Label>
        <Select
          value={value.easing}
          onChange={(e) =>
            onChange({ ...value, easing: e.target.value as EasingType })
          }
        >
          {Object.entries(EASING_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

export function AnimationControls({
  animation,
  updateAnimation,
  onPreview,
}: AnimationControlsProps) {
  const [expanded, setExpanded] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const hasAnimation =
    animation?.entrance?.type !== "none" || animation?.exit?.type !== "none" || animation?.loop?.type !== "none";

  function setEntrance(a: ElementAnimation | undefined) {
    updateAnimation({
      ...animation,
      entrance: a,
    });
  }

  function setExit(a: ElementAnimation | undefined) {
    updateAnimation({
      ...animation,
      exit: a,
    });
  }

  function setLoop(a: ElementAnimation | undefined) {
    updateAnimation({
      ...animation,
      loop: a ? { ...a, loop: true } : undefined,
    });
  }

  function applyPreset(preset: (typeof ANIMATION_PRESETS)[number]) {
    updateAnimation({
      entrance: { ...preset.entrance, delayMs: animation?.entrance?.delayMs || 0 },
      exit: animation?.exit,
    });
    setPresetsOpen(false);
  }

  function clearAll() {
    updateAnimation(undefined);
  }

  return (
    <div className="border-t border-border pt-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-text">Animation</span>
          {hasAnimation && !expanded && (
            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
              Active
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-muted" />
        ) : (
          <ChevronRight size={14} className="text-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setPresetsOpen(!presetsOpen)}
            >
              Presets
            </Button>
            {hasAnimation && (
              <Button variant="ghost" size="sm" onClick={clearAll}>
                Clear
              </Button>
            )}
          </div>

          {presetsOpen && (
            <div className="space-y-2 rounded-lg border border-border bg-panel2/50 p-2.5">
              {Object.entries(ANIMATION_CATEGORY_LABELS).map(
                ([category, catLabel]) => {
                  const presets = ANIMATION_PRESETS.filter(
                    (p) => p.category === category,
                  );
                  if (!presets.length) return null;
                  return (
                    <div key={category}>
                      <span className="mb-1 block text-[10px] font-semibold text-muted/70">
                        {catLabel}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {presets.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className="rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-muted hover:border-accent hover:text-text"
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}

          <AnimationRow
            label="Entrance"
            animation={animation?.entrance}
            onChange={setEntrance}
            onRemove={() => setEntrance(undefined)}
            onPreview={onPreview}
          />

          <AnimationRow
            label="Exit"
            animation={animation?.exit}
            onChange={setExit}
            onRemove={() => setExit(undefined)}
            onPreview={onPreview}
          />

          <AnimationRow
            label="Loop"
            animation={animation?.loop}
            onChange={setLoop}
            onRemove={() => setLoop(undefined)}
            onPreview={onPreview}
          />
        </div>
      )}
    </div>
  );
}
