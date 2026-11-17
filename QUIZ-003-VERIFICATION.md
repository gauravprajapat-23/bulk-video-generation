# QUIZ-003 — Advanced Animation & Reveal Engine

**Status:** Implemented on existing `fix/sched-001-atomic-claims` branch. Local build, browser screenshots and native tests remain unverified.

## Implemented

- `src/lib/footballQuizMotion.ts`: pure, deterministic phase-to-motion interpolator. It receives the compiler's phase and normalized frame progress, returning exact opacity, scale, offsets, spotlight positions, suspense intensity, circular timer fraction, urgency state and reveal visibility. No timers, DOM access, randomness or independently advancing animation clocks.
- `src/components/quiz/ChampionsGoldScene.tsx`: frame-driven entrance fade/slide, gold spotlight sweep, circular SVG timer with red final 3 seconds, synchronized countdown bar, suspense glow, answer reveal with green highlighting and incorrect-answer dimming, deterministic title/halftime/outro entrance.
- `src/app/globals.css`: removed previous continuous CSS animation clocks from quiz scenes. All quiz scene motion is now controlled by the requested frame; CSS effects cannot drift from scrubbing or export seeking.
- `src/app/templates/football-quiz/page.tsx`: preview loop now computes frame offset from elapsed performance timestamps and compiled FPS, not accumulated capped `requestAnimationFrame` deltas. Pauses on tab hide, no React state update inside another state updater.
- `backend/tests/footballQuizMotion.test.ts`: regression coverage for the opening frame, entrance easing, reveal visibility boundaries, 10-second circular countdown and urgency threshold, finite interpolation, and deterministic repeated motion calls.
- Existing `backend/tests/footballQuizPlayback.test.ts` checks timeline phase boundaries independently.

## Timing contract

For the default 20-question set, the complete video remains **9:05** / 16,350 frames at 30fps.

First question frame intervals (end exclusive):

| Segment | Start | End |
|---|---:|---:|
| Entrance | 540 | 600 |
| Clues | 600 | 750 |
| Countdown | 750 | 1050 |
| Suspense | 1050 | 1140 |
| Reveal | 1140 | 1260 |
| Transition | 1260 | 1290 |

The correct answer is not highlighted and its explanation is not rendered before frame **1140**. At the first reveal frame, opacity is 0 and subsequently interpolates toward 1.

## Verification (PowerShell)

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "QUIZ-003 frontend typecheck failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "QUIZ-003 frontend build failed" }

cd backend
npm ci
npm run test:security
if ($LASTEXITCODE -ne 0) { throw "QUIZ-003 regression gate failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "QUIZ-003 backend build failed" }
```

## Manual scene QA

Run `npm run dev` from frontend and open `http://localhost:3000/templates/football-quiz`.

1. Seek to **00:25**: circular timer should show 10 and be full. Seek to **00:32**: it should show 3 and turn red.
2. Seek to **00:35**: suspense state shows gold pulse, with neither answer highlight nor explanation.
3. Seek to **00:38**: correct option switches to reveal styling and explanation begins fading in; seek forward through 00:42.
4. Seek back to 00:34, then 00:38, then back to 00:34: no stale reveal visuals and no independent light sweep drift.
5. Seek to **04:28**: halftime card displays independently of question answer state.
6. Play, pause, restart, navigate away and back; switching tabs should pause rather than skip an unknown portion of content.
7. Test Chrome browser at 375px and 1440px viewport; verify no title/answer/timer clipping.
8. Capture screenshots at selected frames; compare the same frame after a seek-back and page reload.
9. Verify empty/corrupt question input blocks export and unchanged guest access does not unlock backend APIs.

## Limitations

- QUIZ-003 aligns **motion parameters** to the shared frame timeline for eventual reuse by a Remotion component. It does not integrate an actual Remotion composition or demonstrate exported-frame pixel parity. That must be verified during QUIZ-005.
- Player identity art still uses a generic silhouette/star; no fake/unlicensed player photograph is inserted.
- Answer reveal is controlled deterministically, but TTS/music and soundtrack timeline are not yet implemented.
- Final video encoding, playable MP4, output integrity and download remain QUIZ-005 work.
- No native test execution or screenshots performed in GitHub editing session. Verify locally before merging/deploying.

**Next:** QUIZ-004 — narration/SFX/music with explicit audio timeline and ducking, followed by QUIZ-005 long-form MP4 rendering and visual parity gates.
