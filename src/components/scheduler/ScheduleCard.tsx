"use client";

import { CalendarClock, CalendarDays, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { SCHEDULE_PRESETS } from "@/lib/bulkSeo";

interface ScheduleCardProps {
  scheduleMode: boolean;
  onScheduleModeChange: (checked: boolean) => void;
  selectedPreset: string;
  onSelectedPresetChange: (label: string) => void;
  baseScheduledAt: string;
  onBaseScheduledAtChange: (value: string) => void;
  scheduleIntervalMinutes: number;
  onScheduleIntervalMinutesChange: (value: number) => void;
  customDailyTimes: string;
  onCustomDailyTimesChange: (value: string) => void;
  onGenerateSchedule: () => void;
  schedulePreview: string[];
}

export function ScheduleCard({
  scheduleMode,
  onScheduleModeChange,
  selectedPreset,
  onSelectedPresetChange,
  baseScheduledAt,
  onBaseScheduledAtChange,
  scheduleIntervalMinutes,
  onScheduleIntervalMinutesChange,
  customDailyTimes,
  onCustomDailyTimesChange,
  onGenerateSchedule,
  schedulePreview,
}: ScheduleCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-1">
        <CalendarDays size={16} className="text-accent" />
        <CardTitle>4. Schedule (optional)</CardTitle>
      </div>
      <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-text">
        <input type="checkbox" checked={scheduleMode} onChange={(e) => onScheduleModeChange(e.target.checked)} />
        Give each video a different publish time
      </label>

      {scheduleMode && (
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Upload pace</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SCHEDULE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => onSelectedPresetChange(preset.label)}
                  className={`rounded-lg border px-3 py-2 text-center transition-colors ${
                    selectedPreset === preset.label ? "border-accent bg-accent/15 text-text" : "border-border bg-bg text-muted hover:border-accent/50"
                  }`}
                >
                  <p className="text-xs font-semibold">{preset.label}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
            <div>
              <Label>First publish time</Label>
              <Input type="datetime-local" value={baseScheduledAt} onChange={(e) => onBaseScheduledAtChange(e.target.value)} />
            </div>
            {selectedPreset === "Custom interval" && (
              <div>
                <Label>Gap (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  value={scheduleIntervalMinutes}
                  onChange={(e) => onScheduleIntervalMinutesChange(Math.max(5, Number(e.target.value) || 5))}
                />
              </div>
            )}
            <Button variant="secondary" onClick={onGenerateSchedule}>
              <Wand2 size={14} /> Generate schedule
            </Button>
          </div>

          {selectedPreset === "Custom times" && (
            <div>
              <Label>Daily publish times (comma-separated, 24h format)</Label>
              <Input value={customDailyTimes} onChange={(e) => onCustomDailyTimesChange(e.target.value)} placeholder="e.g. 10:00, 16:00, 20:00" />
              <p className="mt-1 text-[10px] text-muted">Videos cycle through these times each day.</p>
            </div>
          )}

          {schedulePreview.length > 0 && (
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
              <p className="mb-2 text-xs font-semibold text-accent">
                <CalendarClock size={12} className="mr-1 inline" />
                Preview — click &ldquo;Generate schedule&rdquo; to write these into the table above
              </p>
              <div className="max-h-32 space-y-1 overflow-y-auto">
                {schedulePreview.map((val, i) => (
                  <p key={i} className="font-mono text-[11px] text-text">
                    Video {i + 1}: {new Date(val).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at{" "}
                    {new Date(val).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
