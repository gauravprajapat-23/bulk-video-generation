# AUTO-QUIZ-04 — Evidence Discovery, Rights Ledger, Worker Fencing and MP4 QA

**Implementation status:** Committed on `fix/sched-001-atomic-claims`, existing draft PR #2. **Native build, database migration, real renders and YouTube checks have not run in this session. Do not merge or enable production publication yet.**

## Changes

### Source evidence (read-only, explicitly *not* factual certification)

- Optional `QUIZ_STUDIO_SOURCE_CHECK_ENABLED=true` triggers independent per-question discovery through the fixed `https://en.wikipedia.org/w/api.php` search endpoint; no user-supplied URL is ever fetched.
- Each query is capped to 250 characters, limited to three results, and aborted after 8 seconds; an answer appearing in a Wikipedia search title/snippet is recorded as `candidate_found`, otherwise `not_corroborated` or `lookup_failed`.
- This result is **not truth verification, answer entailment, or evidence of source reliability**. Reports always contain `independentlyVerified:false` and `human_review_required`. Do not auto-publish or auto-approve from these reports.
- The existing user-provided CSV citation report remains separate; neither it nor external results are trusted automatically.

### Rights management, not media acquisition

- New channel-owned `quiz_studio_assets` database table with asset category, attribution, source URL, licensing name and evidence URL, explicit commercial and YouTube use permissions, expiry, and revocation. Endpoints:
  - `GET /api/quiz-automation/assets`
  - `POST /api/quiz-automation/assets`
  - `POST /api/quiz-automation/assets/:id/revoke`
- All endpoints require backend authentication; registration checks target channel OAuth ownership. URLs must be HTTPS and are never downloaded by the ledger.
- The creator dashboard shows a simple license-evidence register and revocation action for music records. The backend model also supports images/videos/fonts.
- **No third-party media is used yet.** Recording a license is not proving a license. Actual licensed-file ingestion, immutable content checksums, asset storage and proof review remain future work. Remotion continues using original procedural graphics and sounds.

### Durable claim safety and long-running worker heartbeats

- `quiz_automation_jobs` adds `worker_claim_id` (per-run random UUID), `worker_heartbeat_at`, `source_check_report`, `media_qa_report`, and nullable `asset_id` (reserved for future ingestion).
- Atomically claim `queued → generating` with a claim ID. State updates and progress writes include the claim ID. A fresh heartbeat runs during generation, narration, rendering and uploading. The final YouTube acknowledgement must update the same claim or fail.
- A stale or crashed job is **not** requeued automatically, since YouTube could have accepted the original upload before the worker died. The existing two-hour quarantine moves interrupted work to `needs_review`.
- This protects against stale DB writes; it is **not** a fully distributed lease/fencing coordinator, safe automatic replay, resumable uploads, or exactly-once provider transaction.

### Video/audio quality gate

- Before YouTube upload, `inspectStudioMp4` verifies source file existence/size, H.264 codec, 1920×1080, ~30 fps, presence of an audio track, and timeline duration within 0.3 seconds. Job fails closed if any invariant fails.
- Optional `QUIZ_STUDIO_AUDIO_QA_ENABLED=true` invokes local FFmpeg `volumedetect` for peak/mean dB. When enabled, missing executable or invalid measurement **fails** the job; effectively silent audio fails; near clipping produces a warning.
- Quality reports persist on the job and are displayed in the review dashboard. This is an initial machine gate only: it does not establish video aesthetics, visual clipping/flicker, frame-perfect lip-sync, rights, SEO quality or speech intelligibility.

### Tests

- `backend/tests/quizStudioHardening.test.ts`: license restrictions/expiration/revocation, independent evidence discovery never marked verified, provider failure status.
- `backend/tests/quizStudioReliability.test.ts`: claim token and heartbeat wiring, quality gate before upload, FFmpeg opt-in and owner-only asset ledger.

## Local gate (PowerShell)

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend TypeScript failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend production build failed" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend regression/build failed" }
```

Keep production flags OFF. Only for a local authorized test channel, after successful database migrations and baseline smoke tests:

```powershell
$env:QUIZ_AUTOMATION_ENABLED="true"
$env:QUIZ_STUDIO_SCHEDULING_ENABLED="true"
$env:QUIZ_STUDIO_SOURCE_CHECK_ENABLED="true"
$env:QUIZ_STUDIO_AUDIO_QA_ENABLED="true"
$env:QUIZ_STUDIO_PUBLICATION_ENABLED="false"
$env:QUIZ_STUDIO_TTS_ENABLED="false"
# Ensure ffmpeg is available in PATH, or set FFMPEG_PATH.
npm run dev
```

## Acceptance checks before any production enablement

1. Run frontend and backend TypeScript/build/security checks; inspect all newly added test output.
2. Apply DB migration to a non-production copy. Ensure repeated `ensureTables()` works with old jobs and that all new columns/indexes exist.
3. Register owned and expired/revoked asset evidence. Verify a different authenticated user cannot list, register for a foreign channel, or revoke it. Verify no external media is loaded into renderer.
4. Mock external Wikipedia search. Verify correct candidate/link status and provider timeout; none may set `independentlyVerified=true`. Check real queries against the proper API before enabling in staging.
5. Start a five-question render. Verify metadata/audio QA report is persisted and blocks upload if the file has missing audio, mismatched duration/FPS or is near silent. Confirm failed FFmpeg invocation fails the opt-in audio gate.
6. Validate 20-question full-HD export, visual frames, soundtrack, clipping and real YouTube private upload. Automated checks are not a substitute for creator viewing.
7. Interrupt generation, TTS, render and upload at controlled points. Confirm heartbeat updates, claim IDs, manual `needs_review` state and no automatic duplicate provider calls.
8. Test two workers attempting one job concurrently. Exactly one claim may succeed. Simulate old worker finishing after quarantine and verify the fenced DB update fails. A concurrent upload already in progress cannot be undone; follow manual reconciliation.
9. Verify review and publication endpoints still require owner approval, explicit confirmation, channel-specific OAuth scope and default-off publication configuration.
10. Review actual asset provenance, licenses, privacy and YouTube policies; do not label model-generated answers verified based only on string matches in Wikipedia snippets.

## Remaining requirements for production

- Real independent claim entailment using multiple trusted sources, source credibility evaluation, contradiction checks, citations and human override.
- Licensed media upload, virus/media signature checks, durable private asset storage, hashes, attribution in video metadata and channel-specific entitlement enforcement.
- Distributed durable worker leasing/fencing, isolated render pools, disk/CPU quotas, retryable pre-provider steps, and upload outcome reconciliation.
- Automated representative frame screenshots, black-frame detection, audio waveform analysis at scale, intelligibility/clip overlap checks and creator acceptance.
- Actual performance/retention evaluation, a reliable backend rollout pipeline, and documented operating procedures.

**Recommendation:** Keep draft PR #2 and public publishing disabled until native checks, real staging workflows and release/security reviews pass.
