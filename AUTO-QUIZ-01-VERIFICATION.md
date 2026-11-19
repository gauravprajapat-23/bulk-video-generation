# AUTO-QUIZ-01 — Niche or CSV → Remotion MP4 → Private YouTube (backend)

**Status:** Implementation committed on `fix/sched-001-atomic-claims` (draft PR #2). TypeScript, new tests, database migrations, provider calls, actual rendering and real YouTube uploads **must still be verified in the user environment**.

## Creator workflow

1. Sign in to Video Maker and connect the specific YouTube channel through the backend OAuth flow (refresh token required).
2. Go to `/autopilot/quiz`.
3. Enter a channel niche and video topic; optionally upload an existing 5–20 question CSV using the Football Legends sample schema. Without a CSV, the server generates quiz questions with the configured OpenAI API key.
4. Click **Start automatic video job** once. The API validates ownership, consent and CSV structure, then stores an authorized job in PostgreSQL.
5. The scheduler (once per minute) atomically claims one queued job and creates/validates the quiz, renders the 1920×1080 30fps Remotion composition with original countdown, suspense and reveal sound effects, verifies H264 and audio/duration metadata, and uploads **private** to that specific connected YouTube channel.
6. Job status, partial progress, errors, and YouTube URL are visible from the dashboard. The video owner reviews the private upload in YouTube Studio and publishes it when ready.

This provides **unattended one-video generation/upload after explicit submission**. It does NOT implement recurring daily niche generation, automatic public publishing, autonomous licensing/fact verification, AI thumbnails, guaranteed TTS narration, or multiple visual templates. These require additional milestones.

## New modules

- `backend/src/services/quizAutomationContent.ts`: bounded RFC4180 CSV reader, canonical server-side quiz conversion, optional OpenAI chat-completions authoring from niche/topic, strict validation against quiz rendering contract.
- `backend/src/services/quizAutomationWorker.ts`: scheduler-driven one-job worker, DB-backed `queued → generating → rendering → uploading → completed` transitions, 45-minute renderer timeout, MP4 metadata and audio validation, streamed OAuth YouTube upload. Uncertain provider results become `needs_review` and are never retried automatically.
- `backend/src/routes/quizAutomation.ts`: authenticated creation/status API scoped to the owning user, target channel authorization, CSV ≤100KB, 3 attempts per user per 24h, one outstanding/uncertain job per account, disabled-worker rejection.
- `backend/src/db.ts`: `quiz_automation_jobs` persistent table and filtered unique index for one outstanding job per user.
- `backend/src/services/scheduler.ts`: dispatch queue each minute, gated by `QUIZ_AUTOMATION_ENABLED=true`.
- `backend/src/services/youtubeUpload.ts`: optional pinned target channel, and stream-from-disk input for long MP4s rather than reading whole video into memory.
- `src/app/autopilot/quiz/page.tsx`: upload CSV / niche UI, connected channel selector, job status and upload link; added Sidebar navigation.
- `backend/tests/quizAutomationContent.test.ts`, `backend/tests/quizAutomationWiring.test.ts`: parser, validation and source-ownership/security regressions.

## Local setup

From project root:

```powershell
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
if ($LASTEXITCODE -ne 0) { throw "Backend tests/build failed" }
```

After backend `.env` is configured with the **already connected** PostgreSQL/Google OAuth details, set the following in a **local development backend PowerShell session**:

```powershell
$env:QUIZ_AUTOMATION_ENABLED="true"
# Optional when generating questions from niche without a CSV:
# $env:OPENAI_API_KEY="<your server-side API key>"
# $env:QUIZ_AI_MODEL="gpt-4.1-mini"
npm run dev
```

In a separate frontend PowerShell terminal, ensure `.env.local` contains `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`; start `npm run dev`, sign in, connect YouTube through `/youtube`, then open `/autopilot/quiz`.

For production, **do not enable yet** until distributed abuse protection, database migration tests and real 5Q/20Q render–upload acceptance tests pass. Production requires `SCHEDULER_ENABLED=true` and the existing `SCHEDULER_SINGLE_INSTANCE_ACK=true` only after verifying a single dedicated scheduler worker. `QUIZ_AUTOMATION_ENABLED=false` by default.

## Acceptance gates

1. CSV fixture imports and maps all 20 questions, including embedded quotes/commas; duplicate columns or bad rows are rejected.
2. Native backend `npm run check:security` and frontend `npx tsc --noEmit` / `npm run build` pass.
3. PostgreSQL initialization creates `quiz_automation_jobs` and unique per-user outstanding index; two simultaneous creator submissions cannot create duplicate outstanding jobs.
4. With worker disabled, POST /api/quiz-automation/jobs returns 503. Without login it returns 401. Without channel authorization it returns 403. Direct video upload cannot target a different connected channel.
5. With one valid five-question CSV, worker claims the job, outputs decodable full-HD H.264 with sound, uploads privately to the selected channel, records YouTube video ID and returns URL. No unrelated connected channel is used.
6. With AI mode, an API key must be available. Model output must pass strict schema and question validation; a malformed response fails closed rather than rendering or uploading.
7. The 20-question sample completes with its full 9:05 timeline and correct phase transitions. Inspect YouTube processing and the resulting actual video and audio.
8. Simulate a render failure: job is marked failed, temp files removed, no upload. Simulate ambiguous YouTube API outcome: job goes to `needs_review`, not queued for retry, to avoid duplicate videos.
9. Scheduler restart leaves in-progress or uncertain jobs visible for manual reconciliation; it must not silently restart the YouTube upload.
10. Review generated content for factual accuracy, rights, originality and YouTube quality/policy compliance. All videos stay **private**, regardless of the CSV or AI's instructions.

## Important limits

- This is a **quiz-template-specific** automation path. A generic niche such as cooking/finance still uses football-branded visual labels until new templates are created. Avoid pretending otherwise.
- AI model answers can be wrong or fabricated; private upload is not a substitute for factual review. Current prompt discourages hallucination but does not independently verify factual claims.
- No automatic music licensing, TTS, AI thumbnails, scheduled recurring content creation, or default public visibility.
- Job progress is coarse; 10% render buckets are persisted.
- If a worker crashes after upload, the job remains in an in-progress state; manual reconciliation is needed, and it must not be automatically retried.
- This reuses the existing server's Google OAuth refresh-token integration. No stored authorization token is sent to the browser by the automation API.
- Keep the draft PR unmerged until real native tests, release security gates and end-to-end provider verification pass.

**Next suggested milestone:** AUTO-QUIZ-02 — channel-aware template selection + recurring schedule + AI generation QA with human-approved autonomous publishing policy + durable reconciler.
