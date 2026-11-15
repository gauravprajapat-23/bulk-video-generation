"use client";

import clsx from "clsx";
import { Music2, Check } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { AudioWaveformPreview } from "./AudioWaveformPreview";
import { formatDuration } from "@/lib/format";
import { Label } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import type { AudioAssignment } from "@/lib/types";

export function AudioPickerList({
  value,
  onChange,
}: {
  value: AudioAssignment | null;
  onChange: (assignment: AudioAssignment | null) => void;
}) {
  const audio = useAppStore((s) => s.audio);

  if (audio.length === 0) {
    return (
      <EmptyState
        icon={<Music2 size={22} />}
        title="No sounds in your library yet"
        description="Head to the Audio Library to upload an MP3, WAV, or M4A first."
      />
    );
  }

  const selected = audio.find((a) => a.id === value?.audioAssetId) ?? null;

  function selectAudio(audioAssetId: string) {
    if (value?.audioAssetId === audioAssetId) {
      onChange(null);
      return;
    }
    onChange({
      audioAssetId,
      trimStartMs: 0,
      trimEndMs: null,
      loopIfShorter: true,
      cutIfLonger: true,
      volume: 1,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
        {audio.map((a) => {
          const isSelected = value?.audioAssetId === a.id;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => selectAudio(a.id)}
              className={clsx(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                isSelected ? "border-accent bg-accent/10" : "border-border bg-panel2 hover:border-accent/50"
              )}
            >
              <div
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  isSelected ? "border-accent bg-accent text-white" : "border-border text-muted"
                )}
              >
                {isSelected ? <Check size={13} /> : <Music2 size={13} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-text">{a.name}</p>
                <p className="text-[10.5px] text-muted">
                  {formatDuration(a.durationMs)} {a.playlist ? `· ${a.playlist}` : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected && value && (
        <div className="rounded-lg border border-border bg-panel2 p-3 space-y-3">
          <AudioWaveformPreview
            waveform={selected.waveform}
            trimStartMs={value.trimStartMs}
            trimEndMs={value.trimEndMs ?? selected.durationMs}
            totalDurationMs={selected.durationMs}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Trim start (ms)</Label>
              <input
                type="number"
                min={0}
                max={selected.durationMs}
                value={value.trimStartMs}
                onChange={(e) => onChange({ ...value, trimStartMs: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>
            <div>
              <Label>Trim end (ms)</Label>
              <input
                type="number"
                min={0}
                max={selected.durationMs}
                value={value.trimEndMs ?? selected.durationMs}
                onChange={(e) => onChange({ ...value, trimEndMs: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={value.loopIfShorter}
                onChange={(e) => onChange({ ...value, loopIfShorter: e.target.checked })}
              />
              Loop if shorter than video
            </label>
            <label className="flex items-center gap-2 text-xs text-text">
              <input
                type="checkbox"
                checked={value.cutIfLonger}
                onChange={(e) => onChange({ ...value, cutIfLonger: e.target.checked })}
              />
              Auto-cut if longer than video
            </label>
          </div>
          <div>
            <Label>Volume ({Math.round(value.volume * 100)}%)</Label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={value.volume}
              onChange={(e) => onChange({ ...value, volume: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
