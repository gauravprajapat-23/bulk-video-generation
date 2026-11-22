# AUTO-QUIZ-06 — End-to-End Staging Acceptance

**Status:** repeatable acceptance commands implemented and committed to draft PR #2. No test-channel YouTube upload, live rendering, database migration, provider generation, or security advisory remediation has been performed remotely in this session. Production publishing stays disabled.

## New acceptance commands

`backend/src/quizAcceptance.ts` — offline 5- or 20-question MP4 rendering from the known Football Legends fixture. Uses the actual Remotion composition and original effects, runs the existing pre-upload quality checker, streams a SHA-256 checksum, and writes JSON diagnostics beside the MP4. **No database, OpenAI, YouTube, or uploaded media is used.**

`backend/src/quizStagingDbCheck.ts` — read-only staging-only schema and expired-worker inspection; requires `QUIZ_STAGING_ACCEPTANCE_ACK=YES`, refuses `NODE_ENV=production`, never runs migrations or updates jobs, and fails if public publishing is enabled.

`backend/scripts/audit-acceptance.mjs` — records the current `npm audit --json` dependency inventory, vulnerability severity, affected version ranges, upstream advisories, and available remediations. Fails the release gate if there are any **high or critical** issues. Does not apply `npm audit fix --force`.

`backend/tests/quizAcceptance06.test.ts` — guards the expected 5/20-question timeline, isolated render operation, schema inspection, and nondestructive security audit.

### A. Verify current code

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend tests or build failed" }
ffmpeg -version
if ($LASTEXITCODE -ne 0) { throw "FFmpeg is missing" }
```

### B. Generate real offline MP4s with audio and frame diagnostics

```powershell
# Run from ...\video-maker-frontend\backend
$acceptanceDir = Join-Path $env:USERPROFILE "video-maker-acceptance"
New-Item -ItemType Directory -Force -Path $acceptanceDir | Out-Null
$env:QUIZ_STUDIO_PUBLICATION_ENABLED="false"

npm run accept:quiz -- --questions 5 --output-dir "$acceptanceDir" --audio-qa --frame-qa
if ($LASTEXITCODE -ne 0) { throw "5Q render or media QA failed" }

npm run accept:quiz -- --questions 20 --output-dir "$acceptanceDir" --audio-qa --frame-qa
if ($LASTEXITCODE -ne 0) { throw "20Q render or media QA failed" }
```

Expected files: `auto-quiz-06-5q.mp4`, `auto-quiz-06-5q.report.json`, `auto-quiz-06-20q.mp4`, `auto-quiz-06-20q.report.json`.

The canonical 20-question fixture should render **545 seconds (9:05)** at 30 fps; the five-question subset should render **158 seconds (2:38)** with default settings. Reports must show `status: "passed"`, correct video metadata, audio present, a SHA-256 hash and `providerUploadAttempted: false`. Watch both videos, including intros/outros, answer timing and voice/music balance, before approving.

**Note:** These two offline tests exercise built-in effects only. Optional AI TTS and licensed background music require a separate authorized staging render using the actual automation worker and uploaded licensed media. Do not infer TTS synchronization from this offline test.

### C. Inspect staging database (no writes)

Start your staging backend once with its staging `DATABASE_URL` to apply existing idempotent `ensureTables()` migrations; stop it if needed. Double-check that you are not pointing at production.

```powershell
$env:NODE_ENV="development"
$env:QUIZ_STAGING_ACCEPTANCE_ACK="YES"
$env:QUIZ_STUDIO_PUBLICATION_ENABLED="false"
npm run accept:db
if ($LASTEXITCODE -ne 0) { throw "Staging schema or worker lease gate failed" }
```

The script checks required `quiz_automation_jobs`, `quiz_studio_profiles`, `quiz_studio_assets` and YouTube-token schema, then reports counts by job status and expired in-flight leases. It prints no OAuth tokens.

### D. Investigate actual dependency advisories

```powershell
$auditReport = Join-Path $acceptanceDir "backend-audit.json"
npm run accept:audit -- --output "$auditReport"
Write-Host "Inspect severity and fixAvailable fields in $auditReport"
```

A nonzero audit exit is expected if high/critical advisories remain. The earlier Windows `npm ci` output showed **19 vulnerabilities (8 moderate, 10 high, 1 critical)**; this is prior evidence, not a fresh audit. Determine their precise transitive paths and targeted compatible updates, then update `package-lock.json` and rerun the test suite. Avoid `npm audit fix --force` without a dependency-by-dependency review.

### E. Authorized private YouTube test (manual staging gate)

1. Use a dedicated **test channel**, connected through the existing OAuth flow. Never use a personal/production channel for initial acceptance.
2. Configure the isolated staging backend with PostgreSQL, `QUIZ_AUTOMATION_ENABLED=true`, optional QA flags, and `QUIZ_STUDIO_PUBLICATION_ENABLED=false`. Keep recurring scheduling, lease recovery and TTS disabled for the first 5Q run.
3. At `/autopilot/quiz`, upload a valid five-question CSV with a unique topic. Monitor authenticated `GET /api/quiz-automation/jobs/:id` for `queued → generating → rendering → uploading → completed`.
4. Verify the returned YouTube video is **private**, channel ID matches the test channel, and actual playback and audio match the rendered file. Check title/description, duration and the `media_qa_report`.
5. Run a 20-question test separately; enable optional TTS and licensed music in isolated follow-up runs. Observe render time, memory, disk consumption, YouTube quota and handling of provider failures.
6. Exercise daily UTC scheduling and the unique-slot constraint. Test concurrent workers' atomic claims, then simulate a crash before upload and a crash during upload in staging with `QUIZ_STUDIO_LEASE_RECOVERY_ENABLED` enabled only for this controlled fault-injection test.
7. An expired pre-upload lease can be requeued under the bounded retry policy. An uncertain `uploading` state must remain `needs_review`—**never automatically retry** an ambiguous YouTube upload.
8. Review the source evidence report; `candidate_found` is only a search match, not proof of a correct answer. Creator review remains required before public publication.

### Release decision

- Pass: frontend and backend checks, no unacceptable vulnerabilities, isolated database migration, five- and twenty-question MP4 QA, confirmed private YouTube uploads, token scoping, recovery, rights and factual review.
- Block: any unverified provider upload, ambiguous duplicate, expired/unsafe licensing, incorrect video/audio, unpatched critical/high production advisories, or lack of reliable staging logs.
- **Do not merge draft PR #2 or enable `QUIZ_STUDIO_PUBLICATION_ENABLED=true` until every required release gate is supported by actual test evidence.**
