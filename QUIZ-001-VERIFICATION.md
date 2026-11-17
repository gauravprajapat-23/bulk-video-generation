# QUIZ-001 — Football Legends Quiz Template Foundation

**Branch:** `fix/sched-001-atomic-claims` — continue on existing branch, no new PR or merge.

## Implemented

- Reusable strict football quiz schema in `src/lib/footballQuiz.ts`.
- Three question types: `player_clue`, `career_path`, `award`.
- Four distinct MCQ options, required answer key, difficulty, factual explanation, optional clues and user-owned image-asset identifiers.
- CSV ingestion reuses the existing bounded quote-safe parser. Imports allow 5–50 questions and reject duplicate IDs/questions, duplicate/blank options, invalid types/difficulties, missing required columns, invalid countdowns, malformed CSV and oversized payloads.
- 20-question starter CSV: `public/templates/football-legends-quiz-20.csv`. Historical football facts supplied as editable content; publisher must verify rights to any photos, voices and logos before using them.
- Deterministic 1920×1080 / 30fps timeline compiler: intro (18s), entrance (2s), clues (5s), countdown (10s default per item), suspense (3s), reveal (4s), transition (1s), halftime at the midpoint (12s), outro (15s).
- For 20 questions at the default countdown: exactly **545 seconds / 16,350 frames / 9:05**. The compiler creates contiguous segments and does not introduce frame gaps or overlaps.
- Template gallery at `/templates` and Champions Gold editor at `/templates/football-quiz`, both guest accessible.
- Builder supports importing a custom quiz CSV, editing question text, answers, explanation and countdown, selecting the correct answer and exporting validated quiz+timeline JSON.
- Video Templates link in sidebar; no backend authentication required for editor.
- Node/tsx regression tests in `backend/tests/footballQuiz.test.ts`, included by `npm run test:security`.

## Verify locally

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Quiz frontend typecheck failed" }

npm run build
if ($LASTEXITCODE -ne 0) { throw "Quiz frontend build failed" }

cd backend
npm ci
npm run test:security
if ($LASTEXITCODE -ne 0) { throw "Quiz regression failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Backend build failed" }
```

Then run the frontend locally and verify the routes:

1. `/templates` lists Football Legends Quiz.
2. `/templates/football-quiz` loads 20 questions without signing in.
3. The initial compiled runtime is 9:05.
4. Edit a countdown (10s → 20s); runtime increases by 10 seconds.
5. Edit a question and export JSON; the answer and timeline should be present.
6. Import a malformed CSV (duplicate options or missing `correct_option`); editor shows an error and retains the previously valid data.
7. Download the provided CSV and import it back; all 20 questions load.
8. Verify navigation at mobile width and keyboard focus for import, question list and edit controls.
9. Validate that server-protected YouTube scheduling remains authenticated and guest access does not expose other users' media.

## Explicit non-goals in QUIZ-001

- The mock question card in the editor is not an animated video renderer.
- `Export quiz timeline JSON` does **not** render or download a playable MP4.
- Voiceover checkbox records a preference only; audio rendering is planned for QUIZ-004.
- Player photos, silhouette reveal, animation playback, sound effects and MP4 export are intentionally pending.
- Generated JSON is not yet persisted as a dedicated project in the Zustand store; reload resets the editor to sample questions. Preserve edits by downloading the JSON for now.
- The CSV answer keys and explanations are editorial inputs, not independently verified against live provider sources.

## Next milestones

- **QUIZ-002:** Premium 16:9 motion design scenes and question/reveal components, including correct visual typography and positioning.
- **QUIZ-003:** Frame-accurate animation transitions, timer, player reveal, game-show score and halftime animation.
- **QUIZ-004:** Voiceover/TTS, countdown SFX, licensed background music, gain controls and audio synchronization.
- **QUIZ-005:** Remotion MP4 export, guest download handling, progress/cancellation and output integrity.

**Execution note:** Changes made through the GitHub connector; this session has not executed the native Next or backend test suites. Their results must be verified in the user's environment.
