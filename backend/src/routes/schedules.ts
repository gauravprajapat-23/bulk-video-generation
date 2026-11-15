import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import sql from "../db";

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
  const { projectId, automationRuleId, scheduledAt, metadata, videoBlobUrl } = req.body;
  console.log("[schedules] POST / - userId:", userId, "projectId:", projectId, "scheduledAt:", scheduledAt);
  if (!projectId || !scheduledAt || !metadata) {
    console.error("[schedules] missing fields:", { projectId, scheduledAt, metadata });
    res.status(400).json({ error: "projectId, scheduledAt, and metadata are required" });
    return;
  }
  try {
    const rows = await sql`
      INSERT INTO upload_schedules (user_id, project_id, automation_rule_id, scheduled_at, metadata, video_blob_url)
      VALUES (${userId}, ${projectId}, ${automationRuleId || null}, ${scheduledAt}, ${JSON.stringify(metadata)}, ${videoBlobUrl || null})
      RETURNING *
    `;
    console.log("[schedules] created:", rows[0]?.id);
    res.status(201).json(rows[0]);
  } catch (err: any) {
    console.error("[schedules] create error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Failed to create schedule" });
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { id } = req.params;
  const { status, scheduledAt, metadata } = req.body;
  try {
    const rows = await sql`
      UPDATE upload_schedules SET
        status = COALESCE(${status || null}, status),
        scheduled_at = COALESCE(${scheduledAt || null}, scheduled_at),
        metadata = COALESCE(${metadata ? JSON.stringify(metadata) : null}::jsonb, metadata),
        updated_at = now()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) {
      res.status(404).json({ error: "Schedule not found" });
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
    await sql`DELETE FROM upload_schedules WHERE id = ${id} AND user_id = ${userId}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("[schedules] delete error:", err);
    res.status(500).json({ error: "Failed to delete schedule" });
  }
});

export default router;
