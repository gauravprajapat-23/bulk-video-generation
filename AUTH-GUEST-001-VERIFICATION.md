# AUTH-GUEST-001 — Optional Google Sign-in and Guest Video Creation

Status: **Changes committed; local browser and Google authorization verification required.**
Branch: `fix/sched-001-atomic-claims` (existing branch and draft PR #2).

## Root cause

The previous login page constructed an old implicit OAuth URL:

`https://accounts.google.com/o/oauth2/v2/auth?...&redirect_uri=http://localhost:3000/login&response_type=token`

Google returned `redirect_uri_mismatch` because the redirect wasn't registered.
It also requested full YouTube upload scopes simply for app sign-in, unnecessarily coupling login to channel authorization.

## Implemented changes

- Login uses Google Identity Services **popup token client**, requests only `userinfo.email` and `userinfo.profile`, and sends the resulting access token to the existing backend `POST /api/auth/google-token` endpoint. No implicit URL fragment, no redirect to `/login`, no YouTube upload permission for login.
- Guests can open the dashboard, image editor, audio library, create-video editor, bulk video generator, render queue and browser download features **without a backend token**.
- Guest-mode selection goes directly to `/create`; sidebar and landing clearly communicate optional authentication.
- **Authenticated server endpoints remain protected.** This does not grant anonymous access to another user's media, server-side YouTube tokens, upload schedule or Autopilot API.
- Guest data is local to the current browser: Zustand metadata in localStorage and media in IndexedDB. There is currently **no automatic account sync**; signing in does not upload local projects to a server.

## Google Cloud Console setup for login

1. Open Google Cloud Console > APIs & Services > Credentials.
2. Select the OAuth 2.0 **Web application** client matching `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
3. Add the exact **Authorized JavaScript origins** used by the frontend:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000` (only if actually using this host)
   - `https://your-frontend-domain.example` (replace with the real deployed domain)
4. Do **not** add `/login` as the redirect for the new browser login. This uses Google Identity Services popup token flow, which relies on authorized JavaScript origin.
5. For unattended YouTube OAuth on the Express backend, register the **Authorized redirect URI** separately:
   - local: `http://localhost:4000/api/auth/google/callback`
   - production: `https://your-api-domain.example/api/auth/google/callback`
   The value must match backend `GOOGLE_REDIRECT_URI` **exactly**, including scheme, port and path.
6. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`, the backend's OAuth client ID/secret/redirect in `backend/.env`, then restart the affected development servers. Production values must be configured in deployment secrets/environment too.
7. If Google displays `access blocked`, ensure the OAuth consent screen is configured and the account is authorized as a test user if the app is in Testing mode.

A JavaScript origin is **not** a redirect URI. Registering one does not automatically authorize the other. The Google OAuth client ID is public, but the backend client secret must remain private.

## Local smoke test

From repository root:

```powershell
git fetch origin
git switch fix/sched-001-atomic-claims
git pull --ff-only origin fix/sched-001-atomic-claims

npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { throw "Frontend TypeScript check failed" }
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }
```

For guest browser smoke, in terminal A run `npm run dev`. In terminal B:

```powershell
npm install --no-save playwright
npx playwright install chromium
node scripts/guest-flow-smoke.mjs
```

The smoke checks no-login access to `/dashboard`, `/create`, `/queue`, the guest login CTA, and absence of an app bearer token. It does not require Google credentials.

## Manual E2E checklist

1. Open an incognito browser with no local data and navigate directly to `/create`. No redirect to login.
2. Upload images, edit, render video and download WebM. Check it is playable.
3. Reload the dashboard and verify guest projects persist in the same browser.
4. Open a new private browser context. Confirm the previous context's projects do not magically appear.
5. Open `/login`. Confirm Continue as guest works even when Google client ID is not configured.
6. When Google is configured, click Continue with Google; verify that a popup sign-in completes and returns to `/dashboard` without a redirect mismatch.
7. Check the requested login permissions contain userinfo only, not YouTube publishing scopes.
8. Connect a YouTube channel separately, verify consent explicitly grants the required channel scopes.
9. Attempt backend schedule/media endpoints without a token; expect 401/403. Test cross-user access as User B to User A's media.
10. Verify signing in does not silently upload local projects or move them to other accounts.

## Limitations

- Guest projects are not synchronized to an account and can be lost if browser site data is cleared or the browser's IndexedDB quota is exceeded.
- The existing authenticated backend token remains stored in localStorage; hardening token storage/session handling remains a separate security milestone.
- Server OAuth callback and provider console configuration must be verified manually; local code cannot modify external Google Cloud settings.
- Do not enable anonymous access to protected backend upload/schedule endpoints as part of guest mode.
