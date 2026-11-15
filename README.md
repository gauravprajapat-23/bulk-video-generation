# Video Maker — Shorts Studio (Local-First Frontend)

A complete Next.js frontend for the Video Maker module: design bulk images from CSV data, turn images into YouTube
Shorts / Reels / TikTok videos, manage sound, queue renders, connect a YouTube
channel, and schedule uploads.

**This build is local-first by design** — there is no backend yet. Everything
(images, audio, rendered videos) lives in your browser's IndexedDB, and project
metadata is persisted to localStorage via Zustand. Video rendering happens
*for real* in the browser using Canvas + MediaRecorder — you get an actual
playable, downloadable video file today, not a mock. YouTube connect and upload
now use Google Identity Services + YouTube Data API v3 directly from the browser
when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured. The YouTube connection is multi-user ready: the Client ID is shared by the app, but each creator connects their own Google account and uploads with their own browser OAuth token.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects straight to the dashboard.

For a production build:

```bash
npm run build
npm run start
```

## What's real vs. mocked right now

| Feature | Status |
|---|---|
| Image upload & library | ✅ Real (stored in IndexedDB) |
| Bulk image generator with CSV placeholders | ✅ Real (Canvas PNG export, stored in IndexedDB) |
| Canva-like image editor | ✅ Real responsive workspace with collapsible panels, bigger canvas area, drag, resize, layers, direct in-canvas text editing, text/shapes/image frames |
| Reorder / duration / transitions / text overlay / watermark | ✅ Real |
| Audio upload, trim, loop/cut, waveform | ✅ Real |
| Video rendering (Canvas + MediaRecorder → actual `.webm` file) | ✅ Real, runs in-browser |
| Video preview & download | ✅ Real |
| Bulk video generation | ✅ Real, sequential in-browser rendering |
| Multi-user YouTube OAuth connect/switch/disconnect | ✅ Real frontend OAuth via Google Identity Services when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set |
| YouTube bulk upload | ✅ Real via YouTube Data API resumable upload |
| Different scheduled publish times | ✅ Real YouTube `publishAt`: videos upload now as private, then YouTube publishes later |
| Automation rules | 🟡 Stored locally as planning rules; server cron is still needed for future automatic queue picking |

The browser upload client lives in **`src/lib/youtubeClient.ts`**. It requests only
YouTube upload + read-only channel scopes, fetches the connected channel, starts a
resumable upload session, tracks upload progress, and optionally sets
`status.publishAt` for scheduled publishing. Tokens are short-lived and scoped to
the active browser user; the app does not use one shared YouTube channel.


## Bulk image editor UX

The **Bulk Images** screen now works more like Canva:

- Full Canva-style dark workspace using the app theme, with top action bar, left icon rail, collapsible asset drawer, floating context toolbar, and bottom page/zoom bar.
- Left icon rail now includes Design, Elements, Text, Uploads, CSV Data, Layers, and Brand Kit.
- Panels stay hidden until the user opens them, so the canvas gets maximum editing space.
- The right properties inspector stays collapsed by default and opens only when required.
- Text formatting happens from the floating toolbar, and users can double-click text directly on the design to edit it in place.
- CSV placeholders such as `{{headline}}`, `{{days_left}}`, and `{{cta}}` still work during preview and bulk PNG generation.

## YouTube setup for many frontend users

1. Open Google Cloud Console and create/select one project for your app.
2. Enable **YouTube Data API v3**.
3. Configure the OAuth consent screen. Keep Testing mode for invited testers, or publish/verify the app for public users.
4. Create an **OAuth client ID → Web application**.
5. Add authorized JavaScript origins for every frontend domain, for example `http://localhost:3000` and your production domain.
6. Copy `.env.local.example` to `.env.local` and set:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

Restart `npm run dev`. Then open **YouTube Connection**. Every user clicks **Connect my YouTube Channel** and chooses their own Google account. On a shared computer, they can use **Switch channel** or **Disconnect** before the next person uploads.

Scheduled uploads work by uploading the video immediately as `private` and sending
YouTube a future `publishAt` time. This means the browser must stay open only
while the upload itself is running; YouTube handles publishing later.


### Multi-user behavior

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is intentionally public and common for the whole deployed app.
- User data is not shared: OAuth tokens are issued by Google per user/browser session.
- Uploads always go to the currently connected channel shown on the YouTube Connection and Scheduler screens.
- The app stores only channel display info in localStorage; access tokens are kept in browser memory and can be revoked on disconnect.
- This local-first build still has no app login or cross-device sync. For SaaS accounts, teams, audit logs, refresh tokens, and server-side cron uploads, add a backend OAuth flow later.

## Why WebM instead of MP4 right now

Browsers can record Canvas+Audio via `MediaRecorder`, but reliable MP4/H.264
encoding isn't available everywhere yet — so local exports come out as WebM
(VP9/VP8 + Opus), which plays fine for previewing and testing your whole
pipeline. **The backend's FFmpeg pipeline (from the architecture doc) is what
produces the final H.264/AAC MP4 that YouTube Shorts actually wants** — this
frontend already has render job tracking, status, retry, and a queue UI built
to slot that in without any UI changes once it exists.

## Project structure

```
src/
  app/                  Next.js App Router pages (one per sidebar item)
  components/
    layout/             Sidebar, TopBar, AppShell
    ui/                 Button, Card, Modal, Badge, Toast, etc. — generic primitives
    images/             Bulk image editor with CSV placeholders and Canvas export
    video/              Everything for building/previewing/rendering a video project
    audio/              Upload, waveform, batch-assign
    youtube/            Metadata form, upload status badge
  hooks/                useObjectUrls (IndexedDB blob → <img>/<video> src), useHasHydrated
  lib/                  types.ts (mirrors the future DB schema), idbStore.ts, placeholders.ts, youtubeClient.ts
  services/             bulkImageRenderer.ts, videoRenderService.ts (the actual renderer), renderRunner.ts, thumbnailService.ts
  store/                useAppStore.ts — single Zustand store, persisted to localStorage
```

## Connecting the real backend later

1. Keep `src/lib/youtubeClient.ts` for direct browser uploads, or replace it with backend calls to
   `/api/video-maker/youtube/*` if you later want server-side OAuth refresh tokens, audit logs, and cron.
2. Swap `runProjectRender` (in `src/services/renderRunner.ts`) for an API call
   that creates a `render_jobs` row and polls/streams status, instead of
   running `renderVideoLocally` in-browser. The `RenderProgressCard` UI and
   `RenderJob` status model already match the backend's `render_jobs` table
   shape, so the Render Queue screen needs no changes.
2. Swap image/audio upload (currently `putBlob` to IndexedDB) for real
   `multipart/form-data` uploads to your Laravel API, storing the returned
   URL/path instead of a local blob key.
3. The bulk image generator currently renders PNGs client-side via Canvas and stores them in the same image library; later, swap `src/services/bulkImageRenderer.ts` for a backend image-render endpoint if you need server-side batch generation at scale.
4. The Zustand store (`useAppStore.ts`) can stay as a client-side cache —
   just have it sync from/to your API instead of `localStorage` once there's
   a real user session.

## Known limitations (by design, for this local-first stage)

- No multi-device sync — everything is scoped to one browser.
- No authentication.
- Automation rules can be created/enabled here, but nothing automatically picks future videos
  from the queue while the app is closed — that needs a real server-side scheduler. The bulk
  scheduler itself is real because it uploads now and sets YouTube `publishAt`.
- Large numbers of high-resolution images/videos will be limited by the
  browser's IndexedDB storage quota (varies by browser, typically several GB).
#   b u l k - v i d e o - g e n e r a t i o n  
 