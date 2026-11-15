"use client";

import type {
  AutopilotConfig,
} from "@/lib/types";

// ─── Timezone Helpers ────────────────────────────────────────────────────────

/**
 * Get current time components in a specific timezone.
 * Returns hours (0-23) and minutes (0-59) in the given timezone.
 */
function getLocalTimeInTimezone(timezone: string): { hours: number; minutes: number; dateStr: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const hours = parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10);
  const minutes = parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10);
  const dateStr = `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`;
  return { hours, minutes, dateStr };
}

/**
 * Parse a date string in a timezone and return hours and minutes.
 */
function parseTimeInTimezone(isoStr: string, timezone: string): { hours: number; minutes: number } {
  const date = new Date(isoStr);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    hours: parseInt(parts.find(p => p.type === "hour")?.value ?? "0", 10),
    minutes: parseInt(parts.find(p => p.type === "minute")?.value ?? "0", 10),
  };
}

// ─── Schedule Checker ───────────────────────────────────────────────────────

/**
 * Check if any uploads are due based on the config's upload times.
 * Uses a 2-minute window and checks lastRunDate to avoid duplicate runs.
 * Returns true if we should run a generation tick now.
 */
export function isUploadTimeDue(config: AutopilotConfig): boolean {
  if (!config.isEnabled) return false;
  if (config.csvRows.length === 0) return false;
  if (config.csvCursor >= config.csvRows.length) return false;

  const timezone = config.timezone || "UTC";
  const { hours, minutes, dateStr } = getLocalTimeInTimezone(timezone);
  const currentMinutes = hours * 60 + minutes;

  // Check if we already ran today at this time slot
  const lastRun = config.lastRunDate;
  if (lastRun && lastRun.startsWith(dateStr)) {
    const lastRunTime = parseTimeInTimezone(lastRun, timezone);
    const lastRunMinutes = lastRunTime.hours * 60 + lastRunTime.minutes;
    // If last run was within 3 minutes of now, skip (already handled this slot)
    if (Math.abs(currentMinutes - lastRunMinutes) <= 3) return false;
  }

  // Check if current time is within 2 minutes of any upload time
  return config.uploadTimes.some((t) => {
    const [h, m] = t.split(":").map(Number);
    const uploadMinutes = h * 60 + m;
    const diff = Math.abs(currentMinutes - uploadMinutes);
    return diff <= 2;
  });
}

/**
 * Get the next upload time for a config.
 */
export function getNextUploadTime(config: AutopilotConfig): string | null {
  if (!config.isEnabled || config.uploadTimes.length === 0) return null;

  const timezone = config.timezone || "UTC";
  const { hours, minutes } = getLocalTimeInTimezone(timezone);
  const currentMinutes = hours * 60 + minutes;

  const sortedTimes = [...config.uploadTimes].sort();

  for (const time of sortedTimes) {
    const [h, m] = time.split(":").map(Number);
    const timeMinutes = h * 60 + m;
    if (timeMinutes > currentMinutes) return time;
  }

  // All times passed today, return first time tomorrow
  return sortedTimes[0];
}
