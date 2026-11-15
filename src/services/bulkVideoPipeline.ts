/**
 * Bulk Video Pipeline
 *
 * Orchestrates the full flow: CSV data → Video Projects → Scheduling.
 * Bridges the gap between image generation and video scheduling.
 */

import type { ImageAsset, VideoProject, TransitionType, AnimationPreset, TextOverlay } from "@/lib/types";
import { DEFAULT_ANIMATION_PRESET } from "@/lib/types";
import type { ParsedCsv } from "@/lib/csv";
import type { BulkImageDesign, DesignPage, DesignElement, TextDesignElement } from "@/lib/bulkImageTypes";
import { extractVideoMetadata, applyCsvPlaceholders } from "@/lib/placeholders";
import { newId, nowIso } from "@/lib/id";
import { normalizeRetryIndices, imageStartForRow } from "@/services/bulkRetryMapping";

/** Metadata stored on each VideoProject.metadata field from CSV row data. */
export interface CsvProjectMetadata {
  csvRowIndex: number;
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
  /** All raw CSV row data for placeholder resolution. */
  rawRow: Record<string, string>;
}

/** Transition and animation info for a page in the video timeline. */
export interface PageTimelineInfo {
  pageIndex: number;
  durationMs: number;
  transitionIn: TransitionType;
  transitionDurationMs: number;
  animations: ElementAnimationInfo[];
}

/** Animation info for an element in the video timeline. */
export interface ElementAnimationInfo {
  elementId: string;
  elementType: string;
  entrance?: {
    type: string;
    durationMs: number;
    delayMs: number;
    easing: string;
  };
  exit?: {
    type: string;
    durationMs: number;
    delayMs: number;
    easing: string;
  };
  loop?: {
    type: string;
    durationMs: number;
    iterationCount: number | "infinite";
  };
}

/** Result of creating video projects from CSV + images. */
export interface PipelineResult {
  projects: VideoProject[];
  scheduledCount: number;
  timeline: PageTimelineInfo[];
  errors: PipelineError[];
}

/** Error during pipeline execution. */
export interface PipelineError {
  type: "generation" | "project_creation" | "scheduling";
  rowIndex?: number;
  pageIndex?: number;
  message: string;
  retryable: boolean;
}

/** Options for the enhanced video pipeline. */
export interface PipelineOptions {
  /** Default page duration in milliseconds (default: 5000) */
  defaultPageDurationMs?: number;
  /** Default transition duration in milliseconds (default: 500) */
  defaultTransitionDurationMs?: number;
  /** Number of images per video (default: 1) */
  imagesPerVideo?: number;
  /** Default animation preset for all videos */
  defaultAnimationPreset?: AnimationPreset;
  /** Source positions retained when regenerating a subset of CSV rows. */
  sourceRowIndices?: number[];
}

const READABLE_PAUSE_MS = 700;
const MIN_DURATION_BY_INDEX: Record<number, number> = {
  0: 2500,   // intro slide
  [-1]: 3000, // last/CTA slide (matched via length-1 check)
};

/**
 * Calculate proper slide duration based on text content and slide position.
 * Ensures there is enough time to read the text before the slide transitions.
 */
export function calculateSlideDuration(
  textOverlays: { text: string }[],
  slideIndex: number,
  totalSlides: number,
): number {
  const isLast = slideIndex === totalSlides - 1;

  // Total character count across all overlays on this slide
  const totalChars = textOverlays.reduce((sum, o) => sum + (o.text?.length ?? 0), 0);

  // Base animation time for text to appear (per-element animations handle their own timing)
  const animationTimeMs = 600;

  // Reading time: ~150ms per character (generous for short-form video)
  const readingTimeMs = Math.max(0, totalChars * 150);

  // Transition eats into the slide's time budget
  const transitionBudget = 450;

  // Minimums by slide position
  let minDuration: number;
  if (slideIndex === 0) {
    minDuration = MIN_DURATION_BY_INDEX[0];
  } else if (isLast) {
    minDuration = MIN_DURATION_BY_INDEX[-1];
  } else {
    minDuration = 4000; // question/answer slides
  }

  // Final duration = transition + animation + reading + pause, at least minDuration
  const calculated = transitionBudget + animationTimeMs + readingTimeMs + READABLE_PAUSE_MS;
  return Math.max(minDuration, calculated);
}

/**
 * Extract text overlays from design elements for a given page and CSV row.
 * Resolves {{placeholders}} in text content using row data.
 * Returns ALL TextOverlay[] from the page, sorted by zIndex.
 */
export function extractTextOverlaysFromDesign(
  page: DesignPage,
  row: Record<string, string>,
  designWidth: number,
  designHeight: number,
): TextOverlay[] {
  const textElements = page.elements
    .filter((el): el is TextDesignElement => el.type === "text")
    .sort((a, b) => a.zIndex - b.zIndex);

  return textElements.map((el) => {
    let xRatio: number;
    if (el.align === "center") {
      xRatio = (el.x + el.width / 2) / designWidth;
    } else if (el.align === "right") {
      xRatio = (el.x + el.width) / designWidth;
    } else {
      xRatio = el.x / designWidth;
    }

    return {
      text: applyCsvPlaceholders(el.text, row),
      x: xRatio,
      y: (el.y + el.height / 2) / designHeight,
      width: el.width / designWidth,
      fontSize: el.fontSize,
      color: el.color,
      align: el.align,
      weight: el.fontWeight,
      fontFamily: el.fontFamily || "Inter",
      fontStyle: el.fontStyle || "normal",
      lineHeight: el.lineHeight || 1.4,
      letterSpacing: el.letterSpacing || 0,
      backgroundColor: el.backgroundColor || "transparent",
      borderRadius: el.borderRadius || 0,
      textShadow: el.textShadow,
      textOutline: el.textOutline,
      animation: el.animation,
    };
  });
}

/**
 * Build timeline information from design pages.
 * Extracts transitions, animations, and timing for each page.
 * Uses page.durationMs when set, otherwise auto-calculates from text content.
 */
export function buildPageTimeline(
  design: BulkImageDesign,
  options: PipelineOptions = {},
  textOverlaysPerSlide?: TextOverlay[][],
): PageTimelineInfo[] {
  const {
    defaultPageDurationMs = 5000,
    defaultTransitionDurationMs = 500,
    defaultAnimationPreset,
  } = options;

  return design.pages.map((page, pageIndex) => {
    const animations: ElementAnimationInfo[] = [];

    for (const element of page.elements) {
      // Text animations are handled per-overlay in drawTextOverlays — only include shape/image animations
      if (element.animation && element.type !== "text") {
        const animInfo: ElementAnimationInfo = {
          elementId: element.id,
          elementType: element.type,
        };

        if (element.animation.entrance && element.animation.entrance.type !== "none") {
          animInfo.entrance = {
            type: element.animation.entrance.type,
            durationMs: element.animation.entrance.durationMs || 500,
            delayMs: element.animation.entrance.delayMs || 0,
            easing: element.animation.entrance.easing || "ease",
          };
        }

        if (element.animation.exit && element.animation.exit.type !== "none") {
          animInfo.exit = {
            type: element.animation.exit.type,
            durationMs: element.animation.exit.durationMs || 500,
            delayMs: element.animation.exit.delayMs || 0,
            easing: element.animation.exit.easing || "ease",
          };
        }

        if (element.animation.loop && element.animation.loop.type !== "none") {
          animInfo.loop = {
            type: element.animation.loop.type,
            durationMs: element.animation.loop.durationMs || 1000,
            iterationCount: element.animation.loop.loop ? "infinite" : 1,
          };
        }

        if (animInfo.entrance || animInfo.exit || animInfo.loop) {
          animations.push(animInfo);
        }
      }
    }

    // Calculate proper duration based on text content and reading time
    const overlays = textOverlaysPerSlide?.[pageIndex] ?? [];
    // If the user explicitly set a page duration in the editor, respect it.
    // Only auto-calculate when no explicit duration is set.
    const userDuration = page.durationMs || undefined;
    const calculatedDuration = userDuration
      ?? calculateSlideDuration(
        overlays,
        pageIndex,
        design.pages.length,
      );

    return {
      pageIndex,
      durationMs: calculatedDuration,
      transitionIn: page.transitionIn || "fade",
      transitionDurationMs: page.transitionDurationMs || defaultTransitionDurationMs,
      animations,
    };
  });
}

/**
 * Create video projects from generated images and CSV data.
 * Enhanced version with timeline building and error recovery.
 *
 * @param generatedImages - Images generated from bulk image editor
 * @param csv - Parsed CSV with template data + metadata columns
 * @param design - The bulk image design with pages and animations
 * @param createProjectFn - Zustand store's createProject function
 * @param addImagesToProjectFn - Zustand store's addImagesToProject function
 * @param options - Pipeline configuration options
 */
export function createProjectsFromCsv(
  generatedImages: ImageAsset[],
  csv: ParsedCsv,
  design: BulkImageDesign,
  createProjectFn: (partial?: Partial<VideoProject>) => VideoProject,
  addImagesToProjectFn: (projectId: string, imageAssetIds: string[], textOverlaysPerSlide?: TextOverlay[][]) => void,
  options: PipelineOptions = {}
): PipelineResult {
  const {
    defaultPageDurationMs = 5000,
    defaultTransitionDurationMs = 500,
    imagesPerVideo = 1,
    defaultAnimationPreset = DEFAULT_ANIMATION_PRESET,
    sourceRowIndices,
  } = options;

  const projects: VideoProject[] = [];
  const errors: PipelineError[] = [];

  // Build a sample text overlay set using the first CSV row to calculate proper slide durations.
  // All rows share the same design structure, so timing is based on representative text length.
  const sampleRow = csv.rows[0] ?? {};
  const sampleOverlaysPerSlide: TextOverlay[][] = design.pages.map((page) =>
    extractTextOverlaysFromDesign(page, sampleRow, design.width, design.height),
  );

  const timeline = buildPageTimeline(
    design,
    {
      defaultPageDurationMs,
      defaultTransitionDurationMs,
      defaultAnimationPreset,
    },
    sampleOverlaysPerSlide,
  );

  for (let i = 0; i < csv.rows.length; i += 1) {
    const row = csv.rows[i];
    const originalRowIndex = sourceRowIndices?.[i] ?? i;
    const meta = extractVideoMetadata(row);
    const imageStart = imageStartForRow(originalRowIndex, imagesPerVideo);
    const imageSlice = generatedImages.slice(imageStart, imageStart + imagesPerVideo);

    // Merge per-row CSV animation preset with default preset
    const animationPreset: AnimationPreset = meta.animationPreset
      ? { ...defaultAnimationPreset, ...meta.animationPreset } as AnimationPreset
      : defaultAnimationPreset;

    if (imageSlice.length === 0) {
      errors.push({
        type: "project_creation",
        rowIndex: originalRowIndex,
        message: `No images available for row ${originalRowIndex + 1}`,
        retryable: true,
      });
      continue;
    }

    try {
      const projectTitle = meta.title || row.headline || row.name || row.subheadline || `${design.name} ${originalRowIndex + 1}`;

      const csvMeta: CsvProjectMetadata = {
        csvRowIndex: originalRowIndex,
        title: projectTitle,
        description: meta.description,
        tags: meta.tags,
        hashtags: meta.hashtags,
        scheduledTime: meta.scheduledTime,
        categoryId: meta.categoryId,
        madeForKids: meta.madeForKids,
        visibility: meta.visibility,
        language: meta.language,
        channelName: meta.channelName,
        customThumbnailAlt: meta.customThumbnailAlt,
        rawRow: row,
      };

      // Recompute timing for the actual CSV row: variable-length text can
      // require longer reading time than the first row used as a sample.
      const textOverlaysPerSlide: TextOverlay[][] = design.pages.map((page) =>
        extractTextOverlaysFromDesign(page, row, design.width, design.height),
      );
      const rowTimeline = buildPageTimeline(
        design,
        { defaultPageDurationMs, defaultTransitionDurationMs, defaultAnimationPreset: animationPreset },
        textOverlaysPerSlide,
      );

      const project = createProjectFn({
        title: projectTitle,
        width: design.width,
        height: design.height,
        defaultSlideDurationMs: defaultPageDurationMs,
        transitionType: rowTimeline[0]?.transitionIn || "fade",
        metadata: {
          ...csvMeta,
          timeline: rowTimeline,
          designWidth: design.width,
          designHeight: design.height,
          totalPages: design.pages.length,
          pageDurationMs: defaultPageDurationMs,
          transitionDurationMs: defaultTransitionDurationMs,
          animationPreset,
        },
      });

      addImagesToProjectFn(project.id, imageSlice.map((img) => img.id), textOverlaysPerSlide);
      projects.push(project);
    } catch (error) {
      errors.push({
        type: "project_creation",
        rowIndex: originalRowIndex,
        message: error instanceof Error ? error.message : "Failed to create project",
        retryable: false,
      });
    }
  }

  return {
    projects,
    scheduledCount: projects.length,
    timeline,
    errors,
  };
}

/**
 * Create video projects with retry logic for failed rows.
 * Returns both successful projects and failed row indices.
 */
export function createProjectsWithRetry(
  generatedImages: ImageAsset[],
  csv: ParsedCsv,
  design: BulkImageDesign,
  createProjectFn: (partial?: Partial<VideoProject>) => VideoProject,
  addImagesToProjectFn: (projectId: string, imageAssetIds: string[], textOverlaysPerSlide?: TextOverlay[][]) => void,
  failedRowIndices: number[],
  options: PipelineOptions = {}
): PipelineResult {
  const {
    imagesPerVideo = 1,
  } = options;

  const indices = normalizeRetryIndices(failedRowIndices, csv.rows.length);
  const filteredCsv: ParsedCsv = {
    headers: csv.headers,
    rows: indices.map((i) => csv.rows[i]),
  };

  return createProjectsFromCsv(
    generatedImages,
    filteredCsv,
    design,
    createProjectFn,
    addImagesToProjectFn,
    { ...options, sourceRowIndices: indices }
  );
}

/**
 * Extract scheduling info from CSV projects.
 * Returns a map of projectId → scheduled ISO datetime string.
 */
export function extractScheduleTimes(projects: VideoProject[]): Map<string, string> {
  const scheduleMap = new Map<string, string>();

  for (const project of projects) {
    const meta = project.metadata as unknown as CsvProjectMetadata | undefined;
    if (meta?.scheduledTime) {
      const date = new Date(meta.scheduledTime);
      if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) {
        scheduleMap.set(project.id, date.toISOString());
      }
    }
  }

  return scheduleMap;
}

/**
 * Build per-project YouTube metadata from CSV data.
 * Returns metadata ready for the scheduler's metadata template.
 */
export function buildSchedulerMetadata(project: VideoProject): {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  categoryId: string;
  visibility: "private" | "unlisted" | "public";
  madeForKids: boolean;
  language: string;
  channelName: string | null;
  customThumbnailAlt: string | null;
} {
  const meta = project.metadata as unknown as CsvProjectMetadata | undefined;

  return {
    title: meta?.title || project.title || "",
    description: meta?.description || "",
    tags: meta?.tags || [],
    hashtags: meta?.hashtags || [],
    categoryId: meta?.categoryId || "22",
    visibility: meta?.visibility || "private",
    madeForKids: meta?.madeForKids ?? false,
    language: meta?.language || "en",
    channelName: meta?.channelName || null,
    customThumbnailAlt: meta?.customThumbnailAlt || null,
  };
}
