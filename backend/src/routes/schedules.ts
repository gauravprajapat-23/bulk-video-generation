import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";
import { parseOwnedMediaFilename } from "../services/mediaReference";

const router = Router();

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`
      SELECT * FROM upload_schedules
      WHERE user_id = ${userId}
      ORDER BY scheduled_at ASC
    `;
    res.json(rows);
  } catch (err) {
    console.error("[schedules] list error:", err);
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

router.post("/", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { projectId, automationRuleId, scheduledAt, metadata, videoBlobUrl } = req.body ?? {};
  console.log("[schedules] POST / - userId:", userId, "projectId:", projectId, "scheduledAt:", scheduledAt);
  if (!projectId || !scheduledAt || !metadata) {
    console.error("[schedules] missing fields:", { projectId, scheduledAt, metadata });
    res.status(400).json({ error: "projectId, scheduledAt, and metadata are required" });
    return;
  }
  if (!metadata || typeof metadata!=="object" || Array.isArray(metadata) ||
      typeof metadata.channelId!=="string" || metadata.channelId.length<3 ||
      metadata.channelId.length>200 ||
      typeof metadata.title!=="string" || !metadata.title.trim() ||
      metadata.title.length>100 ||
      !["private","unlisted","public"].includes(metadata.visibility || "private") ||
      !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt)<=Date.now()) {
    res.status(400).json({error:"Valid YouTube channel, title, visibility and future schedule required"});
    return;
  }
  if (typeof videoBlobUrl !== "string" || !videoBlobUrl) {
    res.status(400).json({ error: "Upload the video before creating a schedule" });
    return;
  }
  let filename: string;
  try {
    filename = parseOwnedMediaFilename(videoBlobUrl);
  } catch {
    res.status(400).json({ error: "Invalid video reference" });
    return;
  }
  try {
    const media = await sql`
      SELECT filename FROM uploaded_media
      WHERE filename = ${filename} AND user_id = ${userId}
    `;
    if (!media.length) {
      res.status(404).json({ error: "Uploaded video not found" });
      return;
    }
    const linked = await sql`SELECT channel_id FROM user_youtube_tokens
      WHERE user_id=${userId} AND channel_id=${metadata.channelId}
        AND refresh_token IS NOT NULL LIMIT 1`;
    if(linked.length!==1){
      res.status(403).json({error:"Authorize the selected server YouTube channel first"});return;
    }
    const rows = await sql`
      INSERT INTO upload_schedules (user_id, project_id, automation_rule_id, scheduled_at, metadata, video_blob_url)
      VALUES (${userId}, ${projectId}, ${automationRuleId || null}, ${scheduledAt}, ${JSON.stringify(metadata)}, ${videoBlobUrl || null})
      RETURNING *
    `;
    console.log("[schedules] created:", rows[0]?.id);
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("[schedules] create error:", err?.message || err);
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  const { status, scheduledAt, metadata } = req.body ?? {};
  if (scheduledAt!==undefined && (typeof scheduledAt!=="string" ||
    !Number.isFinite(Date.parse(scheduledAt)) || Date.parse(scheduledAt)<=Date.now())) {
    res.status(400).json({error:"Schedule must be a valid future date"});return;
  }
  // Channel/visibility cannot be changed by an unrestricted metadata patch.
  // Creation checks ownership; preserve the original channel and metadata.
  if(metadata!==undefined){
    res.status(400).json({error:"Schedule metadata cannot be changed after channel authorization; recreate the schedule"});return;
  }
  if (status !== undefined && !["pending", "paused"].includes(status)) {
    res.status(400).json({ error: "Only pending and paused are allowed client statuses" });
    return;
  }
  try {
    const rows = await sql`
      UPDATE upload_schedules SET
        status = COALESCE(${status || null}, status),
        scheduled_at = COALESCE(${scheduledAt || null}, scheduled_at),
        metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, metadata),
        updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
        AND status IN ('pending', 'paused')
      RETURNING *
    `;
    if (rows.length === 0) {
      res.status(409).json({ error: "Schedule cannot be edited after processing begins" });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("[schedules] update error:", err);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  try {
    const rows = await sql`
      DELETE FROM upload_schedules
      WHERE id = ${id} AND user_id = ${userId}
        AND status IN ('pending', 'paused')
      RETURNING id
    `;
    if (!rows.length) {
      res.status(409).json({ error: "Only pending or paused schedules can be deleted" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[schedules] delete error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;
