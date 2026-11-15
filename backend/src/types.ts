// Shared types for autopilot system

export interface AutopilotConfig {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  is_enabled: boolean;
  videos_per_day: number;
  page_duration_ms: number;
  upload_times: string[];
  timezone: string;
  csv_data: string;
  csv_headers: string[];
  csv_rows: Record<string, string>[];
  csv_cursor: number;
  design_data: Record<string, any>;
  animation_preset: AnimationPreset;
  audio_id: string | null;
  default_title_template: string;
  default_description_template: string;
  default_tags: string[];
  default_category_id: string;
  default_visibility: "private" | "unlisted" | "public";
  default_made_for_kids: boolean;
  last_run_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutopilotJob {
  id: string;
  config_id: string;
  csv_row_index: number;
  status: "queued" | "generating_images" | "rendering_video" | "uploading" | "completed" | "failed";
  render_progress: number;
  youtube_video_id: string | null;
  youtube_video_url: string | null;
  error_message: string | null;
  video_blob_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AnimationPreset {
  /** @deprecated Text entrance is now controlled per-element via property panel */
  textEntrance?: "fade-in" | "slide-up" | "slide-down" | "typewriter" | "scale-in" | "none";
  /** @deprecated Text duration is now controlled per-element via property panel */
  textDuration?: number;
  kenBurns: boolean;
  kenBurnsDirection: "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
  kenBurnsIntensity: number;
  backgroundEffect: "none" | "particles" | "light-leak" | "bokeh";
  backgroundOpacity: number;
  endingType: "fade-to-black" | "fade-to-white" | "cta-overlay" | "none";
  endingDuration: number;
  endingText?: string;
}

export const DEFAULT_ANIMATION_PRESET: AnimationPreset = {
  kenBurns: true,
  kenBurnsDirection: "zoom-in",
  kenBurnsIntensity: 0.25,
  backgroundEffect: "particles",
  backgroundOpacity: 0.4,
  endingType: "fade-to-black",
  endingDuration: 1500,
  endingText: "",
};

export interface BulkImageDesign {
  id: string;
  name: string;
  preset: string;
  width: number;
  height: number;
  updatedAt: string;
  customFields: CustomField[];
  pages: DesignPage[];
}

export interface DesignPage {
  id: string;
  name: string;
  elements: DesignElement[];
  backgroundColor: string;
  canvasBg?: { type: string; color: string };
  transitionIn?: string;
  transitionDurationMs?: number;
  durationMs?: number;
}

export type DesignElement = TextDesignElement | ShapeDesignElement;

export interface TextDesignElement {
  id: string;
  type: "text";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  text: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  backgroundColor: string;
  borderRadius: number;
  fontFamily: string;
  letterSpacing: number;
  textShadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  textOutline?: { color: string; width: number };
}

export interface ShapeDesignElement {
  id: string;
  type: "rect";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  fill: string;
  borderRadius: number;
}

export interface CustomField {
  id: string;
  placeholder: string;
  csvColumn?: string;
  defaultValue?: string;
  label?: string;
}

export interface TextOverlay {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  weight: number;
  fontFamily: string;
  fontStyle: "normal" | "italic";
  lineHeight: number;
  letterSpacing: number;
  backgroundColor: string;
  borderRadius: number;
  textShadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  textOutline?: { color: string; width: number };
}
