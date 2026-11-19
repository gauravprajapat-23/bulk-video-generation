# AUTO-QUIZ-02 — Channel-Aware Autonomous Content Studio

**Branch:** `fix/sched-001-atomic-claims`. Existing **draft** PR #2; no merge, GitHub Actions, or native render/upload executed.

## Delivered

- Channel-level persistent profiles: selected authorized YouTube channel, audience niche, topic, 5–20 questions, template, daily/weekdays cadence, UTC HH:MM time, and publication review policy.
- Four branded quiz render variants: `football_gold`, `general_trivia`, `science_lab`, `history_archive`. All share the existing 1920×1080, 30fps quiz composition; these are theme/wording variants **not** entirely independent video genres, and currently use the same stadium-style background.
- `POST /api/quiz-automation/profiles`: create/update channel profile (one per user+channel), validates required OAuth refresh token. `GET /profiles`, `PATCH /profiles/:id/state`: owner-scoped listing and enable/pause. Enabling requires AI credentials and the explicit recurring-scheduler env switch.
- Every minute, the existing operator-enabled scheduler examines the matching UTC slot. A PostgreSQL unique index on `(profile_id,scheduled_slot)` makes duplicate slot creation impossible, even if multiple schedulers race. The scheduler limits each user to at most one queued/in-flight/unresolved job and no more than three submissions per rolling 24 hours.
- Scheduled profile videos are uploaded **private** by default, or **unlisted** only if the channel owner explicitly chooses it. Public automated publishing is deliberately not implemented.
- AI generates a new 5–20 question quiz for each slot; before Remotion consumes resources, structural checks reject obvious repeated/short question or explanation content. The check result is saved as `quality_report`. **This is not external factual verification**; owners still need to review claims before public release.
- Safe generated metadata: bounded title, description and basic niche tags.
- Existing CSV/manual jobs still work. The new recurrence is AI-only; an unchanged CSV cannot safely produce original daily content by itself.
- Interrupted in-flight jobs older than two hours are moved to `needs_review` for owner/operator reconciliation; they are never blindly requeued, avoiding duplicate YouTube uploads.
- New studio controls live at `/autopilot/quiz`: create/update profile, choose template and schedule, choose review visibility, enable/pause, view existing jobs and progress.
- Focused tests: `backend/tests/quizStudioPolicy.test.ts` and `backend/tests/quizStudioWiring.test.ts`.

## Local verification

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
if ($LASTEXITCODE -ne 0) { throw "Backend tests/build failed" }
```

Start backend in a **development** environment with configured database and connected test YouTube channel:

```powershell
$env:QUIZ_AUTOMATION_ENABLED = "true"
$env:QUIZ_STUDIO_SCHEDULING_ENABLED = "true"
# Configure an actual server-side OPENAI_API_KEY separately.
npm run dev
```

Production automation additionally requires the existing `SCHEDULER_ENABLED=true` and `SCHEDULER_SINGLE_INSTANCE_ACK=true`, plus validated distributed protection and an explicitly dedicated worker. Do **not** enable automated production jobs just to test the UI.

## Acceptance checks

1. Verify backend DB migration creates `quiz_studio_profiles` and `quiz_automation_jobs.profile_id`, `.scheduled_slot`, `.template_key`, and `.quality_report`.
2. Sign in and authorize one **test** YouTube channel with backend refresh token; create a disabled general trivia profile.
3. Set schedule one minute ahead in UTC (not Indian local time); enable it and verify one queued job is created when the slot occurs.
4. Repeat scheduler invocation within the same minute or use concurrent processes; unique slot index must prevent duplicate creation.
5. Confirm only the owning user can see/modify their profile and that changing `channel_id` to an unauthorized account is rejected.
6. Verify 5-question AI quiz generation, content gate, frame composition and renderer integrity; inspect the result in YouTube Studio while **private**.
7. Enable `science_lab` and `history_archive` in separate test runs: verify branded header/outro and no football-exclusive copy. Existing four-choice question mechanics remain shared.
8. Pause a profile before its next UTC slot; confirm no job is created. Switch from daily to weekdays and verify no Saturday/Sunday UTC run.
9. Simulate AI returning duplicate/malformed content; the job should fail before rendering or uploading.
10. Simulate an ambiguous YouTube upload result, process crash, or interrupted render: no automatic duplicate retry; the job must remain `needs_review` until manually reconciled.
11. Check that no profile can request automatic `public` upload, and that `unlisted` is selected only by the channel owner.
12. Verify video assets, content accuracy, rights, quality, and actual YouTube metadata. Do not assume AI text has been independently verified.

## Known limitations / next release gates

- **Fact-checking:** structural QA only. Model-generated facts may be wrong; independent retrieval/citation verification and confidence-aware review must be added before considering autopublish.
- **Templates:** four title/branding variants, not fully different art directions or video genres. Shared quiz layout remains.
- **Audio:** synthesized effects are available, but automatic professional TTS, voice matching and music licensing are not integrated into recurring jobs.
- **Scheduling:** UTC-based only. Creator timezone and DST-aware calendar scheduling remain future work.
- **Scale:** process worker and database polling are not a distributed leased job system. Long renders need durable heartbeats and bounded resource quotas.
- **Review:** private/unlisted uploads require the owner to review in YouTube Studio; in-app content approval and post-review publishing APIs are not yet integrated.
- **Reliability:** manual reconciliation UI for `needs_review` is still required, and production job concurrency/security gates remain incomplete.
- **Testing:** this commit was authored through the GitHub connector; native TypeScript/build/database, rendering and actual YouTube uploads have not been run here.

**Next recommended milestone:** AUTO-QUIZ-03 — AI factual verification, professional TTS + media assets, creator approval queue, review-to-publish integration, and durable worker observability. Keep autonomous public publishing off until those gates are met.
