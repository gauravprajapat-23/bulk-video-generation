// Unified placeholder resolution for both image templates and video metadata.
// Uses a single regex that supports alphanumeric keys with spaces, dots, hyphens, underscores.

import type { CustomField } from "./bulkImageTypes";

const TOKEN_RE = /\{\{\s*([\w .-]+)\s*\}\}/g;

/** Replace {{key}} tokens in a template string with values from a data record. */
export function resolvePlaceholders(template: string, data: Record<string, string>): string {
  if (!template) return template;
  return template.replace(TOKEN_RE, (_match, key: string) => {
    const value = data[key];
    return value !== undefined && value !== "" ? value : "";
  });
}

/** Extract all unique placeholder keys from a template string. */
export function extractPlaceholders(template: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE);
  while ((m = re.exec(template))) found.add(m[1]);
  return Array.from(found);
}

/**
 * Apply custom field mappings to a CSV row, producing a resolved data object
 * where keys are placeholder names and values come from the mapped CSV columns
 * (falling back to defaultValue if the CSV column is empty/missing).
 *
 * Direct CSV column matches still work — this adds an extra layer on top.
 */
export function applyCustomFieldMappings(
  csvRow: Record<string, string>,
  customFields: CustomField[],
): Record<string, string> {
  const result = { ...csvRow };
  for (const field of customFields) {
    if (!field.placeholder) continue;
    const csvValue = field.csvColumn ? (csvRow[field.csvColumn] ?? "") : "";
    const resolved = csvValue || field.defaultValue || "";
    if (resolved) {
      result[field.placeholder] = resolved;
    }
  }
  return result;
}

/** Resolve placeholders in a template using a CSV row. Alias for resolvePlaceholders. */
export const applyCsvPlaceholders = resolvePlaceholders;

/** Reserved placeholder keys that are auto-populated by the system (not from CSV). */
export const SYSTEM_PLACEHOLDERS = ["serialNumber", "date", "daysLeft", "quote", "category"];

/** CSV columns that map to YouTube video metadata (not image template data). */
export const METADATA_csv_COLUMNS = {
  title: "title",
  description: "description",
  tags: "tags",
  scheduled_time: "scheduled_time",
  category_id: "category_id",
  made_for_kids: "made_for_kids",
  visibility: "visibility",
} as const;

export type MetadataCsvColumn = keyof typeof METADATA_csv_COLUMNS;

/** Check if a CSV column is a metadata column (title/description/tags/schedule) rather than template data. */
export function isMetadataColumn(header: string): boolean {
  return header in METADATA_csv_COLUMNS;
}

/** Extract video metadata from a CSV row. */
export function extractVideoMetadata(row: Record<string, string>): {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  scheduledTime: string | null;
  categoryId: string;
  madeForKids: boolean;
  visibility: "private" | "unlisted" | "public";
  language: string;
  channelName: string | null;
  customThumbnailAlt: string | null;
  animationPreset?: {
    kenBurns?: boolean;
    kenBurnsDirection?: string;
    backgroundEffect?: string;
    endingType?: string;
    endingText?: string;
  };
} {
  // Normalize hashtags: accept space-separated, comma-separated, or # prefixed
  const rawHashtags = row.hashtags || "";
  const hashtags = rawHashtags
    .split(/[,\s]+/)
    .map((h: string) => h.replace(/^#/, "").trim())
    .filter(Boolean);

  // Parse animation settings from CSV columns
  const animationPreset: Record<string, unknown> = {};
  if (row.ken_burns !== undefined) animationPreset.kenBurns = row.ken_burns === "true" || row.ken_burns === "1";
  if (row.ken_burns_direction) animationPreset.kenBurnsDirection = row.ken_burns_direction;
  if (row.background_effect) animationPreset.backgroundEffect = row.background_effect;
  if (row.ending_type) animationPreset.endingType = row.ending_type;
  if (row.ending_text) animationPreset.endingText = row.ending_text;

  return {
    title: row.video_title || row.title || row.headline || row.name || "",
    description: row.description || "",
    tags: row.tags
      ? row.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [],
    hashtags,
    scheduledTime: row.publish_at || row.scheduled_time || null,
    categoryId: row.category_id || "22",
    madeForKids: row.made_for_kids === "true" || row.made_for_kids === "1",
    visibility: (row.visibility as "private" | "unlisted" | "public") || "private",
    language: row.language || "en",
    channelName: row.channel_name || null,
    customThumbnailAlt: row.custom_thumbnail_alt || null,
    animationPreset: Object.keys(animationPreset).length > 0 ? animationPreset as any : undefined,
  };
}
