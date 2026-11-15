import cron from "node-cron";
import sql, { isDbAvailable } from "../db";
import { uploadSchedule } from "./youtubeUpload";
import { processAutopilotConfigs } from "./autopilotPipeline";

const BATCH_SIZE = 5;

/**
 * A crashed worker might have uploaded a video before its database status was
 * recorded. Never silently requeue these jobs; require manual reconciliation.
 */
export async function quarantineStaleSchedules(): Promise<number> {
  const stale = await sql`
    UPDATE upload_schedules
    SET status = 'needs_review', updated_at = now()
    WHERE status = 'processing'
      AND COALESCE(processing_started_at, updated_at) < now() - interval '6 hours'
    RETURNING id
  `;
  if (stale.length) console.warn(`[scheduler] ${stale.length} stale job(s) need manual review`);
  return stale.length;
}

/** Process schedules that are due (pending + scheduled_at <= now). */
async function processDueSchedules(): Promise<void> {
  if (!isDbAvailable()) return;
  try {
    const due = await sql`
      SELECT id FROM upload_schedules
      WHERE status = 'pending'
        AND scheduled_at <= now()
      ORDER BY scheduled_at ASC
      LIMIT ${BATCH_SIZE}
    `;

    if (due.length === 0) return;

    console.log(`[scheduler] processing ${due.length} due schedule(s)`);

    for (const row of due) {
      await uploadSchedule(row.id);
    }
  } catch (err: any) {
    console.error("[scheduler] error processing schedules:", err.message);
  }
}

/**
 * Process automation rules: for each enabled rule, check if today's upload
 * limit hasn't been reached and if the current time matches one of the daily
 * times. If so, pick the next pending schedule for this user and process it.
 */
async function processAutomationRules(): Promise<void> {
  if (!isDbAvailable()) return;
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const enabledRules = await sql`
      SELECT * FROM automation_rules
      WHERE is_enabled = true AND status = 'active'
    `;

    if (enabledRules.length === 0) return;

    for (const rule of enabledRules) {
      try {
        const dailyTimes: string[] = rule.daily_times || [];
        if (dailyTimes.length === 0) continue;

        // Check if current time matches any of the daily times (within 1-minute window)
        const matchedTime = dailyTimes.find((t) => {
          const [h, m] = t.split(":").map(Number);
          const ruleMinutes = h * 60 + m;
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          return Math.abs(ruleMinutes - nowMinutes) <= 1;
        });
        if (!matchedTime) continue;

        // Count how many uploads this rule has already triggered today
        const todayUploads = await sql`
          SELECT COUNT(*)::int AS count FROM upload_schedules
          WHERE automation_rule_id = ${rule.id}
            AND created_at >= ${todayStart}
            AND status IN ('pending', 'processing', 'completed')
        `;

        const uploadsToday = todayUploads[0]?.count || 0;
        if (uploadsToday >= rule.uploads_per_day) {
          console.log(`[scheduler] rule ${rule.name} reached daily limit (${uploadsToday}/${rule.uploads_per_day})`);
          continue;
        }

        // One rule/slot can only be claimed once across all scheduler instances.
        // Claiming a slot is atomic; do not execute a second upload for the same slot.
        const slot = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T${matchedTime}`;
        const ruleClaim = await sql`
          UPDATE automation_rules SET last_claimed_slot = ${slot}, updated_at = now()
          WHERE id = ${rule.id} AND is_enabled = true AND status = 'active'
            AND last_claimed_slot IS DISTINCT FROM ${slot}
          RETURNING id
        `;
        if (!ruleClaim.length) continue;

        // Claim the next unassigned schedule in one statement.
        const claimedSchedule = await sql`
          UPDATE upload_schedules SET
            automation_rule_id = ${rule.id},
            scheduled_at = now(),
            updated_at = now()
          WHERE id = (
            SELECT id FROM upload_schedules
            WHERE user_id = ${rule.user_id}
              AND status = 'pending'
              AND automation_rule_id IS NULL
            ORDER BY scheduled_at ASC
            LIMIT 1
          )
            AND user_id = ${rule.user_id}
            AND status = 'pending'
            AND automation_rule_id IS NULL
          RETURNING id
        `;
        if (!claimedSchedule.length) continue;
        const scheduleId = claimedSchedule[0].id;
        console.log(`[scheduler] rule ${rule.name}: assigned schedule ${scheduleId} (upload ${uploadsToday + 1}/${rule.uploads_per_day} today)`);
        await uploadSchedule(scheduleId);
      } catch (err: any) {
        console.error(`[scheduler] error processing rule ${rule.name}:`, err.message);
      }
    }
  } catch (err: any) {
    console.error("[scheduler] error processing automation rules:", err.message);
  }
}

export function startScheduler(): void {
  cron.schedule("* * * * *", async () => {
    if (!isDbAvailable()) return;
    try {
      await quarantineStaleSchedules();
    } catch (err) {
      console.error("[scheduler] stale-job reconciliation failed:", err);
    }
    await processDueSchedules();
    await processAutomationRules();
    await processAutopilotConfigs();
  });
  if (isDbAvailable()) {
    console.log("[scheduler] cron job started — checks every minute for due uploads and automation rules");
  } else {
    console.log("[scheduler] cron job started but database is offline — schedules and automation disabled until database reconnects");
  }
}
