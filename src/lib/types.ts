// Core domain types for the Video Maker module.
// Kept framework-agnostic so they map 1:1 onto the future backend DB schema
// (video_projects, video_project_images, audio_files, render_jobs, etc.)

export type TransitionType =
  | "fade"
  | "slide"
  | "zoom_in"
  | "zoom_out"
  | "ken_burns"
  | "none";

export type ExportPreset = "youtube_shorts" | "instagram_reels" | "tiktok" | "custom";

export type ProjectStatus = "draft" | "queued" | "rendering" | "completed" | "uploaded" | "failed";

export type RenderJobStatus = "pending" | "processing" | "completed" | "failed";

export type UploadVisibility = "private" | "unlisted" | "public";

export type UploadStatus = "not_uploaded" | "uploading" | "uploaded" | "failed";

export type UploadMode = "instant" | "scheduled_publish";

export type ScheduleStatus =
  | "pending"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "paused";

export interface WatermarkConfig {
  imageAssetId: string;
  position: "top_left" | "top_right" | "bottom_left" | "bottom_right" | "center";
  opacity: number; // 0-1
  scale: number; // relative width, 0-1
}

export interface TextOverlay {
  text: string;
  x: number; // 0-1 relative
  y: number; // 0-1 relative
  width: number; // 0-1 relative width of text box
  fontSize: number; // px at 1080 width baseline
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
  animation?: {
    entrance?: {
      type: string;
      durationMs: number;
      delayMs: number;
      easing: string;
      loop?: boolean;
    };
    exit?: {
      type: string;
      durationMs: number;
      delayMs: number;
      easing: string;
      loop?: boolean;
    };
    loop?: {
      type: string;
      durationMs: number;
      delayMs: number;
      easing: string;
      loop?: boolean;
    };
  };
}

/** Animation preset for video rendering. Stored in project.metadata.animationPreset. */
export interface AnimationPreset {
  /** @deprecated Text entrance is now controlled per-element via property panel */
  textEntrance?: "fade-in" | "slide-up" | "slide-down" | "typewriter" | "scale-in" | "none";
  /** @deprecated Text duration is now controlled per-element via property panel */
  textDuration?: number;
  /** Enable Ken Burns subtle zoom/pan effect */
  kenBurns: boolean;
  /** Ken Burns direction */
  kenBurnsDirection: "zoom-in" | "zoom-out" | "pan-left" | "pan-right";
  /** Ken Burns intensity (0-1, recommended 0.03-0.08) */
  kenBurnsIntensity: number;
  /** Background visual effect */
  backgroundEffect: "none" | "particles" | "light-leak" | "bokeh";
  /** Background effect opacity (0-1) */
  backgroundOpacity: number;
  /** How the video ends */
  endingType: "fade-to-black" | "fade-to-white" | "cta-overlay" | "none";
  /** Ending duration in ms */
  endingDuration: number;
  /** CTA text overlay (when endingType is "cta-overlay") */
  endingText?: string;
}

export const DEFAULT_ANIMATION_PRESET: AnimationPreset = {
  kenBurns: true,
  kenBurnsDirection: "zoom-in",
  kenBurnsIntensity: 0.05,
  backgroundEffect: "particles",
  backgroundOpacity: 0.4,
  endingType: "fade-to-black",
  endingDuration: 1500,
  endingText: "",
};

/** Metadata-only record. Actual bytes live in IndexedDB keyed by `blobKey`. */
export interface ImageAsset {
  id: string;
  blobKey: string;
  name: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
  createdAt: string;
}

export interface AudioAsset {
  id: string;
  blobKey: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  durationMs: number;
  waveform: number[]; // normalized 0-1 peaks, ~80 bars
  playlist: string | null;
  createdAt: string;
}

export interface VideoProjectImage {
  id: string;
  imageAssetId: string;
  order: number;
  durationMs: number | null; // null = use project default
  transitionOverride: TransitionType | null;
  textOverlays: TextOverlay[];
}

export interface AudioAssignment {
  audioAssetId: string;
  trimStartMs: number;
  trimEndMs: number | null; // null = full length
  loopIfShorter: boolean;
  cutIfLonger: boolean;
  volume: number; // 0-1
}

export interface VideoProjectMetadata {
  /** CSV source row data for placeholder substitution */
  rawRow?: Record<string, string>;
  /** Animation preset for video rendering */
  animationPreset?: AnimationPreset;
  [key: string]: unknown;
}

export interface VideoProject {
  id: string;
  title: string;
  status: ProjectStatus;
  exportPreset: ExportPreset;
  width: number;
  height: number;
  defaultSlideDurationMs: number;
  transitionType: TransitionType;
  watermark: WatermarkConfig | null;
  images: VideoProjectImage[];
  audioAssignment: AudioAssignment | null;
  outputBlobKey: string | null;
  outputSizeBytes: number | null;
  outputDurationMs: number | null;
  outputFormat: string | null;
  metadata: VideoProjectMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface RenderJob {
  id: string;
  projectId: string;
  status: RenderJobStatus;
  attemptCount: number;
  progressPercent: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface YouTubeAccountState {
  connected: boolean;
  channelId: string | null;
  channelTitle: string | null;
  channelThumbnailUrl: string | null;
  connectedAt: string | null;
}

export interface YouTubeUpload {
  id: string;
  projectId: string;
  scheduleId: string | null;
  uploadMode: UploadMode;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  visibility: UploadVisibility;
  madeForKids: boolean;
  status: UploadStatus;
  progressPercent: number;
  scheduledPublishAt: string | null;
  youtubeVideoId: string | null;
  youtubeVideoUrl: string | null;
  errorMessage: string | null;
  attemptCount: number;
  uploadedAt: string | null;
  createdAt: string;
}

export interface UploadSchedule {
  id: string;
  projectId: string;
  automationRuleId: string | null;
  scheduledAt: string;
  status: ScheduleStatus;
  metadata: {
    title: string;
    description: string;
    tags: string[];
    visibility: UploadVisibility;
    categoryId: string;
    madeForKids: boolean;
  };
  createdAt: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  isEnabled: boolean;
  uploadsPerDay: number;
  dailyTimes: string[]; // ["10:00", "19:00"]
  sourceAudioPlaylist: string | null;
  metadataTemplate: {
    title: string;
    description: string;
    tags: string;
  };
  status: "active" | "paused" | "cancelled";
  createdAt: string;
}

export const EXPORT_PRESET_DIMENSIONS: Record<ExportPreset, { width: number; height: number; label: string }> = {
  youtube_shorts: { width: 1080, height: 1920, label: "YouTube Shorts (9:16)" },
  instagram_reels: { width: 1080, height: 1920, label: "Instagram Reels (9:16)" },
  tiktok: { width: 1080, height: 1920, label: "TikTok (9:16)" },
  custom: { width: 1080, height: 1920, label: "Custom" },
};

export const TRANSITION_LABELS: Record<TransitionType, string> = {
  fade: "Fade",
  slide: "Slide",
  zoom_in: "Zoom In",
  zoom_out: "Zoom Out",
  ken_burns: "Ken Burns",
  none: "None (cut)",
};

// ─── Autopilot Types ────────────────────────────────────────────────────────

export interface AutopilotConfig {
  id: string;
  name: string;
  niche: string;
  isEnabled: boolean;

  // CSV data source
  csvData: string; // raw CSV text
  csvHeaders: string[];
  csvRows: Record<string, string>[];
  csvCursor: number; // next row index to use

  // Design (stored as serialized JSON of BulkImageDesign)
  designId: string | null;
  designData: string | null; // JSON-serialized BulkImageDesign

  // Video settings
  videosPerDay: number;
  animationPreset: AnimationPreset | undefined;
  pageDurationMs: number;
  audioId: string | null;

  // Schedule
  uploadTimes: string[]; // ["09:00", "12:00", "18:00"]
  timezone: string;

  // YouTube metadata defaults
  defaultTitleTemplate: string; // e.g. "{{headline}} #shorts"
  defaultDescriptionTemplate: string;
  defaultTags: string[];
  defaultCategoryId: string;
  defaultVisibility: UploadVisibility;
  defaultMadeForKids: boolean;

  createdAt: string;
  updatedAt: string;
  lastRunDate: string | null;
}

export type AutopilotJobStatus = "queued" | "generating_images" | "rendering_video" | "uploading" | "completed" | "failed";

export interface AutopilotJob {
  id: string;
  configId: string;
  csvRowIndex: number;
  projectId: string | null;
  renderJobId: string | null;
  uploadId: string | null;
  status: AutopilotJobStatus;
  scheduledUploadAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  retryCount: number;
  maxRetries: number;
  renderProgress: number;
  youtubeVideoId: string | null;
  youtubeVideoUrl: string | null;
}

export interface AutopilotState {
  configs: AutopilotConfig[];
  jobs: AutopilotJob[];
  lastTickAt: string | null;

  // Config CRUD
  createAutopilotConfig: (partial?: Partial<AutopilotConfig>) => AutopilotConfig;
  updateAutopilotConfig: (id: string, patch: Partial<AutopilotConfig>) => void;
  deleteAutopilotConfig: (id: string) => void;

  // Job management
  addAutopilotJob: (job: AutopilotJob) => void;
  updateAutopilotJob: (id: string, patch: Partial<AutopilotJob>) => void;
  advanceCsvCursor: (configId: string, count: number) => void;
  setLastTickAt: (iso: string) => void;
}
