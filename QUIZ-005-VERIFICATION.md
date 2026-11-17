# QUIZ-005 — Football Legends Long-Form H.264 MP4 Rendering

**Status:** Implementation committed on existing `fix/sched-001-atomic-claims` branch (draft PR #2). **Not release-verified:** Native Next/TypeScript and backend tests, one complete Remotion render, FFmpeg/audio quality and guest download need to run locally. Do not claim a production-ready render from source edits alone.

## What was implemented

- Standalone backend Remotion composition `backend/src/remotion/FootballQuizVideo.tsx`, entrypoint `backend/src/remotion/quizEntry.tsx`.
- Rendered 1920×1080 landscape, 30fps, 20 editable football questions (default runtime 545s / 9m05s), intro, question entrance, staged clues, numeric circular timer, suspense, reveal, answer highlighting, halftime and outro.
- Original synthesized WAV cues for intro, countdown ticks, urgent final 3s, suspense and reveal. Optional uploaded music and **prepared full-length narration file** are included as audio tracks in the MP4; music volume/fades and scheduled narration-window ducking are configurable.
- No automatic TTS file creation. SpeechSynthesis is browser-only and cannot be reliably captured on the server. If narration is enabled, the user must provide a cleared, pre-timed narration file aligned to the full video. Duration/speech alignment is not verified per phrase yet; this is a release requirement.
- `backend/src/services/quizRenderValidation.ts` independently reconstructs the timeline; validates quiz, 5–20 questions, max 12 minutes, answer choices, clues, dimensions and audio signatures. No user-supplied URLs accepted.
- Opt-in `QUIZ_GUEST_RENDER_ENABLED=true`: anonymous CPU-intensive job queue disabled by default; one active job globally and max two attempts per IP per hour (in-memory; not suitable as the sole production abuse control). POST requires approved browser Origin, using `ALLOWED_ORIGINS`. Output linked only by 48-character cryptographically random opaque identifier.
- `backend/src/services/quizGuestRender.ts` uses `bundle`, `selectComposition`, `renderMedia`, `makeCancelSignal`, 45m worker timeout, onProgress callback, H.264 and 1080p/30fps metadata/duration/audio-stream integrity verification.
- Guest endpoints under `/api/quiz-render`: `POST /jobs`, `GET /jobs/:id`, `DELETE /jobs/:id`, `GET /jobs/:id/download`. Completed outputs are stored in OS temporary directory for 15 minutes, then removed. Server restart loses transient jobs. Cancelling asks Remotion to abort and cleans up.
- `/templates/football-quiz`: new Render MP4, progress, cancel and download controls. Uses streaming browser download instead of reading the entire file into memory. Music and narration uploads limited to 12MB each.
- `backend/tests/footballQuizRender.test.ts`: initial independent timeline, validation bounds and audio signature checks.

## Enable for local verification (PowerShell)

Terminal 1 — backend:

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend verification failed" }

# Requires local backend .env with DATABASE_URL, JWT_SECRET etc. already configured.
$env:QUIZ_GUEST_RENDER_ENABLED="true"
npm run dev
```

Terminal 2 — frontend:

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
npm ci
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# .env.local must include:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
npm run dev
```

Visit `http://localhost:3000/templates/football-quiz`, ensure no account is needed, and click **Render MP4**. For first native verification import a five-question CSV (a subset of the 20 provided questions) to avoid an unnecessary long render. Default 20-question export is 9:05; verify that after a small fixture succeeds.

## Mandatory test cases

1. 5-question smoke: output is decodable H.264 1920×1080 at 30 FPS, expected duration within 0.25s, not empty; download and play locally.
2. 20-question full export: verify 9:05 duration, correct question order, halftime, all reveal boundaries and no visual clipping at 1080p.
3. Render with effects/ticks enabled and supplied, cleared background music. Confirm audio stream exists, sound effects at precise countdown/reveal boundaries, reasonable loudness and no clipping.
4. Render with prepared **full-length** narration file. Manually check every spoken question and answer against the actual frame timeline. A too-short or mismatched narration file is currently not rejected automatically.
5. Start a render, watch progress, cancel, and verify no completed output can be downloaded; retries must not inherit partial output.
6. Try two concurrent guest render requests: second returns 429. Third request from same IP within an hour returns 429. Restart and verify transient jobs vanish without serving stale output.
7. POST with missing or foreign Origin: expect 403. API disabled by default: expect 503. GET/download with guessed or malformed ID: expect 404. Authenticated YouTube APIs remain protected.
8. Submit malformed quiz, invalid answer key, more than 20 questions, duration over 12 minutes, disguised media files and files exceeding 12MB. Expect rejection without starting a render.
9. Verify download is streamed by Express `res.download` with no-store headers and 15m expiry; no cross-user media or YouTube tokens are exposed.
10. Visually compare the same sample frames in browser preview vs Remotion output. **Pixel parity is not yet automated** because the browser and backend currently use separate layout implementations.

## Deployment warnings

- Keep `QUIZ_GUEST_RENDER_ENABLED=false` on public production until abuse defenses (distributed rate limits, CAPTCHA/challenge, isolation, file-size policy, disk quotas) are deployment-verified. A 9-minute 1080p render is expensive.
- Worker is in-process and in-memory: restarts cancel/lose jobs. No persistent distributed queue, recovery, or multi-worker orchestration.
- Remotion bundling requires the `backend/src/remotion/*.tsx` source files to ship with the deployed backend; do not deploy `dist/` alone.
- Audio uploads are held in memory and embedded as data URLs into renderer props. This is bounded but not optimal for production; use private asset storage and streaming in a production hardening milestone.
- Existing SEC-002 dependency vulnerabilities and media upload controls are not resolved by this milestone.
- The automatic frame-by-frame visual parity gate and durable TTS synthesis are pending. Do not market narration as automatic if no rendered narration audio was supplied.
- No real football portrait rights are provided: the export uses a generic silhouette.

## Follow-up after smoke tests

Resolve any actual TypeScript/bundle/render errors. Then implement distributed job leasing, media storage/quota controls, real pre-rendered per-question voice assets with duration verification, audio quality metrics, browser–Remotion screenshot parity, and a staging production gate before turning anonymous rendering on publicly.
