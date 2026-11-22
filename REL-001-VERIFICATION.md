# REL-001 — Production Release Gate and Rollout Checklist

**State:** Code and automated checks committed. Production deployment NOT approved until runtime tests and configuration checks pass. Work is on existing `fix/sched-001-atomic-claims` branch.

## What REL-001 adds

- A reproducible root `npm run check:release` gate that performs clean installs, frontend TypeScript/build, backend typecheck/regression suite/build.
- Optional `node scripts/release-gate.mjs --audit` dependency checks with `npm audit --omit=dev --audit-level=high`.
- Optional `node scripts/release-gate.mjs --production --audit` checks the production environment against `backend/src/releaseConfig.ts` before deployment.
- Backend production startup blocks missing PostgreSQL, JWT/Google OAuth credentials, non-HTTPS/wildcard CORS, missing durable-media acknowledgement, or an unacknowledged scheduler.
- Production startup aborts if database schema verification fails, rather than serving an apparently healthy API with disabled jobs.
- `GET /api/health/ready` now checks live PostgreSQL connectivity.
- All backend media access paths use the same configured `MEDIA_STORAGE_DIR`, preventing the upload API and scheduler from disagreeing about file locations.
- Updated README, environment template, and `.gitignore` to prevent accidentally committing generated media and credentials.
- `backend/tests/releaseConfig.test.ts` checks secure and insecure configuration scenarios.

## Step 1: Verify on Windows locally

```powershell
cd "C:\Users\RSP.tech Solution\Desktop\video-maker-frontend"
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims
npm run check:release
if ($LASTEXITCODE -ne 0) { throw "REL-001 release gate failed" }
```

`check:release` is **not** a declaration that production secrets and storage are configured. It validates builds and regression tests, not Google or YouTube availability. Consider `node scripts/release-gate.mjs --audit` separately to detect high-severity advisories before release.

## Step 2: Production configuration

Use a secrets manager, not committed files. Configure:

| Variable | Meaning |
| --- | --- |
| `NODE_ENV=production` | Enables strict production startup |
| `DATABASE_URL` | PostgreSQL URL with TLS |
| `JWT_SECRET` | Strong unique random signing secret, minimum 32 characters |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Server-side Google OAuth client |
| `GOOGLE_REDIRECT_URI` | Exact `https://<API>/api/auth/google/callback` |
| `FRONTEND_URL` | HTTPS frontend URL |
| `ALLOWED_ORIGINS` | Explicit comma-separated HTTPS origins, no wildcards |
| `MEDIA_STORAGE_DIR` | Absolute path to a durable mount shared by relevant instances |
| `MEDIA_STORAGE_PERSISTENT=true` | Explicit operator acknowledgement after checking mount durability |
| `SCHEDULER_ENABLED` | `true` only on the dedicated scheduler process; `false` on API-only replicas |
| `SCHEDULER_SINGLE_INSTANCE_ACK=true` | Required when enabling scheduler until multi-replica scheduling gate is validated |

Frontend: `NEXT_PUBLIC_API_BASE_URL` must be the HTTPS API prefix ending in `/api`, and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must be the **public** browser OAuth client ID. Never put Google client secrets or signing secrets into `NEXT_PUBLIC_*` variables.

Set the runtime variables and execute `cd backend; npm run preflight:release`. The preflight never logs secret values.

**Durability is not verified by the acknowledgement flag.** Test that uploaded media survives an application restart and is readable from the scheduled-upload worker. A single-container ephemeral disk is not sufficient for unattended publishing.

## Step 3: Database upgrade

The existing application uses `ensureTables()` on startup rather than versioned migrations. **Back up the database first** and review schema changes before deploying. Check for duplicate historical uploads before creating the unique schedule index:

```sql
SELECT schedule_id, count(*)
FROM youtube_uploads
WHERE schedule_id IS NOT NULL
GROUP BY schedule_id
HAVING count(*) > 1;
```

Resolve duplicates by comparing real YouTube records; do not delete blindly. Existing uploads without an `uploaded_media` ownership record require trusted backfill or re-upload. Verify schema initialization against a restored staging copy before production.

## Step 4: Controlled smoke tests

1. Start one backend with `SCHEDULER_ENABLED=false`; verify `/api/health` and `/api/health/ready` both return 200.
2. Disconnect the database in staging; verify readiness returns 503, and a newly started production backend refuses to boot.
3. Confirm local/browser Google sign-in, server OAuth, refresh-token persistence and callback replay protections.
4. Upload a test file as User A and ensure User B cannot retrieve it.
5. Restart the API and verify the file still exists on the intended persistent mount.
6. Start **one** dedicated scheduler only, using a disposable YouTube channel. Submit one media job and verify exactly one published video.
7. Test one cancelled render, one malformed CSV and a 10,000-row bounded CSV import.
8. Check background tasks, render temp cleanup, jobs needing reconciliation, logs, and both frontend/backend build artifacts.
9. Verify `NEXT_PUBLIC_API_BASE_URL` has the correct HTTPS API prefix and no backend private key is included in frontend JS.
10. Check `npm audit` output and review release dependencies for known advisories.

## Rollback and recovery

- Disable scheduled jobs first by setting `SCHEDULER_ENABLED=false`, then restart that worker.
- Do not automatically requeue `processing`/`needs_review` uploads; verify provider state first.
- Restore the last-known-good app containers and configuration. A database rollback must use a reviewed, compatible backup; additive schema changes can make older code incompatible.
- Keep uploaded media on its persistent mount during application rollback.
- If OAuth credentials are suspected compromised, rotate/revoke them and evaluate impact before reconnecting channels.

## Remaining blockers

- Current disk uploads still rely on extension/client MIME rules; add magic-byte verification, per-user quotas, expiration policy and upload scanning.
- `ensureTables()` is not a transactional, versioned migration system. Production adoption needs audited schema migrations and rollback strategy.
- Scheduler timezone and daily quota correctness need end-to-end tests. YouTube publishing is not transactionally exactly once.
- Browser-versus-Remotion audio/visual parity, multiple-worker behavior and large render performance must be validated.
- Client-held tokens and API secrets need further hardening before multi-tenant public deployment.
- **No local production-config check, runtime integration test or dependency audit was run by the GitHub-editing session.** User-reported earlier tests do not automatically cover newly added release checks.

The draft pull requests and `main` remain unchanged until verification/merge.
