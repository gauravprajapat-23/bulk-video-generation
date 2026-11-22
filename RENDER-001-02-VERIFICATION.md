# RENDER-001-02 — Browser, Timing, Parity & Interrupted Render Regression

## Scope

Implemented on **the existing** `fix/sched-001-atomic-claims` branch. PR #2 remains draft.

### Code delivered

1. Remotion uses cumulative slide-frame boundaries at 24/25/30/60 fps to prevent gaps and rounding drift. Unit tests: `backend/tests/frameTiming.test.ts`.
2. Browser audio trimming uses `calculateAudioPlaybackWindow`, with explicit non-looping and 60-second looping policy tests: `backend/tests/audioTiming.test.ts`.
3. Autopilot uses `os.tmpdir()`, `path.join()`, and `pathToFileURL()` instead of a hardcoded Linux `/tmp` path.
4. Backend startup reports unresolved Autopilot claims and uncertain schedule uploads. It skips old temp cleanup whenever any Autopilot run claim exists. Only application-named files over 24 hours old qualify for deletion. The cleanup does **not** release claims or automatically retry YouTube publishing.
5. The Remotion entrypoint lookup now supports compiled backends with source TSX under `src/remotion`.
6. A development-only browser page at `/render-smoke` exercises the actual Canvas/MediaRecorder pipeline in Chromium and tests abort behavior. This is not a synthetic MediaRecorder stub.
7. Read-only `ffprobe` and `ffmpeg` CLI tools validate decoded output and compare browser/server frames. Actual frame parity is **not yet proven**: generated source videos and thresholds must be supplied.

## Mandatory local gate (PowerShell)

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
if ($LASTEXITCODE -ne 0) { throw "Backend typecheck, unit tests or build failed" }
```

The backend security test script includes all `backend/tests/*.test.ts` files, including render timing and orphan policy tests. Integration tests under `tests/integration` remain separate and require an isolated test database.

## Real Chromium smoke test

Open terminal 1 in repository root:

```powershell
npm run dev
```

Open terminal 2 in repository root:

```powershell
npm install --no-save playwright
npx playwright install chromium
node scripts/render-browser-smoke.mjs
```

Expected: `PASS RENDER-001 real browser render, decoded video, cancellation`. It verifies actual browser output. The test route deliberately returns unavailable when built in production.

## Long audio and visual parity checks

Export video samples from the app, then install FFmpeg/ffprobe and run:

```powershell
node scripts/check-video-integrity.mjs "C:\\renders\\sample-60s.webm" --audio --duration-ms 60000 --tolerance-ms 1500
node scripts/check-video-integrity.mjs "C:\\renders\\sample-full-audio.webm" --audio --sync --duration-ms 60000 --tolerance-ms 1500
node scripts/check-video-integrity.mjs "C:\\renders\\server.mp4" --duration-ms 60000 --tolerance-ms 1500
node scripts/compare-render-frames.mjs "C:\\renders\\browser.webm" "C:\\renders\\server.mp4" --times 0.5,2,5,10 --max-mae 15
```

Only use `--sync` when audio is intended to run the full video duration: deliberately trimmed audio may correctly end earlier. Duration-only checks cannot detect phase/timestamp drift; waveform-marker measurement is still required for end-to-end accuracy.

The frame comparator decodes RGB frames with FFmpeg, rescales to the same dimensions, and prints mean absolute error. The same template/assets/timestamps must be used on both renderers. Large errors can be caused by font rendering, timing differences, transitions, or unsupported effects and should not be ignored.

### Known parity limitation

**The current Remotion Autopilot composition does not render a corresponding soundtrack**, while the browser pipeline supports audio tracks. Audio parity between the two engines is therefore not available yet. The frame comparison checks **visual** parity only. Client-side Canvas and server-side Remotion also use different text/transition implementations, so zero-error parity is not claimed.

## Recovery and deployment cautions

- Startup orphan cleanup needs DB connectivity and an idle Autopilot claim table; it never assumes that an abandoned run is safe to retry.
- If a worker crashes after the YouTube API accepted an upload, reconcile the published video using its account history and known provider IDs before modifying `active_run_id`.
- Cleanups are restricted by filename pattern and a minimum 24-hour modification age. Verify temp disk mount permissions and retention for your operating system.
- Do not run the same scheduled YouTube upload twice to test recovery on a real production channel.
- SEC-001 and SCHED-001 are unmerged prerequisites. Do not merge PR #2 before local builds and real browser/server smoke tests are green.

## Not yet verified remotely

No Chromium render, `npm run build`, test suite, `ffprobe` or live YouTube upload was executed from this GitHub-editing session. These must be run on a machine with dependencies and credentials configured.
