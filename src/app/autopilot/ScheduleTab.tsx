"use client";

import { useState, useMemo } from "react";
import { Clock, Trash2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import type { AutopilotConfig } from "@/lib/types";

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Australia/Sydney",
  "Pacific/Auckland",
];

interface ScheduleTabProps {
  config: AutopilotConfig;
  onUpdate: (id: string, patch: Partial<AutopilotConfig>) => void;
}

export function ScheduleTab({ config, onUpdate }: ScheduleTabProps) {
  const [newTime, setNewTime] = useState("10:00");
  const [tzInput, setTzInput] = useState(config.timezone || "UTC");
  const [tzError, setTzError] = useState("");

  const uploadTimes = config.uploadTimes || [];
  const videosPerDay = config.videosPerDay || 1;

  const isValidTimezone = useMemo(() => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tzInput });
      return true;
    } catch {
      return false;
    }
  }, [tzInput]);

  function handleTimezoneChange(value: string) {
    setTzInput(value);
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      setTzError("");
      onUpdate(config.id, { timezone: value });
    } catch {
      setTzError("Invalid timezone. Use IANA format (e.g., America/New_York)");
    }
  }

  function addTime() {
    if (!newTime) return;
    if (uploadTimes.includes(newTime)) {
      return; // M20: Prevent duplicate upload times
    }
    const times = [...uploadTimes, newTime].sort();
    onUpdate(config.id, { uploadTimes: times });
    setNewTime("");
  }

  function removeTime(time: string) {
    onUpdate(config.id, { uploadTimes: uploadTimes.filter((t) => t !== time) });
  }

  const dailyCapacity = uploadTimes.length * videosPerDay;
  const csvRows = config.csvRows || [];
  const remainingRows = csvRows.length - (config.csvCursor || 0);
  const estimatedDays = dailyCapacity > 0 ? Math.ceil(remainingRows / dailyCapacity) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Label>Timezone</Label>
        <Input
          value={tzInput}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          placeholder="UTC"
          className={tzError ? "border-bad" : ""}
        />
        {tzError && (
          <p className="mt-1 text-[10.5px] text-bad flex items-center gap-1">
            <AlertCircle size={10} /> {tzError}
          </p>
        )}
        <div className="flex flex-wrap gap-1 mt-2">
          {COMMON_TIMEZONES.map((tz) => (
            <button
              key={tz}
              type="button"
              onClick={() => handleTimezoneChange(tz)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                tzInput === tz
                  ? "bg-accent text-white border-accent"
                  : "bg-panel2 text-muted border-border hover:border-accent/50"
              }`}
            >
              {tz}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[10.5px] text-muted">
          IANA timezone string (e.g., America/New_York, Europe/London)
        </p>
      </div>

      <div>
        <Label>Upload Times</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {uploadTimes.map((time) => (
            <div
              key={time}
              className="flex items-center gap-1 rounded-lg border border-border bg-panel2 px-2 py-1"
            >
              <Clock size={12} className="text-muted" />
              <span className="text-xs text-text">{time}</span>
              <button
                type="button"
                onClick={() => removeTime(time)}
                className="ml-1 text-muted hover:text-bad"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <Input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="flex-1"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={addTime}
            disabled={!newTime || uploadTimes.includes(newTime)}
          >
            <Plus size={14} /> Add Time
          </Button>
        </div>
        {newTime && uploadTimes.includes(newTime) && (
          <p className="mt-1 text-[10.5px] text-muted">This time is already added.</p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-panel2 p-4">
        <h4 className="text-sm font-semibold text-text mb-3">Schedule Overview</h4>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted">Videos per batch</p>
            <p className="text-text font-medium">{videosPerDay}</p>
          </div>
          <div>
            <p className="text-muted">Upload slots per day</p>
            <p className="text-text font-medium">{uploadTimes.length}</p>
          </div>
          <div>
            <p className="text-muted">Daily capacity</p>
            <p className="text-text font-medium">{dailyCapacity} videos</p>
          </div>
          <div>
            <p className="text-muted">CSV rows remaining</p>
            <p className="text-text font-medium">{remainingRows}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted">Estimated completion</p>
            <p className="text-text font-medium">
              {estimatedDays > 0 ? `~${estimatedDays} day${estimatedDays === 1 ? "" : "s"}` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
        <p className="text-xs text-muted">
          <strong className="text-text">How it works:</strong> The autopilot runs periodically and checks if any upload times are due.
          If there are CSV rows remaining, it creates a video for each upload time slot and uploads it to YouTube with the configured settings.
        </p>
      </div>
    </div>
  );
}
