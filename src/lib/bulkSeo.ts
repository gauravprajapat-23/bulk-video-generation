import type { UploadVisibility } from "@/lib/types";
export type { UploadVisibility };
import { resolvePlaceholders, extractVideoMetadata } from "@/lib/placeholders";
import { parseCsv, createCsv } from "@/lib/csv";

export const SCHEDULE_PRESETS = [
  { label: "1 per day", timesPerDay: 1, description: "1 video every day" },
  { label: "2 per day", timesPerDay: 2, description: "2 videos daily" },
  { label: "3 per day", timesPerDay: 3, description: "3 videos daily" },
  { label: "1 per week", timesPerDay: 0.14, description: "1 video every 7 days" },
  { label: "2 per week", timesPerDay: 0.28, description: "2 videos every 7 days" },
  { label: "Custom times", timesPerDay: -2, description: "Pick exact clock times" },
  { label: "Custom interval", timesPerDay: -1, description: "Set your own gap" },
] as const;

export const CATEGORIES = [
  { id: "22", label: "People & Blogs" },
  { id: "24", label: "Entertainment" },
  { id: "27", label: "Education" },
  { id: "26", label: "Howto & Style" },
  { id: "23", label: "Comedy" },
  { id: "10", label: "Music" },
];

/** Columns recognized when importing/pasting a CSV or spreadsheet block. */
export const KNOWN_COLUMNS = [
  "video_title",
  "title",
  "description",
  "tags",
  "visibility",
  "category_id",
  "made_for_kids",
  "publish_at",
  "scheduled_time",
];

/** One row per selected video — the single source of truth for its SEO + publish time. */
export interface BulkRow {
  id: string;
  title: string;
  description: string;
  tags: string;
  visibility: UploadVisibility;
  categoryId: string;
  madeForKids: boolean;
  publishAt: string; // datetime-local value, "" = unscheduled
}

export interface MetadataDraft {
  title: string;
  description: string;
  tags: string;
  hashtags: string[];
  visibility: UploadVisibility;
  categoryId: string;
  madeForKids: boolean;
}

export const DEFAULT_DRAFT: MetadataDraft = {
  title: "{{title}} #shorts",
  description: "",
  tags: "shorts",
  hashtags: [],
  visibility: "private",
  categoryId: "22",
  madeForKids: false,
};

export function toDateTimeLocalValue(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function appendHashtags(description: string, hashtags: string[]): string {
  if (!hashtags.length) return description;
  const suffix = hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  return `${description}\n\n${suffix}`;
}

export function generateScheduleSlots(
  count: number,
  preset: (typeof SCHEDULE_PRESETS)[number],
  startDate: string,
  customIntervalMinutes: number,
  customDailyTimesStr: string,
): string[] {
  const base = new Date(startDate);
  if (Number.isNaN(base.getTime())) return [];
  const timesPerDay = preset.timesPerDay;

  if (timesPerDay === -2) {
    const times = customDailyTimesStr.split(",").map((t) => t.trim()).filter(Boolean);
    if (times.length === 0) {
      return Array.from({ length: count }, (_, i) =>
        toDateTimeLocalValue(new Date(base.getTime() + i * 24 * 60 * 60_000)),
      );
    }
    const result: string[] = [];
    let dayOffset = 0;
    let timeIndex = 0;
    for (let i = 0; i < count; i++) {
      const [hours, minutes] = times[timeIndex].split(":").map(Number);
      const d = new Date(base);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(hours || 0, minutes || 0, 0, 0);
      if (i === 0 && dayOffset === 0 && d.getTime() < base.getTime()) {
        dayOffset = 1;
        d.setDate(d.getDate() + 1);
      }
      result.push(toDateTimeLocalValue(d));
      timeIndex++;
      if (timeIndex >= times.length) {
        timeIndex = 0;
        dayOffset++;
      }
    }
    return result;
  }

  let intervalMs: number;
  if (timesPerDay === -1) intervalMs = customIntervalMinutes * 60_000;
  else if (timesPerDay >= 1) intervalMs = (24 * 60 * 60_000) / timesPerDay;
  else intervalMs = (1 / timesPerDay) * 24 * 60 * 60_000;

  return Array.from({ length: count }, (_, i) => toDateTimeLocalValue(new Date(base.getTime() + i * intervalMs)));
}

/** Builds a row's starting SEO from a project's stored CSV metadata, falling back to the global template. */
export function buildDefaultRow(project: any, idx: number, draft: MetadataDraft): BulkRow {
  const data = { ...(project.metadata as Record<string, string>), title: project.title || "", serialNumber: String(idx + 1) };
  const rawRow = (project.metadata as any)?.rawRow as Record<string, string> | undefined;
  const meta = rawRow ? extractVideoMetadata(rawRow) : null;

  const title = resolvePlaceholders(meta?.title || draft.title, data) || project.title;
  const description = resolvePlaceholders(meta?.description || draft.description, data);
  const tags = meta?.tags?.length ? meta.tags.join(", ") : resolvePlaceholders(draft.tags, data);

  let publishAt = "";
  const dateStr = rawRow?.publish_at || rawRow?.scheduled_time;
  if (dateStr) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) publishAt = toDateTimeLocalValue(d);
  }

  return {
    id: project.id,
    title,
    description: appendHashtags(description, meta?.hashtags || []),
    tags,
    visibility: meta?.visibility || draft.visibility,
    categoryId: meta?.categoryId || draft.categoryId,
    madeForKids: meta?.madeForKids ?? draft.madeForKids,
    publishAt,
  };
}

/** Parses a pasted or uploaded block of text (tab- or comma-delimited) into header/row form. */
export function parseBulkSeoText(text: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("\t")) {
    const parsed = parseCsv(trimmed);
    return parsed.rows.length ? parsed : null;
  }

  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return null;

  const firstCells = lines[0].split("\t").map((c) => c.trim().toLowerCase().replace(/\s+/g, "_"));
  const looksLikeHeader = firstCells.some((c) => KNOWN_COLUMNS.includes(c));

  const fallbackHeaders = ["title", "description", "tags", "visibility", "category_id", "made_for_kids", "publish_at"];
  const headers = looksLikeHeader ? firstCells : fallbackHeaders.slice(0, firstCells.length);
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;

  const rows = dataLines.map((line) => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? "").trim()));
    return row;
  });

  return { headers, rows };
}

/** Overlays parsed CSV/paste rows onto the current bulk rows, by position. */
export function applyParsedRows(current: BulkRow[], parsed: { rows: Record<string, string>[] }): BulkRow[] {
  return current.map((row, idx) => {
    const src = parsed.rows[idx];
    if (!src) return row;
    const meta = extractVideoMetadata(src);
    const data = { ...src, serialNumber: String(idx + 1) };
    const next: BulkRow = { ...row };

    if (meta.title) next.title = resolvePlaceholders(meta.title, data) || meta.title;
    if (meta.description) next.description = resolvePlaceholders(meta.description, data);
    if (meta.tags?.length) next.tags = meta.tags.join(", ");
    if (meta.hashtags?.length) next.description = appendHashtags(next.description, meta.hashtags);
    if (src.visibility) next.visibility = meta.visibility;
    if (src.category_id) next.categoryId = meta.categoryId;
    if (src.made_for_kids !== undefined && src.made_for_kids !== "") next.madeForKids = meta.madeForKids;

    const dateStr = src.publish_at || src.scheduled_time;
    if (dateStr) {
      const d = new Date(dateStr);
      if (!Number.isNaN(d.getTime())) next.publishAt = toDateTimeLocalValue(d);
    }
    return next;
  });
}

export function rowsToCsv(projects: any[], rows: BulkRow[]): string {
  const headers = ["video_title", "description", "tags", "visibility", "category_id", "made_for_kids", "publish_at"];
  const data = rows.map((r) => ({
    video_title: r.title,
    description: r.description,
    tags: r.tags,
    visibility: r.visibility,
    category_id: r.categoryId,
    made_for_kids: String(r.madeForKids),
    publish_at: r.publishAt,
  }));
  return createCsv(headers, data);
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
