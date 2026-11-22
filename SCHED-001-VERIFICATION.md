# SCHED-001 — Atomic Claims & Duplicate Upload Safety

**Status:** Draft. Source changes committed; runtime/build and real YouTube tests not yet executed.

## Overview

- Scheduled uploads now claim `pending -> processing` with a single conditional PostgreSQL `UPDATE ... RETURNING`. A losing worker does nothing.
- Each automation rule/day/time slot receives a durable `last_claimed_slot`; workers may claim a slot only once.
- Autopilot configs acquire a durable `active_run_id` before processing CSV rows. A second cron/manual caller receives an active-run error.
- Autopilot advances only **contiguous successfully published CSV rows**; the batch stops on the first failed row.
- If a YouTube upload outcome cannot be confirmed, the schedule becomes `needs_review` or Autopilot retains its run claim. No automatic re-upload occurs.
- Six-hour-old schedule claims are quarantined as `needs_review`. This is an alert condition, **not** automatic recovery.
- Clients can only edit/delete `pending` or `paused` schedules, preventing a completed record from being silently recycled.
- Creating a schedule now requires a media file belonging to the authenticated user.
- Once a due cron job starts, YouTube is called without a past `publishAt` timestamp; the selected visibility remains in effect.

## Schema rollout

`backend/src/db.ts` adds:
- `upload_schedules.processing_started_at`, `upload_schedules.youtube_video_id`
- `automation_rules.last_claimed_slot`
- `autopilot_configs.active_run_id`, `autopilot_configs.active_run_started_at`
- Unique partial index `uq_youtube_uploads_schedule` on `youtube_uploads(schedule_id)` where not null.

**Before deploying**, execute this read-only query against your target database and resolve every duplicate:

```sql
SELECT schedule_id, COUNT(*) AS upload_count,
       ARRAY_AGG(youtube_video_id) AS youtube_video_ids
FROM youtube_uploads
WHERE schedule_id IS NOT NULL
GROUP BY schedule_id
HAVING COUNT(*) > 1;
```

The unique index will fail to create if historical duplicates remain. Do **not** delete old rows blindly: reconcile with YouTube first and preserve evidence. Do not deploy workers before schema additions succeed.

## Local gate (PowerShell)

```powershell
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npm ci
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend build or security tests failed" }
```

For a **disposable isolated PostgreSQL database**, set the environment variables and run:

```powershell
$env:SCHED_TEST_DATABASE_URL = "postgresql://.../disposable_test_database"
$env:SCHED_TEST_ACK = "ISOLATED"
npm run test:scheduler:db
```

The concurrency probe creates a separate `sched001_claim_probe` table; it does not upload any videos. **Never supply production credentials.**

## Manual integration and failure tests (required)

1. Start two scheduler instances against one disposable database and two disposable YouTube channels. Exactly one process should win the same scheduled-video claim.
2. Verify that the losing worker never calls the external YouTube API.
3. Simulate a crash after the external YouTube API accepts a video but before the local completed status is committed. Verify status remains `processing` or `needs_review` and that it is not auto-retried.
4. Confirm `needs_review` rows can be reconciled manually using stored `youtube_video_id` and channel history before any operator-initiated resubmission.
5. Run concurrent manual and cron Autopilot calls for the same config; only one should claim `active_run_id`. Confirm interrupted runs keep the claim.
6. Inject a failure at CSV row 2 of a 3-row batch; confirm cursor advances only past successful row 1, not row 3.
7. Attempt to PATCH or DELETE completed, processing, and needs_review schedule IDs; expect HTTP 409.
8. Confirm scheduled videos have the intended YouTube visibility (note that the frontend currently sends `private` for server cron uploads).

## Limitations / follow-ups

- Atomic DB claims prevent ordinary competing-worker duplication, but **YouTube does not participate in the PostgreSQL transaction**. Exactly-once publication cannot be guaranteed when the process crashes between provider success and writing the result. Manual reconciliation is required.
- There is no automatic unlock for stranded Autopilot `active_run_id`; release it only after confirming no in-flight or published job needs reconciliation.
- Local time versus configured timezone and daily upload quota enforcement across near-simultaneous rule slots still need follow-up work.
- Browser UI should offer explicit manual resolution for `needs_review` before production release.
- SEC-001 remains a prerequisite; this branch builds on the draft security branch and must not be merged into `main` independently.
