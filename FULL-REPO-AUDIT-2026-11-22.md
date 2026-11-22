# Full Repository Source Audit — November 22, 2026

**Repository:** gauravprajapat-23/bulk-video-generation
**Audit branch:** `fix/sched-001-atomic-claims`
**PR:** #2 (draft, unmerged)

**Scope:** authenticated backend Google and YouTube operations, legacy Autopilot, new quiz studio, scheduler, owned uploads, CSV parsing and Remotion paths, UI client interactions and acceptance tooling. This is an **inspection and source-hardening pass**, not a claim of complete runtime verification or an authorized external penetration test.

## High-priority source fixes committed

| Area | Finding | Source remediation |
|---|---|---|
| OAuth authorization | Original callback recorded requested YouTube scopes as though Google had actually granted them | Store granted `tokens.scope` values; fail closed when YouTube upload scope is absent; Google public sign-in requires verified email |
| Google identity login | Arbitrary Google access tokens needed client-ID binding | Token introspection checks authorized OAuth client, positive expiry, userinfo.email scope and subject match; best-effort bounded sign-in attempt throttle added. Requires distributed rate limit for multi-instance deployment |
| Scheduled uploads | Legacy scheduler chose most-recently-connected YouTube channel, potentially targeting wrong account | New schedules bind owner-verified `metadata.channelId`; uploader uses `targetChannelId`; ambiguous multi-channel fallback refuses upload |
| Schedule editing | Client could PATCH entire metadata JSON without revalidating channel ownership | Reject metadata edits; authorize new schedule at creation; validate updated schedule date |
| Media uploads | Extensions/MIME labels alone were used to recognize videos; filenames were low-entropy | Store randomized names and inspect MP4/MOV, WebM and AVI container signatures before registering ownership |
| Large uploads | YouTube forwarder and older Autopilot loaded whole large MP4 buffers into Node.js memory | Validate owned file size/ownership and stream from disk instead of buffering |
| Legacy Autopilot safety | Unbounded user-controlled canvas dimensions/page counts/CSV data could exhaust CPU or RAM | Check pixel area, page/element count and CSV text/row bounds before rendering |
| Unattended public upload | Autopilot defaulted to public when visibility was missing | Private by default for new records, gated public upload opt-in with `AUTOPILOT_PUBLIC_UPLOAD_ENABLED=true` |
| Route inputs/errors | Some routes accepted malformed metadata or returned detailed upstream failures | Validate YouTube upload metadata, future schedule time and public error responses |
| Regression coverage | Source safety contracts were not represented in tests | Added `backend/tests/auditHardening.test.ts` and `backend/tests/auditSecurityControls.test.ts` |

The existing AUTO-QUIZ-01–06 release gate intentionally remains conservative: automated quiz videos initially upload privately/unlisted, creator approval and publication confirmation are separate, and ambiguous provider outcomes require manual reconciliation.

## Unresolved risks / launch blockers

1. **Dependency advisories:** Prior local `npm ci` reported **19 total vulnerabilities**, including 10 high and 1 critical; this is an older report, not a new dependency scan. Obtain fresh `npm run accept:audit -- --output <absolute-path>` and investigate actual affected dependency paths/patch versions. Do not blindly force major upgrades.
2. **No live acceptance:** Run fresh frontend/backend typecheck, unit tests, Next.js build, actual 5- and 20-question Remotion exports, FFmpeg frame/audio analysis, staging database migration and a private YouTube test-channel upload. Source changes have not been executed in the connector environment.
3. **Legacy Autopilot concurrency:** Active DB claim prevents simultaneous execution, but reliable worker-level cancellation, execution-time CPU quotas and deterministic provider reconciliation are not fully implemented. Audit and test restart/crash scenarios.
4. **Legacy schedule metadata:** Existing schedules created *before channel pinning* can lack `channelId`. These should be reconciled against the intended account before upload; with multiple connected channels, the uploader now refuses an ambiguous choice.
5. **Rate limiting:** In-process login throttle is best effort, not distributed and does not replace gateway/WAF controls for a multi-instance deployment.
6. **Asset inspection:** Container signatures reduce spoofing, not malware or decompression-bomb risks. Real transcoding/probe validation, codec limits, byte quotas, and private asset lifecycle management remain.
7. **Factual verification:** Wikipedia snippets are evidence candidates, not independently entailed and cross-validated trivia facts. Always require creator review; do not market the pipeline as independently fact-checked.
8. **Media rights:** Licensed music records are creator declarations, not verified intellectual-property ownership; video/image licenses, expiry proofs and rights disputes need a documented review path.
9. **OAuth data at rest:** Stored refresh tokens require encrypted secrets management, access controls, database retention/removal controls and production log review.
10. **Quiz worker leases:** 90-second claim and 30-second heartbeat are improvements, not a fully fenced distributed executor with safe recovery at every external side-effect. Never automatically replay uncertain YouTube uploads.

## Local verification (PowerShell, from repository root)

```powershell
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims
npm ci
npx tsc --noEmit
npm run lint
npm run build
cd backend
npm ci
npm run check:security
if ($LASTEXITCODE -ne 0) { throw "Backend gate failed" }
$reportDir=Join-Path $env:USERPROFILE "video-maker-acceptance"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
npm run accept:audit -- --output (Join-Path $reportDir "backend-audit.json")
```

Run `npm run accept:quiz -- --questions 5 --output-dir <absolute-dir> --audio-qa --frame-qa` and then 20 on a host with FFmpeg/Remotion before any live upload. For database acceptance, use only non-production credentials and run `npm run accept:db` under the documented staging acknowledgement. Confirm any Google OAuth reauthorization with a designated test account.

**Release decision:** Keep PR #2 draft; production publishing, public autopilot, broad scheduling and automatic recovery OFF until staging evidence and security advisories are addressed.
