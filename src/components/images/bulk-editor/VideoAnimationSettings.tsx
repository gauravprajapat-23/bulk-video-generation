"use client";

import { useState, useEffect } from "react";
import { Music2, Film, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";
import { AudioPickerList } from "@/components/audio/AudioPickerList";
import type { AnimationPreset, AudioAssignment } from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";

interface VideoAnimationSettingsProps {
  open: boolean;
  onClose: () => void;
  onApply: (preset: AnimationPreset, audio: AudioAssignment | null) => void;
  initialPreset?: AnimationPreset;
  initialAudio?: AudioAssignment | null;
}

function Section({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
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

export function VideoAnimationSettings({
  open,
  onClose,
  onApply,
  initialPreset = DEFAULT_ANIMATION_PRESET,
  initialAudio = null,
}: VideoAnimationSettingsProps) {
  const [preset, setPreset] = useState<AnimationPreset>({ ...initialPreset });
  const [audio, setAudio] = useState<AudioAssignment | null>(initialAudio);

  // Sync state with props when modal opens
  useEffect(() => {
    if (open) {
      setPreset({ ...initialPreset });
      setAudio(initialAudio);
    }
  }, [open, initialPreset, initialAudio]);

  function update<K extends keyof AnimationPreset>(key: K, value: AnimationPreset[K]) {
    setPreset((prev) => ({ ...prev, [key]: value }));
  }

  function handleApply() {
    onApply(preset, audio);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Video Settings" size="lg">
      <div className="space-y-4">
        {/* Ken Burns */}
        <Section
          title="Ken Burns Effect"
          icon={<Film size={14} className="text-accent" />}
          defaultOpen={preset.kenBurns}
        >
          <label className="flex items-center gap-2 text-xs text-text">
            <input
              type="checkbox"
              checked={preset.kenBurns}
              onChange={(e) => update("kenBurns", e.target.checked)}
            />
            Enable Ken Burns (subtle zoom/pan)
          </label>
          {preset.kenBurns && (
            <>
              <div>
                <Label>Direction</Label>
                <select
                  value={preset.kenBurnsDirection}
                  onChange={(e) => update("kenBurnsDirection", e.target.value as AnimationPreset["kenBurnsDirection"])}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent"
                >
                  <option value="zoom-in">Zoom In</option>
                  <option value="zoom-out">Zoom Out</option>
                  <option value="pan-left">Pan Left</option>
                  <option value="pan-right">Pan Right</option>
                </select>
              </div>
              <div>
                <Label>Intensity ({(preset.kenBurnsIntensity * 100).toFixed(0)}%)</Label>
                <input
                  type="range"
                  min={0.01}
                  max={0.2}
                  step={0.01}
                  value={preset.kenBurnsIntensity}
                  onChange={(e) => update("kenBurnsIntensity", Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[10px] text-muted mt-1">Recommended: 3-8%. Higher values may cause motion sickness.</p>
              </div>
            </>
          )}
        </Section>

        {/* Background Effects */}
        <Section
          title="Background Effects"
          icon={<Sparkles size={14} className="text-accent" />}
          defaultOpen={preset.backgroundEffect !== "none"}
        >
          <div>
            <Label>Effect</Label>
            <select
              value={preset.backgroundEffect}
              onChange={(e) => update("backgroundEffect", e.target.value as AnimationPreset["backgroundEffect"])}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent"
            >
              <option value="none">None</option>
              <option value="particles">Floating Particles</option>
              <option value="light-leak">Light Leak</option>
              <option value="bokeh">Bokeh</option>
            </select>
          </div>
          {preset.backgroundEffect !== "none" && (
            <div>
              <Label>Opacity ({Math.round(preset.backgroundOpacity * 100)}%)</Label>
              <input
                type="range"
                min={0.05}
                max={0.5}
                step={0.05}
                value={preset.backgroundOpacity}
                onChange={(e) => update("backgroundOpacity", Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </Section>

        {/* Ending */}
        <Section
          title="Ending Effect"
          icon={<Film size={14} className="text-accent" />}
        >
          <div>
            <Label>Type</Label>
            <select
              value={preset.endingType}
              onChange={(e) => update("endingType", e.target.value as AnimationPreset["endingType"])}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent"
            >
              <option value="none">None</option>
              <option value="fade-to-black">Fade to Black</option>
              <option value="fade-to-white">Fade to White</option>
              <option value="cta-overlay">CTA Overlay</option>
            </select>
          </div>
          {preset.endingType !== "none" && (
            <div>
              <Label>Duration ({preset.endingDuration}ms)</Label>
              <input
                type="range"
                min={300}
                max={2000}
                step={100}
                value={preset.endingDuration}
                onChange={(e) => update("endingDuration", Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
          {preset.endingType === "cta-overlay" && (
            <div>
              <Label>CTA Text</Label>
              <input
                type="text"
                value={preset.endingText ?? ""}
                onChange={(e) => update("endingText", e.target.value)}
                placeholder="Follow for more"
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent"
              />
            </div>
          )}
        </Section>

        {/* Music */}
        <Section
          title="Background Music"
          icon={<Music2 size={14} className="text-accent" />}
          defaultOpen={!!audio}
        >
          <AudioPickerList value={audio} onChange={setAudio} />
        </Section>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleApply}>Apply Settings</Button>
      </div>
    </Modal>
  );
}
