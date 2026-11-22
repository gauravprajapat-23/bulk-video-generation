# RENDER-001 — Rendering Integrity and Export Reliability

Status: **Implementation in progress, runtime validation pending**.

This milestone is implemented on the existing `fix/sched-001-atomic-claims` branch. No new branch was created.

## Current changes

- Browser recording takes an `AbortSignal` and cancels the actual MediaRecorder, animation loop, timer, audio nodes, tracks, and in-memory bitmap resources.
- Cancelled render jobs are marked `cancelled`, not `failed` or `completed`; already-cancelled work is not saved to IndexedDB.
- Missing/unreadable project image and audio assets now fail visibly, rather than silently dropping frames or the audio track.
- Browser audio playback honors trim-start, trim-end and video duration. This is still realtime recording and must be tested for timing drift under CPU load.
- Empty browser recordings are rejected before persistence.
- Remotion validates duration, dimensions, frame rate and nonempty output. Partial MP4 outputs are removed on failure.
- Autopilot removes temporary slide files and partial videos when render/upload work fails, and does not store a deleted output path as a durable media URL.

## Local verification

From the repository root:

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
if ($LASTEXITCODE -ne 0) { throw "Backend checks failed" }
```

## Required manual browser render matrix

1. Render a 3-slide silent video (landscape and portrait); play the exported WebM and confirm all slides appear with expected transitions.
2. Render with audio trimmed from 2s to 6s, without looping. Confirm audio ends after 4s, video duration is unchanged.
3. Render a 20-second video with a 3-second trimmed loop; verify audio remains audible for the intended duration with no gaps.
4. Start a long render and cancel during image processing, recording, and finalization. Confirm no completed output or stuck progress, and that retry works.
5. Switch tabs during rendering. Check final video duration and frame behavior; background-tab throttling may reduce smoothness.
6. Delete the required image/audio blob before rendering. Confirm a descriptive error is shown and no partial output is saved.
7. Render a large batch. Monitor RAM, active browser media tracks and storage usage to detect leaks.

## Required server render matrix

1. Render valid Remotion project and inspect the output with `ffprobe`. Verify codec h264, dimensions, FPS and expected duration.
2. Inject invalid slide duration, invalid dimensions, and a rendering error. Confirm failure and no stray `autopilot-*.mp4` temporary output.
3. Kill a worker in the middle of rendering. Verify interrupted-job artifacts and state are reconciled before resuming. This still needs a startup orphan cleanup policy.
4. Render a series of 10 Autopilot jobs; inspect disk usage before and after.
5. Compare the same design across browser and Remotion: font layout, image crop, transitions, animation start/end frames, and text placement. Record any parity differences.

Suggested probe for one MP4:

```powershell
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of json "path\\to\\video.mp4"
```

## Remaining release gates

- Automated browser MediaRecorder tests with a real Chromium instance and simulated abort.
- Frame-by-frame comparison between Canvas and Remotion, with tolerance thresholds.
- Audio drift measurement via waveform markers and longer recordings.
- Renderer worker interruption recovery, stale temp-file cleanup at startup and disk quota protection.
- Actual output decoding verification rather than only checking byte length and file size.
- Full production-equivalent builds and regression tests.

No live browser, backend build, or Remotion render was executed as part of the GitHub editing session. Do **not** merge the draft PR until tests pass.
