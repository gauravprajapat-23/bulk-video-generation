/**
 * Autopilot config snake_case ↔ camelCase transformations.
 * Used by frontend pages and API clients that work with the backend
 * (which uses snake_case column names).
 */

const SNAKE_TO_CAMEL_MAP: Record<string, string> = {
  is_enabled: "isEnabled",
  videos_per_day: "videosPerDay",
  page_duration_ms: "pageDurationMs",
  upload_times: "uploadTimes",
  csv_data: "csvData",
  csv_headers: "csvHeaders",
  csv_rows: "csvRows",
  csv_cursor: "csvCursor",
  design_data: "designData",
  animation_preset: "animationPreset",
  audio_id: "audioId",
  default_title_template: "defaultTitleTemplate",
  default_description_template: "defaultDescriptionTemplate",
  default_tags: "defaultTags",
  default_category_id: "defaultCategoryId",
  default_visibility: "defaultVisibility",
  default_made_for_kids: "defaultMadeForKids",
  last_run_date: "lastRunDate",
  created_at: "createdAt",
  updated_at: "updatedAt",
  config_id: "configId",
  csv_row_index: "csvRowIndex",
  render_progress: "renderProgress",
  youtube_video_id: "youtubeVideoId",
  youtube_video_url: "youtubeVideoUrl",
  error_message: "errorMessage",
  video_blob_url: "videoBlobUrl",
  completed_at: "completedAt",
};

const CAMEL_TO_SNAKE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(SNAKE_TO_CAMEL_MAP).map(([k, v]) => [v, k])
);

// design_data needs special handling (stringify objects)
const STRINGIFY_FIELDS = new Set(["designData"]);

export function autopilotCamel(row: any): any {
  if (!row || typeof row !== "object") return row;
  const out: any = { ...row };
  for (const [snake, camel] of Object.entries(SNAKE_TO_CAMEL_MAP)) {
    if (row[snake] !== undefined) {
      out[camel] = STRINGIFY_FIELDS.has(camel)
        ? typeof row[snake] === "string"
          ? row[snake]
          : JSON.stringify(row[snake] || {})
        : row[snake];
    }
  }
  return out;
}

export function autopilotSnake(patch: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(patch)) {
    const snake = CAMEL_TO_SNAKE_MAP[key];
    if (snake) {
      out[snake] = value;
    } else {
      // Pass through unmapped keys (e.g., timezone, configId) as-is
      out[key] = value;
    }
  }
  return out;
}
