# Full Code Audit — Video Maker / bulk-video-generation
**Date:** 2026-11-22
**Branch:** `fix/sched-001-atomic-claims`
**Draft PR:** #2, base `security/sec-001-oauth-media-access`
**Audit basis:** GitHub connector source inspection of authentication, user-owned media, upload/video scheduling, Autopilot, quiz worker, Remotion, studio profiles, TTS, verification/evidence, frontend scheduling, key release scripts and tests. This is a risk-focused source audit, not an independently executed line-by-line proof of every dependency or UI component.

## Source fixes committed in this audit

| Priority | Finding | Source change | Status |
|---|---|---|---|
| P0 | OAuth connection recorded requested scopes, not what Google actually granted | `backend/src/routes/auth.ts` now derives stored scopes from returned `tokens.scope`; upload permission must be present | Fixed in source; reconnect/live test required |
| P0 | Google userinfo access token not bound to the app's authorized OAuth client | `googleTokenGrant.ts` and auth route validate Google's token introspection client identity, expiry and email scope; user ID consistency and verified email also checked | Fixed in source; live Google token test required |
| P1 | Login token exchange lacked an abuse guard | `loginRateLimit.ts` limits per-process attempts and bounds memory | Mitigated; distributed gateway/IP rate limits still required |
| P0 | YouTube uploader loaded up to 500MB per request into Node memory | `resolveOwnedVideoFile` + `createReadStream` for server uploads and scheduled uploads; Autopilot passes MP4 file path directly | Fixed in source; large-file streaming test required |
| P1 | Uploaded video trusted extension and declared MIME | Upload endpoint now checks MP4/MOV/WebM/AVI container magic and uses CSPRNG filenames | Partially fixed; proper media probing, AV scanning and disk quotas outstanding |
| P0 | Multi-channel scheduled uploads picked most recently connected channel | Client now pins server-authorized channel ID; schedule creation validates ownership; uploader refuses ambiguous default | Fixed in source; multi-channel integration test required |
| P1 | Direct YouTube upload could silently target the latest of multiple channels | Explicit `channelId` accepted; ambiguous routes now reject; request metadata validated | Fixed in source; direct upload UI selection may need follow-up |
| P0 | Legacy Autopilot defaulted to public upload | New database default private; worker requires explicit `AUTOPILOT_PUBLIC_UPLOAD_ENABLED=true` for unattended public videos | Fixed for new jobs; existing channel preferences still need review |
| P0 | Legacy Autopilot could allocate excessive native Canvas/MP4 resources from untrusted config | Added `autopilotBounds.ts` with resolution, page/element, CSV row/cell, finite coordinate, duration and daily batch caps | Fixed in source; load test required |
| P1 | Legacy Autopilot used host-local time instead of configured IANA timezone | Added `autopilotTiming.ts` for timezone-based slot comparison with DST-safe duplicate suppression and fail-closed invalid zones | Fixed in source; schedule simulation test required |
| P2 | No-body API requests could throw before validation | Auth, scheduling, YouTube, Autopilot route handlers default to empty request body | Fixed in source |
| P1 | Google login errors revealed raw provider messages | Authentication returns generic failures while preserving server-side error logs | Fixed in source |
| P1 | User-facing production safety depended on static source checks only | Added regression tests for permission grants, login throttling, streamed uploads, channel pinning, Autopilot workload, and timezone | Tests committed; run pending |

## Regression files

- `backend/tests/auditHardening.test.ts`
- `backend/tests/auditSecurityRegression.test.ts`
- `backend/tests/autopilotTimingAudit.test.ts`
- `backend/tests/googleTokenGrantAudit.test.ts`

## Remaining blockers — DO NOT mark production ready

### P0 — Vulnerable dependencies
The user's earlier `npm ci` reported 19 advisories (8 moderate, 10 high, 1 critical). No current `npm audit --json` report was available to attribute the exact installed transitive versions or make safe upgrades. **Not fixed.** Run `npm run accept:audit` and review the complete report before updating `package-lock.json`; do not blindly force major-version upgrades.

### P0 — Live provider tests
End-to-end Google consent, access-token introspection, refreshed OAuth scopes, a 5Q/20Q Remotion render, timed TTS, licensed music and the intended **private** YouTube channel upload are not exercised by source inspection. Keep YouTube publication disabled until staging proves ownership and no duplicate uploads.

### P0 — Worker recovery / external idempotency
An expired pre-upload job can retry under an opt-in lease policy. Ambiguous YouTube uploads cannot be treated as transactional and remain `needs_review`. Missing: real concurrent-worker fault injection, lease expiration/race testing, durable cloud worker pool, operator reconciliation UI for all unresolved states and resumable upload IDs. Retrying uncertain uploads may duplicate videos.

### P1 — Content correctness
The Wikipedia title/snippet search is candidate corroboration, **not factual entailment**. Model-generated trivia questions must not be labeled independently fact-checked. Multi-source corroboration and human sign-off remain required before public publishing.

### P1 — Media and rights security
MP3/WAV licensed-music storage is private and checks file hashes, declared rights, expiry and revocation, but there is no complete binary malware/codec scanner, commercial rights adjudication, object-store lifecycle or quota system. Video uploads now check container signatures, but these alone do not prove the entire media stream is valid. Images/video licensing and attribution pipeline remains incomplete.

### P1 — Abusive workloads and multi-instance limits
New in-memory login throttling cannot substitute for shared production rate limits across replicas. Guest renders, Autopilot configuration creation, stored media volume, native render concurrency, TTS spending, and per-user CPU budgets still need explicit account/server quotas, monitoring and alerting.

### P1 — Quality and UX
Automated MP4 tests check codec, FPS, dimensions, duration, audio stream, and optionally several frame brightness samples and loudness. They do not detect clipped answer text, factual contradictions, voice mispronunciation, visual flicker, bad transitions, or upload processing failures. Existing quiz composition remains a 16:9 long-form timeline; it should not be advertised as Shorts-ready output without a dedicated 9:16 composition.

### P2 — API and operational debt
Legacy configuration endpoints accept broad JSON updates (subject to the runtime render gate); strict per-field schema validation, centralized error handling, operator-driven reconciliation and audit logging should be added. Rate limiting should be implemented at gateway/shared datastore. Legacy authenticated routes should have real HTTP integration tests, not only static regex assertions.

## Test commands (Windows PowerShell)

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend TypeScript error" }
npm run lint
if ($LASTEXITCODE -ne 0) { throw "Frontend lint error" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend production build error" }

cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend compile/test/build failure" }

$reportDir=Join-Path $env:USERPROFILE "video-maker-acceptance"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
npm run accept:audit -- --output (Join-Path $reportDir "backend-audit.json")
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Dependency audit found release-blocking vulnerabilities. Inspect report."
}
```

Then run the offline 5Q/20Q Remotion MP4 commands from `AUTO-QUIZ-06-ACCEPTANCE.md`. Only after these pass, run staging DB checks and real private test-channel upload. **Do not** enable `QUIZ_STUDIO_PUBLICATION_ENABLED=true` or `AUTOPILOT_PUBLIC_UPLOAD_ENABLED=true` in production yet.

## Audit decision

**Source hardening delivered; release remains BLOCKED.** The repo cannot be cloned/executed from the current tool runtime because `github.com` DNS is unavailable; GitHub connector source writes are committed but neither newly added tests nor real provider workflows have been executed. Continue by running the Windows commands, supplying the exact audit/build output, and resolving findings against observed results before merging draft PR #2.
