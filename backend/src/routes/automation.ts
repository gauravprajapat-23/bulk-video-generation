import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`
      SELECT * FROM automation_rules
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (err) {
    console.error("[automation] list error:", err);
    res.status(500).json({ error: "Failed to fetch automation rules" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { name, uploadsPerDay, dailyTimes, sourceAudioPlaylist, metadataTemplate } = req.body;
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  try {
    const rows = await sql`
      INSERT INTO automation_rules (user_id, name, uploads_per_day, daily_times, source_audio_playlist, metadata_template)
      VALUES (${userId}, ${name}, ${uploadsPerDay || 1}, ${dailyTimes || []}, ${sourceAudioPlaylist || null}, ${JSON.stringify(metadataTemplate || {})})
      RETURNING *
    `;
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("[automation] create error:", err);
    res.status(500).json({ error: "Failed to create automation rule" });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  const { name, isEnabled, uploadsPerDay, dailyTimes, sourceAudioPlaylist, metadataTemplate, status } = req.body;
  try {
    const rows = await sql`
      UPDATE automation_rules SET
        name = COALESCE(${name || null}, name),
        is_enabled = COALESCE(${isEnabled != null ? isEnabled : null}::boolean, is_enabled),
        uploads_per_day = COALESCE(${uploadsPerDay || null}::int, uploads_per_day),
        daily_times = COALESCE(${dailyTimes || null}::text[], daily_times),
        source_audio_playlist = COALESCE(${sourceAudioPlaylist || null}, source_audio_playlist),
        metadata_template = COALESCE(${metadataTemplate ? JSON.stringify(metadataTemplate) : null}::jsonb, metadata_template),
        status = COALESCE(${status || null}, status),
        updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "Automation rule not found" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("[automation] update error:", err);
    res.status(500).json({ error: "Failed to update automation rule" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    await sql`DELETE FROM automation_rules WHERE id = ${id} AND user_id = ${userId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("[automation] delete error:", err);
    res.status(500).json({ error: "Failed to delete automation rule" });
  }
});

export default router;
