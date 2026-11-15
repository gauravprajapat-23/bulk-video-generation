import cron from "node-cron";
import sql, { isDbAvailable } from "../db";
import { uploadSchedule } from "./youtubeUpload";
import { processAutopilotConfigs } from "./autopilotPipeline";

const BATCH_SIZE = 5;

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
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
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
        const matchesTime = dailyTimes.some((t) => {
          const [h, m] = t.split(":").map(Number);
          const ruleMinutes = h * 60 + m;
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          return Math.abs(ruleMinutes - nowMinutes) <= 1;
        });

        if (!matchesTime) continue;

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

        // Find the next pending schedule for this user that isn't already assigned to a rule
        const nextSchedule = await sql`
          SELECT id FROM upload_schedules
          WHERE user_id = ${rule.user_id}
            AND status = 'pending'
            AND automation_rule_id IS NULL
          ORDER BY scheduled_at ASC
          LIMIT 1
        `;

        if (nextSchedule.length === 0) {
          console.log(`[scheduler] rule ${rule.name}: no pending schedules for user ${rule.user_id}`);
          continue;
        }

        // Assign the schedule to this rule and update its scheduled_at to now
        const scheduleId = nextSchedule[0].id;
        await sql`
          UPDATE upload_schedules
          SET automation_rule_id = ${rule.id},
              scheduled_at = now(),
              updated_at = now()
          WHERE id = ${scheduleId}
        `;

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
