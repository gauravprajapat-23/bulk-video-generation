# AUTO-QUIZ-03 — Evidence, Opt-In AI Narration, Original Artwork & Creator Publication Gate

**Branch:** `fix/sched-001-atomic-claims`, existing draft PR #2. **Status:** source committed; native TypeScript/tests, database migration, audio rendering, YouTube permission and provider calls **not yet executed** by assistant. Do not merge or enable production public publication before acceptance.

## Implemented

### 1. Creator approval queue and one-shot publication
- `quiz_automation_jobs` schema gains `review_status` (pending/approved/rejected), review timestamp/owner/note, `publication_status` (not_requested/publishing/published/needs_review), `published_at`, `evidence_report`.
- After a private/unlisted upload completes, **the creator** explicitly chooses Approve or Reject. Review does **not** publish.
- A second, separate confirmed action `POST /api/quiz-automation/jobs/:id/publish` requires `confirmation: "PUBLISH_PUBLIC"` and `QUIZ_STUDIO_PUBLICATION_ENABLED=true` on server. The SQL update atomically claims `not_requested → publishing`. No retried publication after a provider error; job moves to `needs_review` for manual reconciliation.
- `quizStudioPublication.ts` fetches the *targeted user + channel* OAuth connection and validates that the video belongs to that channel before `videos.update(part=status)`. Existing video status settings are preserved where possible. An already-public video is idempotently treated as done.
- The YouTube `videos.update` API requires `youtube` or `youtube.force-ssl` OAuth scope, **not** the old `youtube.upload`-only authorization. OAuth initiation now includes `youtube.force-ssl`. Existing channel connections must be reauthorized, and the publication service rejects tokens without the required stored scope. Official Google reference: https://developers.google.com/youtube/data/reference/rest/v3/videos/update
- `/autopilot/quiz` shows per-job approval/rejection, separate confirm-to-publish button, review status and ambiguous outcome warnings.

### 2. Evidence transparency (NOT full factual verification)
- `quizStudioEvidence.ts` creates a per-question report with stated correct answer and optional HTTPS source URL supplied through CSV `source` column.
- Every report explicitly states `verified: false`, `human_review_required`. AI-generated answers without independently checked sources are **not** misrepresented as factual truth; CSV URLs are citation pointers, **not verification**.
- Source URLs are parsed from existing CSV and never fetched by the server, preventing arbitrary user URL SSRF.
- The creator must check factual answers, music/visual licensing, and narration before approving.

### 3. Optional measured TTS
- `QUIZ_STUDIO_TTS_ENABLED=false` default. If enabled, `quizStudioSpeech.ts` generates original speech clips via server-side OpenAI `tts-1` with `alloy` voice.
- Generates question and answer clips separately. Each MP3 is duration-checked using Remotion media metadata and must fit in the entrance+clues or reveal+transition window; oversized clips **fail the job**, never silently truncate in the export.
- Composes clips as Remotion `<Sequence>` elements at exact scene frames. Dynamic music ducking is applied during speech slots.
- Limitations: provider credits and licensed voice consent apply; no per-user voice selection, alternate languages, robust rate-limit/retry policy, durable audio asset storage or verified studio loudness yet. The whole job currently fails on one clip that overruns its scene.

### 4. Procedural niche artwork
- Four branded variants now use visibly different original gradient lighting: football gold, general purple, science teal and history sepia.
- No third-party player images, licensed music or untrusted external assets are downloaded or distributed. A real licensed-media ingestion/attribution system is **not implemented**; original generated CSS/SVG remains the safe default.

### 5. Render worker resilience
- The existing worker reports per-job evidence, persists approximate render progress and now sends a 60-second database heartbeat throughout long renderMedia calls.
- The existing 2-hour interrupted-job quarantine remains. Worker restarts and ambiguous YouTube outcomes must be manually reconciled; no distributed lease/fencing or automated recovery is claimed.

## Verify locally

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
if ($LASTEXITCODE -ne 0) { throw "Backend regression/build failed" }
```

To test in local development backend with an authorized **test channel**:

```powershell
$env:QUIZ_AUTOMATION_ENABLED="true"
$env:QUIZ_STUDIO_SCHEDULING_ENABLED="true"
$env:QUIZ_STUDIO_TTS_ENABLED="false"
$env:QUIZ_STUDIO_PUBLICATION_ENABLED="false"
npm run dev
```

Set the appropriate database, Google OAuth and server OpenAI credentials separately in your private backend configuration; never commit real keys. The public update endpoint stays disabled until specifically enabled by the operator, after the creator reconnects YouTube and all tests pass.

## Mandatory end-to-end acceptance

1. Fresh DB migration adds review, publication, evidence, source and timing columns without disrupting existing schedules; verify startup on an existing database snapshot.
2. New `quizStudioEvidence` tests: no citations falsely marked verified; CSV link preserved without network fetch; AI facts remain review-required.
3. Authenticated `GET /jobs` shows only owner jobs, review/evidence status; other users cannot approve, reject or publish by guessing UUIDs.
4. Completed uploaded test video: approval saves only review status, YouTube stays private. Reject disables publication.
5. Publication endpoint requires explicit `PUBLISH_PUBLIC`, creator-approved video and server opt-in. Verify old OAuth refresh tokens without video-update scopes fail closed; reconnect via current OAuth flow.
6. After scope and server flag are configured, one test video successfully updates privacy to public. Simulate two concurrent publish requests: exactly one SQL claim succeeds. Simulate provider timeout: `needs_review`, no replay.
7. Verify 5-question and 20-question AI/CSV renders with TTS disabled. Reproduce MP4 dimensions, duration, sound stream, download, correct template art and YouTube private upload.
8. Enable TTS in staging: generate 5-question clip set, inspect real audio lengths, human listen for pronunciation/ducking, ensure no overlap or missing voice. Test an overly long script: render/upload must fail before any external YouTube upload.
9. Simulate crashed render and long render heartbeat. Ensure healthy jobs are not prematurely quarantined; uncertain upload outcomes must remain review-only.
10. Audit any added music/image asset for commercial YouTube rights, attribution, permitted usage and disclosure requirements. No licensed-asset repository or automated factual source verification exists yet.

## Release blockers and next steps

- A true *independent factual verification engine* that retrieves trusted, relevant sources and verifies each answer is not built. External citation links are not proof. Always use creator review.
- Professionally licensed images/music asset library, attribution ledger, brand assets and rights expiration checks are not built.
- TTS is an optional candidate implementation requiring full provider + Remotion smoke tests.
- No transactional YouTube upload can guarantee exactly-once provider execution. Keep `needs_review` and manual resolution.
- In-process queue still lacks durable distributed worker leasing/fencing and robust observability (heartbeat helps only during render).
- Default public publishing remains **off**; enabling it is a deliberate operator and creator decision after policy, OAuth, YouTube verification and release testing.
- CI/security and all staging tests must pass before promoting PR #2.

**Recommended next phase:** AUTO-QUIZ-04 — independent source-based factual verification and citation viewer; licensed media ingestion and rights ledger; durable job leases, private asset storage and automated A/V QA.
