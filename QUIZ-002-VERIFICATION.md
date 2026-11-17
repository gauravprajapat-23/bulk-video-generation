# QUIZ-002 — Champions Gold Premium Visual Scenes

**Branch:** `fix/sched-001-atomic-claims` — existing stacked draft PR #2; no new branch or merge.

## Implemented

- `src/components/quiz/ChampionsGoldScene.tsx`: a reusable responsive **16:9 stadium scene** with dark navy field, two angled gold spotlights, title/half-time/outro screens, player mystery silhouette, question card, clues, four answer options, 10-second countdown bar and highlighted green answer reveal.
- No hotlinked images, logos or unauthorized football-player photographs. Until the licensed player-image system is introduced, the reveal displays a generic silhouette with a gold star and text explanation, **not a player image**.
- Scene state is received from the timeline (`phase`, `progress`, `remainingSeconds`), not from independently running timers. No answer highlight before the reveal or transition segment.
- CSS motion polish: slow stadium light sweep, question entrance, reveal fade/slide and reveal glow. Explicit reduced-motion media-query support.
- `src/lib/footballQuizPlayback.ts`: validated frame lookup using binary search; returns the exact phase, question index, local frame, normalized progress and seconds remaining. Scrubbing clamps to [0, totalFrames-1].
- `src/app/templates/football-quiz/page.tsx`: replaced the static design card with reusable Champions Gold frame-driven preview. Play/pause, restart, seek slider, current time/total duration, jump to specific question.
- `backend/tests/footballQuizPlayback.test.ts`: phase-boundary, countdown, reveal, halftime and seek regression coverage. Included in existing `npm run test:security` glob.

## Verify

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "QUIZ-002 TypeScript typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "QUIZ-002 frontend build failed" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "QUIZ-002 backend regression failed" }
```

Then start `npm run dev` in the frontend and visit `http://localhost:3000/templates/football-quiz` (guest mode works).

### Visual and interaction QA

1. Verify stadium scene maintains 16:9 aspect ratio at desktop (1440px), tablet (768px), and mobile (375px). Title and answer text should not be clipped.
2. Scrub to 00:00 (intro), 00:18 (question 1 entrance), 00:25 (question 1 countdown), 00:35 (suspense), 00:38 (reveal), and 04:28 (halftime).
3. Ensure green correct-answer highlight and explanation **do not appear** in clues/countdown/suspense.
4. Verify changing a question's text/options or answer key updates the scene without losing timeline position; editing countdown changes total duration.
5. Click a question in the left column and ensure the playhead jumps to that question's entrance.
6. Play/pause/restart and scrub while paused. Playback should not reset unexpectedly.
7. Check browser DevTools console for uncaught errors and test `prefers-reduced-motion: reduce`.
8. Confirm browser preview has no sound and **cannot be mistaken for a completed MP4 render**.
9. Check whether long question text and four 120-character answer choices fit within the 16:9 export-safe area. Fine-tune fonts in QUIZ-003 after actual screenshot review.

## Limitations / next step

- QUIZ-002 implements **interactive browser visualization and style polish**. Some CSS motion is time-based; its micro-transitions are not yet synchronized to exact video-export frames. QUIZ-003 will implement deterministic animation interpolation/easing and a unified playback/export scene contract.
- Real player portraits, silhouette-to-photo reveal and club logos require properly licensed/user-supplied media; no placeholders imply real player likeness.
- No background music, TTS, sound effects, narration ducking or MP4 output in this milestone.
- The preview renders in the browser; it **does not** produce a video file. QUIZ-005 will own long-form Remotion MP4 rendering, cancellation and output verification.
- Native tests/build and browser screenshot checks have **not been executed** in the GitHub connector session. The user must run the local verification commands.

**Next milestone:** QUIZ-003 — Render-timeline animation parity: deterministic entrances, countdown circle, light sweep, gold-to-green answer reveal, halftime graphic, state transitions and browser/Remotion frame alignment.
