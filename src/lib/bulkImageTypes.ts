import { newId } from "@/lib/id";
import type { TransitionType } from "@/lib/types";

export type ImageDesignPreset = "youtube_shorts" | "instagram_square" | "youtube_thumbnail" | "custom";

export type DesignElementType = "text" | "rect" | "ellipse" | "image" | "triangle" | "star" | "arrow" | "diamond";

export type ShapeType = "rect" | "ellipse" | "triangle" | "star" | "arrow" | "diamond";

export interface ElementShadow {
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface GradientStop {
  offset: number;
  color: string;
}

export interface ElementGradient {
  type: "linear" | "radial";
  stops: GradientStop[];
  angle: number;
}

export interface ElementFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

// ── Animation types ──────────────────────────────────────────────────────────

export type AnimationType =
  | "fadeIn" | "fadeOut"
  | "slideUp" | "slideDown" | "slideLeft" | "slideRight"
  | "scaleIn" | "scaleOut"
  | "rotateIn"
  | "typewriter"
  | "blurIn"
  | "pulse" | "bounce" | "spin" | "float" | "wiggle"
  | "none";

export type EasingType = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear";

export interface ElementAnimation {
  type: AnimationType;
  durationMs: number;
  delayMs: number;
  easing: EasingType;
  loop?: boolean;
}

export interface ElementAnimations {
  entrance?: ElementAnimation;
  exit?: ElementAnimation;
  loop?: ElementAnimation;
}

export const ANIMATION_TYPE_LABELS: Record<AnimationType, string> = {
  fadeIn: "Fade In",
  fadeOut: "Fade Out",
  slideUp: "Slide Up",
  slideDown: "Slide Down",
  slideLeft: "Slide Left",
  slideRight: "Slide Right",
  scaleIn: "Scale In",
  scaleOut: "Scale Out",
  rotateIn: "Rotate In",
  typewriter: "Typewriter",
  blurIn: "Blur In",
  pulse: "Pulse",
  bounce: "Bounce",
  spin: "Spin",
  float: "Float",
  wiggle: "Wiggle",
  none: "None",
};

export const EASING_LABELS: Record<EasingType, string> = {
  ease: "Ease",
  "ease-in": "Ease In",
  "ease-out": "Ease Out",
  "ease-in-out": "Ease In-Out",
  linear: "Linear",
};

export interface BaseDesignElement {
  id: string;
  type: DesignElementType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  locked?: boolean;
  groupId?: string | null;
  shadow?: ElementShadow;
  animation?: ElementAnimations;
  constraints?: { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };
}

export interface TextDesignElement extends BaseDesignElement {
  type: "text";
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
  textShadow?: ElementShadow;
  textOutline?: { color: string; width: number };
  textGradient?: ElementGradient;
}

export interface ShapeDesignElement extends BaseDesignElement {
  type: "rect" | "ellipse" | "triangle" | "star" | "arrow" | "diamond";
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  gradient?: ElementGradient;
}

export interface ImageCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ImageDesignElement extends BaseDesignElement {
  type: "image";
  imageAssetId: string | null;
  fit: "cover" | "contain";
  borderRadius: number;
  flipH?: boolean;
  flipV?: boolean;
  filters?: ElementFilters;
  crop?: ImageCrop;
}

export type DesignElement = TextDesignElement | ShapeDesignElement | ImageDesignElement;

/** Canvas fill behind all elements on a page — solid color, gradient, or repeating pattern. */
export interface CanvasBackground {
  type: "solid" | "gradient" | "pattern";
  color: string;
  gradient?: {
    type: "linear" | "radial";
    stops: GradientStop[];
    angle: number;
  };
  pattern?: "dots" | "lines" | "diagonal" | "grid";
  patternColor?: string;
  patternSize?: number;
}

/**
 * One slide/page in a design. Each page maps 1:1 to a video slide when the
 * design is used to generate bulk videos — pages.length becomes imagesPerVideo.
 */
export interface DesignPage {
  id: string;
  name: string;
  elements: DesignElement[];
  backgroundColor: string;
  canvasBg: CanvasBackground;
  transitionIn: TransitionType;
  transitionDurationMs?: number;
  /** How long this slide is visible during playback (milliseconds) */
  durationMs: number;
}

export interface CustomField {
  id: string;
  /** Placeholder name used in design, e.g. "headline" → {{headline}} */
  placeholder: string;
  /** CSV column header to pull data from (left blank = manual/default value) */
  csvColumn: string;
  /** Default value when CSV column is empty or missing */
  defaultValue: string;
  /** Display label in the editor */
  label: string;
}

export interface BulkImageDesign {
  id: string;
  name: string;
  preset: ImageDesignPreset;
  width: number;
  height: number;
  pages: DesignPage[];
  /** User-defined field mappings: CSV column → placeholder name */
  customFields: CustomField[];
  updatedAt: string;
}

export function createBlankPage(name: string, backgroundColor = "#101827"): DesignPage {
  return {
    id: newId(),
    name,
    elements: [],
    backgroundColor,
    canvasBg: { type: "solid", color: backgroundColor },
    transitionIn: "fade",
    durationMs: 3000,
  };
}

/**
 * Accepts either the current multi-page shape or the legacy single-page shape
 * (`{ elements, backgroundColor, ... }` directly on the design) and always
 * returns a valid multi-page BulkImageDesign. Use this on every load path
 * (saved designs, prebuilt templates, anything coming from localStorage) so
 * old data never crashes the editor.
 */
export function normalizeDesign(input: any): BulkImageDesign {
  const customFields: CustomField[] = Array.isArray(input?.customFields)
    ? input.customFields.map((f: any) => ({
        id: f.id || newId(),
        placeholder: f.placeholder || "",
        csvColumn: f.csvColumn || "",
        defaultValue: f.defaultValue || "",
        label: f.label || f.placeholder || "",
      }))
    : [];

  if (input && Array.isArray(input.pages) && input.pages.length > 0) {
    return {
      id: input.id || newId(),
      name: input.name || "Untitled Design",
      preset: input.preset || "youtube_shorts",
      width: input.width || 1080,
      height: input.height || 1920,
      updatedAt: input.updatedAt || new Date().toISOString(),
      customFields,
      pages: input.pages.map((p: any) => ({
        id: p.id || newId(),
        name: p.name || "Page",
        elements: Array.isArray(p.elements) ? p.elements : [],
        backgroundColor: p.backgroundColor || "#101827",
        canvasBg: p.canvasBg || { type: "solid", color: p.backgroundColor || "#101827" },
        transitionIn: p.transitionIn || "fade",
        transitionDurationMs: p.transitionDurationMs,
        durationMs: typeof p.durationMs === "number" ? p.durationMs : 3000,
      })),
    };
  }

  // Legacy single-page shape — wrap it into pages[0].
  const legacyElements: DesignElement[] = Array.isArray(input?.elements) ? input.elements : [];
  const legacyBg: string = input?.backgroundColor || "#101827";

  return {
    id: input?.id || newId(),
    name: input?.name || "Untitled Design",
    preset: input?.preset || "youtube_shorts",
    width: input?.width || 1080,
    height: input?.height || 1920,
    updatedAt: input?.updatedAt || new Date().toISOString(),
    customFields,
    pages: [
      {
        id: newId(),
        name: "Page 1",
        elements: legacyElements,
        backgroundColor: legacyBg,
        canvasBg: input?.canvasBg || { type: "solid", color: legacyBg },
        transitionIn: "fade",
        durationMs: 3000,
      },
    ],
  };
}

export const IMAGE_DESIGN_PRESETS: Record<ImageDesignPreset, { label: string; width: number; height: number }> = {
  youtube_shorts: { label: "Shorts / Reels (9:16)", width: 1080, height: 1920 },
  instagram_square: { label: "Instagram Square (1:1)", width: 1080, height: 1080 },
  youtube_thumbnail: { label: "YouTube Thumbnail (16:9)", width: 1280, height: 720 },
  custom: { label: "Custom", width: 1080, height: 1920 },
};

export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Playfair Display",
  "Oswald",
  "Raleway",
  "Poppins",
  "Lato",
  "Merriweather",
  "Nunito",
  "Source Sans Pro",
  "Ubuntu",
  "Crimson Text",
  "Pacifico",
  "Lobster",
  "Bebas Neue",
  "Anton",
  "Righteous",
  "Comfortaa",
];

export const DEFAULT_FONT = "Inter";

// ── Unified CSV types ────────────────────────────────────────────────────────

/** All recognized column categories in the unified CSV format. */
export type CsvColumnCategory = "content" | "seo" | "scheduling" | "branding" | "unknown";

/** Known column headers mapped to their categories. */
export const CSV_COLUMN_CATEGORIES: Record<string, CsvColumnCategory> = {
  headline: "content",
  subheadline: "content",
  days_left: "content",
  cta: "content",
  quote: "content",
  category: "content",
  fact_number: "content",
  fact: "content",
  author: "content",
  step_number: "content",
  total_steps: "content",
  video_title: "seo",
  description: "seo",
  tags: "seo",
  hashtags: "seo",
  category_id: "seo",
  visibility: "scheduling",
  publish_at: "scheduling",
  made_for_kids: "scheduling",
  language: "scheduling",
  channel_name: "branding",
  custom_thumbnail_alt: "branding",
};

/** YouTube SEO fields required for a valid row. */
export const SEO_REQUIRED_FIELDS = ["video_title", "description", "tags"] as const;

/** YouTube category ID to label mapping. */
export const YOUTUBE_CATEGORY_IDS: Record<string, string> = {
  "1": "Film & Animation",
  "2": "Autos & Vehicles",
  "10": "Music",
  "15": "Pets & Animals",
  "17": "Sports",
  "18": "Short Movies",
  "19": "Travel & Events",
  "20": "Gaming",
  "21": "Videoblogging",
  "22": "People & Blogs",
  "23": "Comedy",
  "24": "Entertainment",
  "25": "News & Politics",
  "26": "Howto & Style",
  "27": "Education",
  "28": "Science & Technology",
};

/** One row in the unified CSV format — content + SEO + scheduling + branding. */
export interface UnifiedCsvRow {
  // Content data (template placeholders)
  headline?: string;
  subheadline?: string;
  days_left?: string;
  cta?: string;
  quote?: string;
  category?: string;
  [key: string]: string | undefined;

  // YouTube SEO
  video_title: string;
  description: string;
  tags: string;
  hashtags?: string;
  category_id?: string;
  visibility?: "private" | "unlisted" | "public";

  // Scheduling
  publish_at?: string;
  made_for_kids?: string;
  language?: string;

  // Branding
  channel_name?: string;
  custom_thumbnail_alt?: string;
}

/** SEO validation result for a single CSV row. */
export interface SeoScoreResult {
  score: number;
  issues: string[];
  suggestions: string[];
}

/** Full validation result for a CSV file. */
export interface CsvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalRows: number;
    contentColumns: number;
    seoColumns: number;
    schedulingColumns: number;
    brandingColumns: number;
  };
  seoScores: SeoScoreResult[];
}