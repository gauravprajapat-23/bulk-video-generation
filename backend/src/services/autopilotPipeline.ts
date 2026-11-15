/**
 * Server-side autopilot pipeline.
 * Runs the full cycle: generate images -> render video -> upload to YouTube.
 */
import fs from "fs";
import sql from "../db";
import { renderAllPages, extractTextOverlays } from "./imageRenderer";
import { renderVideoWithRemotion, type SlideData } from "../remotion/render";
import { uploadVideoForUser } from "./youtubeUpload";
import type { AutopilotConfig, AnimationPreset, BulkImageDesign, DesignPage } from "../types";

const DEFAULT_ANIMATION_PRESET: AnimationPreset = {
  textEntrance: "fade-in",
  textDuration: 600,
  kenBurns: true,
  kenBurnsDirection: "zoom-in",
  kenBurnsIntensity: 0.25,
  backgroundEffect: "none",
  backgroundOpacity: 0,
  endingType: "none",
  endingDuration: 1500,
};

const READABLE_PAUSE_MS = 700;

/**
 * Calculate proper slide duration based on text content and animation.
 */
function calculateSlideDuration(
  textOverlays: { text: string }[],
  slideIndex: number,
  totalSlides: number,
  animationPreset?: AnimationPreset,
  fallbackDurationMs?: number,
): number {
  const textDuration = animationPreset?.textDuration ?? 600;
  const textEntrance = animationPreset?.textEntrance ?? "fade-in";
  const isLast = slideIndex === totalSlides - 1;

  const totalChars = textOverlays.reduce((sum, o) => sum + (o.text?.length ?? 0), 0);

  const animationTimeMs =
    textEntrance === "typewriter"
      ? Math.max(textDuration, Math.ceil(totalChars * 50))
      : textDuration;

  const readingTimeMs = Math.max(0, totalChars * 150);
  const transitionBudget = 450;

  let minDuration: number;
  if (slideIndex === 0) minDuration = 2500;
  else if (isLast) minDuration = 3000;
  else minDuration = 4000;

  const calculated = transitionBudget + animationTimeMs + readingTimeMs + READABLE_PAUSE_MS;
  return Math.max(minDuration, calculated, fallbackDurationMs ?? 0);
}

/**
 * Check if an autopilot config should run now based on upload times.
 */
function isUploadTimeDue(config: Record<string, any>): boolean {
  if (!config.is_enabled) return false;
  if (!config.csv_rows || config.csv_rows.length === 0) return false;
  if (config.csv_cursor >= config.csv_rows.length) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().slice(0, 10);

  if (config.last_run_date) {
    const lastRun = new Date(config.last_run_date);
    if (lastRun.toISOString().startsWith(todayStr)) {
      const lastRunMinutes = lastRun.getHours() * 60 + lastRun.getMinutes();
      if (Math.abs(currentMinutes - lastRunMinutes) <= 3) return false;
    }
  }

  return (config.upload_times || []).some((t: string) => {
    const [h, m] = t.split(":").map(Number);
    const uploadMinutes = h * 60 + m;
    return Math.abs(currentMinutes - uploadMinutes) <= 2;
  });
}

/**
 * Resolve template placeholders with CSV row data.
 */
function resolveTemplate(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w .-]+)\s*\}\}/g, (_match: string, key: string) => {
    return row[key.trim()] ?? "";
  });
}

/**
 * Run one autopilot tick for a single config.
 */
export async function runAutopilotTickForConfig(
  config: any,
): Promise<{ generated: number; uploaded: number; errors: string[] }> {
  const result = { generated: 0, uploaded: 0, errors: [] as string[] };

  if (!config.is_enabled) return result;
  if (!config.csv_rows || config.csv_rows.length === 0) return result;
  if (config.csv_cursor >= config.csv_rows.length) return result;

  // One durable claim per config: concurrent cron/manual runners cannot start
  // the same CSV batch. An interrupted run must be reviewed, not auto-replayed.
  const runId = crypto.randomUUID();
  const claimed = await sql`
    UPDATE autopilot_configs
    SET active_run_id = ${runId}, active_run_started_at = now(), updated_at = now()
    WHERE id = ${config.id} AND is_enabled = true AND active_run_id IS NULL
    RETURNING *
  `;
  if (claimed.length !== 1) {
    result.errors.push("Autopilot run already active or awaiting reconciliation");
    return result;
  }
  config = claimed[0];
  let uncertainUpload = false;
  let cursorPersisted = false;

  try {
  const design: BulkImageDesign = config.design_data;
  if (!design?.pages || design.pages.length === 0) {
    result.errors.push("No design pages");
    return result;
  }

  const animPreset: AnimationPreset = config.animation_preset || DEFAULT_ANIMATION_PRESET;

  // Get rows to process
  const remaining = config.csv_rows.length - config.csv_cursor;
  const count = Math.min(config.videos_per_day || 3, remaining);
  const rowsToProcess = [];
  for (let i = 0; i < count; i++) {
    rowsToProcess.push({
      row: config.csv_rows[config.csv_cursor + i],
      rowIndex: config.csv_cursor + i,
    });
  }

  if (rowsToProcess.length === 0) return result;

  try {
    // Process each row
    for (const { row, rowIndex } of rowsToProcess) {
      const jobId = crypto.randomUUID();

      // Create job record
      await sql`
        INSERT INTO autopilot_jobs (id, config_id, csv_row_index, status)
        VALUES (${jobId}, ${config.id}, ${rowIndex}, 'generating_images')
      `;

      try {
        // 1. Generate images for each page
        const imageBuffers = renderAllPages(design, row);

        // Save images to temp files for Remotion
        const slideData: SlideData[] = design.pages.map((page, pageIndex) => {
          const overlays = extractTextOverlays(page, row, design.width, design.height);
          const durationMs = calculateSlideDuration(
            overlays,
            pageIndex,
            design.pages.length,
            animPreset,
            page.durationMs || config.page_duration_ms || 5000,
          );

          // Write image to temp file
          const tmpPath = `/tmp/autopilot-slide-${jobId}-${pageIndex}.png`;
          fs.writeFileSync(tmpPath, imageBuffers[pageIndex]);

          return {
            imageUrl: `file://${tmpPath}`,
            durationMs,
            transitionIn: page.transitionIn || "fade",
            transitionDurationMs: page.transitionDurationMs || 500,
            textOverlays: overlays,
          };
        });

        // 2. Update job status
        await sql`UPDATE autopilot_jobs SET status = 'rendering_video' WHERE id = ${jobId}`;

        // 3. Render video with Remotion
        const renderResult = await renderVideoWithRemotion({
          pages: slideData,
          animationPreset: animPreset,
          width: design.width,
          height: design.height,
        });

        // 4. Upload to YouTube
        await sql`UPDATE autopilot_jobs SET status = 'uploading' WHERE id = ${jobId}`;

        const videoBuffer = fs.readFileSync(renderResult.outputPath);
        const title = resolveTemplate(config.default_title_template || "{{headline}} #shorts", row);
        const description = resolveTemplate(config.default_description_template || "{{description}}", row);

        // From this point, an API error may conceal a successful YouTube upload.
        uncertainUpload = true;
        const uploadResult = await uploadVideoForUser(
          config.user_id,
          videoBuffer,
          "video/mp4",
          {
            title: title.slice(0, 100),
            description: description.slice(0, 5000),
            tags: config.default_tags || [],
            categoryId: config.default_category_id || "22",
            visibility: config.default_visibility || "public",
            madeForKids: config.default_made_for_kids || false,
          },
        );

        // 5. Mark job complete
        await sql`
          UPDATE autopilot_jobs SET
            status = 'completed',
            youtube_video_id = ${uploadResult.youtubeVideoId},
            youtube_video_url = ${uploadResult.youtubeVideoUrl},
            video_blob_url = ${renderResult.outputPath},
            completed_at = now()
          WHERE id = ${jobId}
        `;

        uncertainUpload = false;
        result.generated++;
        result.uploaded++;

        // Cleanup temp files
        try {
          fs.unlinkSync(renderResult.outputPath);
          for (let i = 0; i < design.pages.length; i++) {
            fs.unlinkSync(`/tmp/autopilot-slide-${jobId}-${i}.png`);
          }
        } catch { /* ignore cleanup errors */ }

      } catch (err: any) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        await sql`
          UPDATE autopilot_jobs SET
            status = 'failed',
            error_message = ${msg}
          WHERE id = ${jobId}
        `;
        result.errors.push(`Row ${rowIndex + 1}: ${msg}`);
        // Cursor counts contiguous successes only. Continuing after a failed row
        // would skip it and re-upload later successful rows on the next run.
        break;
      }
    }

    // Advance CSV cursor by number of successful uploads
    await sql`
      UPDATE autopilot_configs SET
        csv_cursor = ${config.csv_cursor + result.uploaded},
        last_run_date = now(),
        updated_at = now()
      WHERE id = ${config.id}
    `;
    cursorPersisted = true;

  } catch (err: any) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    result.errors.push(`Autopilot error: ${msg}`);
  }

  return result;
  } finally {
    if (uncertainUpload || (result.uploaded > 0 && !cursorPersisted)) {
      console.error(`[autopilot] run ${runId} needs manual reconciliation; preserving durable claim`);
    } else {
      // Never clear a claim owned by a different run.
      await sql`
        UPDATE autopilot_configs SET active_run_id = NULL,
          active_run_started_at = NULL, updated_at = now()
        WHERE id = ${config.id} AND active_run_id = ${runId}
      `;
    }
  }
}

/**
 * Process all enabled autopilot configs that are due for a tick.
 * Called by the cron scheduler.
 */
export async function processAutopilotConfigs(): Promise<void> {
  try {
    const enabledConfigs = await sql`
      SELECT * FROM autopilot_configs
      WHERE is_enabled = true
    `;

    if (enabledConfigs.length === 0) return;

    for (const config of enabledConfigs) {
      if (!isUploadTimeDue(config)) continue;

      console.log(`[autopilot] running tick for config: ${config.name} (${config.id})`);

      try {
        const result = await runAutopilotTickForConfig(config);
        console.log(`[autopilot] tick result for ${config.name}:`, result);
      } catch (err: any) {
        console.error(`[autopilot] tick failed for ${config.name}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[autopilot] error processing configs:", err.message);
  }
}
