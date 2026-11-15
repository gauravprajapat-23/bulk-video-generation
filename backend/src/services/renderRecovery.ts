import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sql from "../db";
import { isExpiredRenderTempFile, isKnownRenderTempFile, RENDER_MIN_ORPHAN_AGE_MS } from "./renderTempPolicy";

/**
 * Report unresolved work after a worker restart without retrying YouTube.
 * Never release a stranded run claim automatically: the provider outcome may
 * be uncertain, even if the local database lacks a provider video ID.
 */
export async function reportInterruptedRenders(): Promise<void> {
  const records = await sql`
    SELECT id, active_run_id, active_run_started_at FROM autopilot_configs
    WHERE active_run_id IS NOT NULL
    ORDER BY active_run_started_at ASC
    LIMIT 100
  `;
  if (records.length) {
    console.warn("[render-recovery] Autopilot runs require manual reconciliation:", records.map((r) => r.id));
  }
  const schedules = await sql`
    SELECT id FROM upload_schedules
    WHERE status = 'needs_review'
    ORDER BY updated_at ASC LIMIT 100
  `;
  if (schedules.length) {
    console.warn("[render-recovery] Schedule uploads require manual reconciliation:", schedules.length);
  }
}

/**
 * Conservative disk recovery. Never delete files while any Autopilot job may
 * still be running. Only application-owned filenames older than a full day
 * are candidates; errors are reported rather than deleting unrelated media.
 *
 * Intended to run once at startup, not periodically alongside live renders.
 */
export async function cleanOrphanedRenderTemps(
  minAgeMs = RENDER_MIN_ORPHAN_AGE_MS,
  tempDir = os.tmpdir(),
): Promise<{ deleted: number; skipped: number }> {
  if (!Number.isSafeInteger(minAgeMs) || minAgeMs < RENDER_MIN_ORPHAN_AGE_MS) {
    throw new Error("Minimum orphan age must be at least 24 hours");
  }
  const busy = await sql`
    SELECT EXISTS (
      SELECT 1 FROM autopilot_configs WHERE active_run_id IS NOT NULL
    ) AS active
  `;
  if (busy[0]?.active) {
    console.warn("[render-recovery] Active or unresolved Autopilot claim detected; skipping cleanup");
    return { deleted: 0, skipped: 1 };
  }
  const now = Date.now();
  let deleted = 0;
  let skipped = 0;
  const files = await fs.readdir(tempDir, { withFileTypes: true });
  for (const item of files) {
    if (!item.isFile() || !isKnownRenderTempFile(item.name)) continue;
    const fullPath = path.join(tempDir, item.name);
    try {
      const info = await fs.lstat(fullPath);
      if (!info.isFile() || !isExpiredRenderTempFile(item.name, info.mtimeMs, now, minAgeMs)) {
        skipped++;
        continue;
      }
      await fs.unlink(fullPath);
      deleted++;
    } catch (err) {
      skipped++;
      console.error("[render-recovery] could not clean temp file", item.name, err);
    }
  }
  return { deleted, skipped };
}
