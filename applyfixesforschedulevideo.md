You **cannot fix this with code only**. This is a **YouTube/Google policy restriction**. The real fix is: **verify your OAuth app + pass YouTube API Services audit**.

Important correction: for unverified API projects, YouTube says videos uploaded through `videos.insert` are restricted to **private viewing mode**. So even if your code sends `privacyStatus: "public"` or `"unlisted"`, it can still be forced private until the API project passes audit. ([Google for Developers][1])

## What you need to do

### 1. First complete your SaaS basic production setup

Before applying, your app should look real and compliant:

```txt
Required:
- Live website on HTTPS
- Proper domain
- Privacy Policy page
- Terms & Conditions page
- Contact/support email
- Clear “Connect YouTube” screen
- Clear “Disconnect YouTube” option
- User can delete/remove YouTube connection
- You store refresh tokens securely/encrypted
- You only request needed scope: youtube.upload
- You explain why your app needs YouTube upload access
```

Do not name your app like **“YouTube Bulk Uploader”** unless you have permission. Google’s audit form specifically asks whether the API client name contains “YouTube”, and notes that the app name must not contain “YouTube” without prior written approval. 

Better names:

```txt
ShortGen Studio
BulkReel Maker
AutoShorts Studio
CreatorFlow
VideoLaunch
```

### 2. Submit Google OAuth app verification

This removes the scary **“Google hasn’t verified this app”** screen for public users.

In Google Cloud Console:

```txt
Google Cloud Console
→ Google Auth Platform
→ Branding
→ Data Access
→ Add scope: https://www.googleapis.com/auth/youtube.upload
→ Verification Center
→ Submit for verification
```

Google says apps using sensitive/restricted scopes usually need verification before public launch, and you must justify scopes, provide accurate app info, and often provide a demo video. ([Google for Developers][2])

For the demo video, record:

```txt
1. Login to your SaaS
2. Open Integrations page
3. Click Connect YouTube
4. Show Google OAuth consent screen
5. Allow permission
6. Return to your app
7. Generate/select a video
8. Schedule/upload video
9. Show YouTube upload result
10. Show disconnect/remove YouTube option
```

### 3. Submit YouTube API Services audit

This is the main fix for the **private-only upload restriction**.

Official YouTube docs say: to lift the private restriction, the API project must undergo an audit to verify compliance with YouTube API Terms of Service. ([Google for Developers][1])

Use the official:

```txt
YouTube API Services - Audit and Quota Extension Form
```

The official audit page says you need to submit the Audit and Quota Extension Form to begin an audit, and additional quota requests also require compliance audit. ([Google for Developers][3])

In the form, you’ll need details like:

```txt
- Your full legal name
- Organization name, or “self” if individual
- App/client name
- Website URL
- Privacy Policy URL
- Google Cloud project number
- OAuth client details
- How your SaaS uses YouTube API
- Why users need bulk upload/scheduling
- Target audience
- Monetization model
- Demo account credentials
- Required quota
- Methods used, especially youtube.videos.insert
```

The form specifically asks for API client overview, primary access URL, privacy policy URL, OAuth usage, project number, and separate quota needs for `youtube.videos.insert` if required. 

## What to do while approval is pending

For your MVP, use this safe flow:

```txt
Option A:
Upload through API as private only.
User can manually publish from YouTube Studio.

Option B:
Let user download generated videos.
User uploads manually to YouTube.

Option C:
Keep YouTube Connect as “Beta”.
Show message: “Public auto-upload will be enabled after YouTube API approval.”
```

In your app UI, write:

```txt
YouTube auto-upload is currently in beta. Until our YouTube API verification is approved, uploaded videos may be saved as private by YouTube. You can still download videos and upload manually.
```

## Quota issue

Current YouTube quota docs say YouTube Data API projects have default quota allocation of **100 `videos.insert` calls per day**, **100 `search.list` calls per day**, and **10,000 units/day for other endpoints**. Daily quota resets at midnight Pacific Time. ([Google for Developers][4])

So for your bulk generator, add limits like this:

```txt
Free plan: 3 uploads/day
Starter: 10 uploads/day
Pro: 30 uploads/day
Agency: based on available quota
```

Do not allow unlimited bulk upload in the beginning.

## Best answer for your SaaS

Use this roadmap:

```txt
Phase 1 - MVP
- Generate videos
- Download videos
- Private YouTube upload only
- Manual publish warning

Phase 2 - Verification
- Add privacy policy, terms, support email
- Complete OAuth verification
- Submit YouTube API audit form

Phase 3 - Production
- Enable public/unlisted/scheduled upload
- Add quota tracking
- Add failed upload retry
- Add user-level daily upload limits
- Add abuse/spam protection
```

The key point: **there is no legal bypass**. Don’t try to use browser automation, scraping, fake users, multiple projects, or unofficial upload tricks. For a real SaaS, the correct fix is **OAuth verification + YouTube API compliance audit + quota approval**.

[1]: https://developers.google.com/youtube/v3/docs/videos/insert "Videos: insert  |  YouTube Data API  |  Google for Developers"
[2]: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification "Sensitive scope verification  |  App verification to use Google Authorization APIs  |  Google for Developers"
[3]: https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits "Quota and Compliance Audits  |  YouTube Data API  |  Google for Developers"
[4]: https://developers.google.com/youtube/v3/determine_quota_cost "Quota Calculator  |  YouTube Data API  |  Google for Developers"
