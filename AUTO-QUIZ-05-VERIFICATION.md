# AUTO-QUIZ-05 — Production Acceptance & Worker Recovery

**Branch:** `fix/sched-001-atomic-claims` · **PR:** #2 (draft, unmerged).

**Status:** Source implementation committed, but native TypeScript, database integration, 5/20-question Remotion renders, FFmpeg analysis, provider uploads and staging crash tests have NOT been executed in this GitHub-only session. This is not production approval.

## Implemented in AUTO-QUIZ-05

### 1. Pre-upload worker recovery with expiring claims

- `quiz_automation_jobs` now stores `worker_lease_expires_at` and `worker_attempt_count`. Claim expiration starts 90 seconds ahead and heartbeats renew every 30 seconds.
- State changes and YouTube acknowledgements are fenced by `worker_claim_id`, and the upload transition requires a non-expired lease.
- `recoverExpiredQuizLeases()` is **disabled by default** via `QUIZ_STUDIO_LEASE_RECOVERY_ENABLED=false`. When enabled, an expired `generating`/`rendering` job with fewer than two attempts is requeued with its old claim revoked. An expired `uploading` job (or an exhausted pre-upload retry) moves to `needs_review`, never silently uploads twice.
- The old worker can potentially consume CPU until its render returns or cancellation fires, but cannot claim its expired job's upload transition. This is not a fully distributed queue with CPU fencing; do not operate more than one render worker until concurrent race and fault-injection tests pass.
- The original scheduler's manual two-hour crash quarantine remains as fallback. YouTube uploads are not transactional: post-provider failures and ambiguous results always require human reconciliation.

### 2. Actual owned, licensed-audio ingestion

- `POST /api/quiz-automation/assets/:id/audio` accepts up to 12 MB of MP3/WAV with signature/MIME checks, after authenticating the user and confirming channel rights, license expiry/revocation and asset type.
- Files are stored with randomized names, write-exclusive permissions, no overwrite, and a SHA-256 checksum in `quiz_studio_assets`. The private directory is never served directly through the public `/uploads/:filename` route.
- `POST /api/quiz-automation/profiles/:id/music` selects or clears eligible, actually uploaded licensed audio for a channel profile.
- Each recurring scheduled job snapshots `music_asset_id`. The renderer loads, hashes and checks rights at render time, inserts music as a looping Remotion audio input, and rechecks license/integrity immediately before YouTube upload. Revoking a license blocks future uploads that use it.
- Dashboard now supports uploading music and assigning/revoking the selected licensed soundtrack.
- **Production storage requirement:** Set `QUIZ_STUDIO_ASSET_DIR` to a private absolute path on a persistent **shared volume** reachable from the intended workers. The fallback local folder is for single-instance development, not durable cloud deployments. Uploaded asset cleanup, scanning, codec duration, quotas, and distributed storage are still needed. Copyright rights recorded in the ledger are owner declarations, not legal proof.
- **Media scope:** MP3 and WAV only; images/videos/fonts remain ledger-only. No licensed images or video clips are rendered automatically.

### 3. Automated visual-frame QA

- `QUIZ_STUDIO_FRAME_QA_ENABLED=false` by default. When enabled, FFmpeg samples approximately 12%, 50%, and 86% of a completed MP4 and collects approximate luma statistics.
- Frame checks fail closed when FFmpeg is unavailable, image statistics cannot be extracted, or the sample looks near-black or overexposed. The existing codec/size/duration/audio checks still run.
- Samples are only a **coarse smoke gate**, not complete visual acceptance. They cannot reliably detect text clipping, incorrect correct-answer reveals, flicker, or scene continuity. Creator review is still mandatory.

### 4. Testing and reporting

- New backend regression source tests `backend/tests/quizStudioRecovery05.test.ts` cover immutable audio, scheduled job binding, lease recovery policies, upload-claim fencing, visual-frame QA and owner-scoped routes.
- Existing independent evidence checking remains **candidate corroboration only** (`independentlyVerified:false`). Genuine multi-source factual entailment and contradiction verification are **not** implemented; do not claim AI answers are proven.

## Windows verification

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend TypeScript failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend verification failed" }

ffmpeg -version
if ($LASTEXITCODE -ne 0) { throw "FFmpeg is required for frame/audio QA" }
```

Only after these commands pass, apply the DB changes on a **non-production** PostgreSQL clone, connect a test YouTube channel, and test a small five-question video with **public publishing disabled**:

```powershell
$env:QUIZ_AUTOMATION_ENABLED="true"
$env:QUIZ_STUDIO_SCHEDULING_ENABLED="true"
$env:QUIZ_STUDIO_FRAME_QA_ENABLED="true"
$env:QUIZ_STUDIO_AUDIO_QA_ENABLED="true"
$env:QUIZ_STUDIO_LEASE_RECOVERY_ENABLED="false"
$env:QUIZ_STUDIO_PUBLICATION_ENABLED="false"
# Set a private, absolute QUIZ_STUDIO_ASSET_DIR and required backend credentials.
npm run dev
```

## Mandatory acceptance matrix

1. Verify old databases migrate idempotently; unique active-job constraints and new asset/profile/job columns are correct.
2. Reject unauthenticated/foreign-channel music upload, invalid MP3/WAV bytes, >12MB files, or revoked/expired license.
3. Upload a permitted MP3 to private persistent storage. Ensure recorded SHA-256 equals the actual file bytes; attempts to replace the file fail.
4. Bind audio to a profile, schedule a private video, and verify Remotion music plays and ducks beneath narration.
5. Revoke the audio license **during rendering**: the pre-upload rights recheck must prevent YouTube upload.
6. Validate five-question and full 20-question MP4s; inspect representative frame luma, 1080p, 30fps, audio track, expected duration and audible soundtrack.
7. Run FFmpeg with invalid PATH or corrupt a frame QA response: uploading must fail before provider access.
8. Test two worker instances claiming one queued job. Only one should own its claim; the second returns no work.
9. Simulate render worker dying before upload, allow its 90-second lease to expire, then enable lease recovery in staging. Confirm a new claim retries safely and the old worker cannot upload.
10. Simulate dying **during YouTube upload**, allow expiration, verify `needs_review` (never automatic replay). Reconcile the video's actual YouTube state manually.
11. Test an independent Wikipedia source lookup returning misleading snippets; the evidence report must still state `independentlyVerified:false`. Creator approval and publication remain separate explicit acts.
12. Inspect security, performance, storage persistence across restart, disk cleanup, provider quota/cost controls, and YouTube compliance before enabling production.

## Release blockers

- True multi-source answer entailment/contradiction verification.
- Commercial image/video asset ingestion and legally reviewed licensing pipeline.
- Durable cloud object storage, file scanning and cleanup for licensed binaries, and isolated scalable workers.
- Visual clipping/flicker and complete video intelligibility QA; creator sign-off.
- Native build and staging acceptance tests, concurrent claim fault injection, migration rollback verification, and production release audit.

**Recommended follow-up:** Resolve failures from local checks first, then execute end-to-end staging acceptance and close remaining release blockers. Keep PR #2 draft and public publishing disabled.
