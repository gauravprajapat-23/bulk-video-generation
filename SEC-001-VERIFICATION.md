# SEC-001 — OAuth and Media Access Verification

Status: **draft / blocked pending local and deployed integration tests**. Do not merge based only on static inspection.

## Architecture after this change

- Browser Google login establishes a backend JWT through `POST /api/auth/google-token`.
- `POST /api/auth/google/start` requires that backend JWT, creates an unpredictable 10-minute state, hashes it in `youtube_oauth_states`, and returns a Google authorization URL.
- The Google callback atomically consumes state, retrieves the selected YouTube channel, stores the user-linked OAuth credentials, and redirects with a non-sensitive success/error flag. The old unauthenticated `GET /api/auth/google` endpoint returns 410.
- User video uploads are registered in `uploaded_media`, and direct media delivery checks both JWT identity and stored owner.
- Instant and scheduled YouTube publishing may only read media registered to the user. They never fetch caller-supplied remote URLs.
- Browser previews fetch protected video bytes using an Authorization header, then create/revoke an object URL.

## Required environment variables

Backend runtime:
- `DATABASE_URL`: reachable PostgreSQL database.
- `JWT_SECRET`: unique, randomly generated secret (use >= 32 random bytes); rotate carefully because rotation invalidates existing sessions.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: OAuth Web client credentials, never exposed with `NEXT_PUBLIC_`.
- `GOOGLE_REDIRECT_URI`: exact backend callback URL, e.g. `https://api.example.com/api/auth/google/callback`.
- `FRONTEND_URL`: trusted frontend origin, e.g. `https://app.example.com`.
- `ALLOWED_ORIGINS`: comma-separated trusted frontend origins. Do not use a wildcard.

Frontend runtime:
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: public client ID for interactive browser login.
- `NEXT_PUBLIC_API_BASE_URL`: backend API root, e.g. `https://api.example.com/api`.

Google Cloud OAuth client must list the exact `GOOGLE_REDIRECT_URI` under authorized redirect URIs and frontend origin under authorized JavaScript origins. Verify consent screen scopes for YouTube uploads.

## Local gate

```powershell
git fetch origin
git switch security/sec-001-oauth-media-access
git pull --ff-only origin security/sec-001-oauth-media-access

npm ci
npx tsc --noEmit
npm run build
cd backend
npm ci
npm run check:security
```

Backend integration checks (two different Google accounts / app users, isolated test database, test channels):

1. Confirm `GET /api/auth/google` returns 410; `POST /api/auth/google/start` with no bearer JWT returns 401.
2. Log in as User A; start server OAuth, authorize a test YouTube channel, verify callback redirects without a `token=` query parameter.
3. Reuse the OAuth state: second callback must be rejected. Expired state must be rejected. A new callback must not bind to an arbitrary user ID.
4. Upload a small video as A; A's authorized GET to `/uploads/<filename>` should succeed. Anonymous should get 401, and User B should get 404.
5. A's `/api/youtube/upload` should reject B's filename and a URL to `169.254.169.254`; it should accept A's registered media, with network publishing only to a disposable test channel.
6. Create an upload schedule pointing to A's registered video and verify the worker uses the proper YouTube refresh token. Verify unknown and older unregistered media fail closed.
7. Verify browser server-schedule Preview works, can close, and revokes object URLs on unmount; verify no JWT appears in any URL.
8. Restart the backend and verify data persists. Ensure uploads are stored on a persistent disk shared with the scheduler. Ephemeral instance files will not work for scheduled publishing.
9. Verify health: `GET /api/health/ready` returns 200 when DB connected, 503 when DB unavailable.
10. Verify no production credentials were committed. Check deployment logs for token and video-data leakage.

**Known deployment blockers / follow-ups:**
- Older media lacks `uploaded_media` ownership metadata: re-upload or backfill only from trusted owner records.
- The filesystem-backed storage model requires persistent shared storage. For scalable deployment, replace it with private object storage and signed, owner-checked streaming.
- The uploader presently trusts file extensions and MIME declarations; implement content signature sniffing, bandwidth limits, retention, and storage quotas.
- End-to-end YouTube publishing and cross-user DB tests require a configured test environment and have not been run by the repository-editing session.
- SEC-001 does not include SCHED-001 atomic job claims; do not run multiple scheduler replicas before that milestone.
