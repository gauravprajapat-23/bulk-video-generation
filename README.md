# Bulk Video Generation

A Next.js + Express video creation application with browser-based editing, CSV bulk generation, Remotion server rendering, PostgreSQL persistence, and Google YouTube publishing.

## Architecture

| Component | Implementation |
| --- | --- |
| Frontend | Next.js 14 / React / Tailwind; browser IndexedDB + Zustand |
| Browser renderer | Canvas + MediaRecorder (typically WebM) |
| Server | Express / TypeScript |
| Server renderer | Remotion (H.264 MP4) |
| Database | PostgreSQL / Neon |
| YouTube | Google browser OAuth and backend OAuth for unattended uploads |
| Scheduled jobs | node-cron with database claims; use only one acknowledged scheduler worker |

**Status:** Release readiness is still subject to security, migration, media, and real publishing tests. Open draft PRs should not be treated as a deployed production release.

## Local development

Use Node.js 20 or later, npm, and a PostgreSQL database. From the repository root:

```powershell
Copy-Item .env.local.example .env.local
Copy-Item backend/.env.example backend/.env
# Edit both files with your own credentials, OAuth settings and local DB URL
npm ci
cd backend
npm ci
npm run dev
```

In a second terminal, from the repository root, start the frontend:

```powershell
npm run dev
```

Open http://localhost:3000. Local browser media stays in IndexedDB; backend media uploads stay in `backend/uploads` unless `MEDIA_STORAGE_DIR` is configured.

## Release validation

From the repository root:

```powershell
npm run check:release
```

The gate runs clean frontend/backend installs, TypeScript validation, frontend build, backend regression tests and backend build. To include dependency audit checks:

```powershell
node scripts/release-gate.mjs --audit
```

For a production-config check, set the real deployment environment variables first, then run:

```powershell
node scripts/release-gate.mjs --production --audit
```

The production preflight validates configuration, not live Google token exchange or actual upload success.

See [REL-001-VERIFICATION.md](REL-001-VERIFICATION.md) for the rollout and smoke-test checklist.

## Production configuration

Backend requires a PostgreSQL connection, unique JWT secret, configured Google OAuth Web client and exact callback, frontend HTTPS origin and exact allowed CORS origins. The backend never shares the Google client secret with the browser.

Backend media must use `MEDIA_STORAGE_DIR`, an **absolute path to durable storage** available to the web process and scheduler. Set `MEDIA_STORAGE_PERSISTENT=true` only after verifying this mount is genuinely durable; this flag is an operator acknowledgement, not an automated filesystem durability guarantee.

Unattended uploads are off by default in production. A dedicated scheduler instance must set:

```text
SCHEDULER_ENABLED=true
SCHEDULER_SINGLE_INSTANCE_ACK=true
```

Other API replicas should set `SCHEDULER_ENABLED=false`. Before running scheduled jobs, validate database migrations, ownership backfill for older media, unresolved upload claims, and duplicate upload records.

See [backend/.env.example](backend/.env.example) and [.env.local.example](.env.local.example) for the exact local variable names.

## Workflows and limitations

CSV-driven bulk generation supports strict bounded import, per-row duration calculation, selective retries and per-job progress. Browser rendering supports cancellation and output validation. Remotion is a separate server renderer and does not yet guarantee pixel-identical output or full audio feature parity.

Server-side YouTube credentials are associated with authenticated application users. Scheduled media retrieval is owner-checked, and conflicting or uncertain publishing outcomes are quarantined for manual reconciliation rather than blindly retried.

**Remaining before public launch:** confirm secure media content validation beyond MIME/extension, storage quotas, appropriate retention, robust token-secret storage and session behavior, end-to-end YouTube tests, timezone and daily quota semantics, and full browser/Remotion audio/visual parity.

## Verification references

- [SEC-001-VERIFICATION.md](SEC-001-VERIFICATION.md): OAuth state and cross-account media access tests
- [SCHED-001-VERIFICATION.md](SCHED-001-VERIFICATION.md): scheduler contention and uncertain-publish reconciliation
- [RENDER-001-VERIFICATION.md](RENDER-001-VERIFICATION.md): render cancellation and export checks
- [RENDER-001-02-VERIFICATION.md](RENDER-001-02-VERIFICATION.md): Chromium, ffprobe, visual parity and recovery
- [BULK-001-VERIFICATION.md](BULK-001-VERIFICATION.md): CSV limits, sparse retries and batch progress
- [REL-001-VERIFICATION.md](REL-001-VERIFICATION.md): production deployment preflight and rollback
