import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";

const router = Router();

// List autopilot configs for current user
router.get("/configs", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`
      SELECT * FROM autopilot_configs
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (err) {
    console.error("[autopilot] list configs error:", err);
    res.status(500).json({ error: "Failed to fetch autopilot configs" });
  }
});

// Create autopilot config
router.post("/configs", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { name, niche } = req.body ?? {};
  try {
    const rows = await sql`
      INSERT INTO autopilot_configs (user_id, name, niche)
      VALUES (${userId}, ${name || "New Autopilot"}, ${niche || "custom"})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[autopilot] create config error:", err);
    res.status(500).json({ error: "Failed to create autopilot config" });
  }
});

// Update autopilot config
router.put("/configs/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  const body = req.body ?? {};
  try {
    // Build dynamic update using individual field assignments
    const rows = await sql`
      UPDATE autopilot_configs SET
        name = COALESCE(${body.name ?? null}, name),
        niche = COALESCE(${body.niche ?? null}, niche),
        is_enabled = COALESCE(${body.isEnabled != null ? body.isEnabled : null}::boolean, is_enabled),
        videos_per_day = COALESCE(${body.videosPerDay ?? null}::int, videos_per_day),
        page_duration_ms = COALESCE(${body.pageDurationMs ?? null}::int, page_duration_ms),
        upload_times = COALESCE(${body.uploadTimes ?? null}::text[], upload_times),
        timezone = COALESCE(${body.timezone ?? null}, timezone),
        csv_data = COALESCE(${body.csvData ?? null}, csv_data),
        csv_headers = COALESCE(${body.csvHeaders ?? null}::text[], csv_headers),
        csv_rows = COALESCE(${body.csvRows ? JSON.stringify(body.csvRows) : null}::jsonb, csv_rows),
        csv_cursor = COALESCE(${body.csvCursor ?? null}::int, csv_cursor),
        design_data = COALESCE(${body.designData ? JSON.stringify(body.designData) : null}::jsonb, design_data),
        animation_preset = COALESCE(${body.animationPreset ? JSON.stringify(body.animationPreset) : null}::jsonb, animation_preset),
        audio_id = COALESCE(${body.audioId ?? null}, audio_id),
        default_title_template = COALESCE(${body.defaultTitleTemplate ?? null}, default_title_template),
        default_description_template = COALESCE(${body.defaultDescriptionTemplate ?? null}, default_description_template),
        default_tags = COALESCE(${body.defaultTags ?? null}::text[], default_tags),
        default_category_id = COALESCE(${body.defaultCategoryId ?? null}, default_category_id),
        default_visibility = COALESCE(${body.defaultVisibility ?? null}, default_visibility),
        default_made_for_kids = COALESCE(${body.defaultMadeForKids != null ? body.defaultMadeForKids : null}::boolean, default_made_for_kids),
        last_run_date = COALESCE(${body.lastRunDate ?? null}::timestamptz, last_run_date),
        updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "Autopilot config not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("[autopilot] update config error:", err);
    res.status(500).json({ error: "Failed to update autopilot config" });
  }
});

// Delete autopilot config
router.delete("/configs/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    await sql`DELETE FROM autopilot_configs WHERE id = ${id} AND user_id = ${userId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("[autopilot] delete config error:", err);
    res.status(500).json({ error: "Failed to delete autopilot config" });
  }
});

// List jobs for a config
router.get("/configs/:id/jobs", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    // Verify config belongs to user
    const config = await sql`SELECT id FROM autopilot_configs WHERE id = ${id} AND user_id = ${userId}`;
    if (config.length === 0) {
      res.status(404).json({ error: "Config not found" });
      return;
    }
    const jobs = await sql`
      SELECT * FROM autopilot_jobs
      WHERE config_id = ${id}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    res.json(jobs);
  } catch (err) {
    console.error("[autopilot] list jobs error:", err);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

// Manually trigger an autopilot tick
router.post("/configs/:id/run", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    const config = await sql`SELECT * FROM autopilot_configs WHERE id = ${id} AND user_id = ${userId}`;
    if (config.length === 0) {
      res.status(404).json({ error: "Config not found" });
      return;
    }
    // Import and run the pipeline
    const { runAutopilotTickForConfig } = await import("../services/autopilotPipeline");
    const result = await runAutopilotTickForConfig(config[0]);
    res.json(result);
  } catch (err: any) {
    console.error("[autopilot] run tick error:", err);
    res.status(500).json({ error: err.message || "Failed to run autopilot tick" });
  }
});

// Get single job status
router.get("/jobs/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    const rows = await sql`
      SELECT j.* FROM autopilot_jobs j
      JOIN autopilot_configs c ON j.config_id = c.id
      WHERE j.id = ${id} AND c.user_id = ${userId}
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("[autopilot] get job error:", err);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

export default router;
