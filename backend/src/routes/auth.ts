import { Router, Request, Response } from "express";
import { google } from "googleapis";
import crypto from "crypto";
import sql from "../db";
import { signToken } from "../middleware/auth";

const router = Router();

const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
if (!OAUTH_STATE_SECRET) {
  throw new Error("OAUTH_STATE_SECRET or JWT_SECRET environment variable is required");
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function signState(data: string): string {
  const signature = crypto.createHmac("sha256", OAUTH_STATE_SECRET!).update(data).digest("base64url");
  return `${Buffer.from(data).toString("base64url")}.${signature}`;
}

function verifyState(signedState: string): { userId: string; email: string } | null {
  try {
    const [encodedData, signature] = signedState.split(".");
    if (!encodedData || !signature) return null;
    const data = Buffer.from(encodedData, "base64url").toString();
    const expected = crypto.createHmac("sha256", OAUTH_STATE_SECRET!).update(data).digest("base64url");
    if (signature !== expected) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

router.get("/google", (req: Request, res: Response) => {
  const { userId, email } = req.query as { userId?: string; email?: string };
  if (!userId || !email) {
    res.status(400).json({ error: "userId and email query params are required" });
    return;
  }
  const statePayload = JSON.stringify({ userId, email });
  const state = signState(statePayload);
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: YOUTUBE_SCOPES,
    state,
  });
  res.redirect(url);
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code?: string; state?: string };
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  if (!code || !state) {
    res.redirect(`${frontendUrl}/youtube?error=missing_code`);
    return;
  }

  try {
    const stateData = verifyState(state);
    if (!stateData) {
      res.redirect(`${frontendUrl}/youtube?error=invalid_state`);
      return;
    }
    const { userId, email } = stateData;
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      part: ["snippet"],
      mine: true,
    });
    const channel = channelRes.data.items?.[0];
    if (!channel) {
      res.redirect(`${frontendUrl}/youtube?error=no_channel`);
      return;
    }

    const channelId = channel.id!;
    const channelTitle = channel.snippet?.title || "YouTube Channel";
    const channelThumbnail =
      channel.snippet?.thumbnails?.default?.url ||
      channel.snippet?.thumbnails?.medium?.url ||
      channel.snippet?.thumbnails?.high?.url ||
      null;

    await sql`
      INSERT INTO users (id, email, name, avatar_url, updated_at)
      VALUES (${userId}, ${email}, ${channelTitle}, ${channelThumbnail}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = now()
    `;

    await sql`
      INSERT INTO user_youtube_tokens
        (user_id, channel_id, channel_title, channel_thumbnail_url, access_token, refresh_token, token_expiry, scopes, connected_at)
      VALUES
        (${userId}, ${channelId}, ${channelTitle}, ${channelThumbnail}, ${tokens.access_token || null}, ${tokens.refresh_token || null}, ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null}, ${YOUTUBE_SCOPES}, now())
      ON CONFLICT (user_id, channel_id) DO UPDATE SET
        channel_title = EXCLUDED.channel_title,
        channel_thumbnail_url = EXCLUDED.channel_thumbnail_url,
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, user_youtube_tokens.refresh_token),
        token_expiry = EXCLUDED.token_expiry,
        connected_at = now()
    `;

    const appToken = signToken({ userId, email });
    res.redirect(`${frontendUrl}/youtube?token=${appToken}&channelId=${channelId}`);
  } catch (err) {
    console.error("[auth] Google OAuth callback error:", err);
    res.redirect(`${frontendUrl}/youtube?error=oauth_failed`);
  }
});

router.post("/google-token", async (req: Request, res: Response) => {
  const { accessToken } = req.body;
  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      res.status(401).json({ error: "Invalid Google access token" });
      return;
    }
    const googleUser = (await response.json()) as { id?: string; sub?: string; email?: string; name?: string; picture?: string };
    const userId = googleUser.id || googleUser.sub;
    if (!userId) {
      res.status(401).json({ error: "Could not determine Google user ID" });
      return;
    }
    const email = googleUser.email || `${userId}@google.user`;
    const name = googleUser.name || googleUser.email || "Google User";
    const avatarUrl = googleUser.picture || null;

    await sql`
      INSERT INTO users (id, email, name, avatar_url, updated_at)
      VALUES (${userId}, ${email}, ${name}, ${avatarUrl}, now())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        updated_at = now()
    `;
    const token = signToken({ userId, email });
    res.json({ token, userId, email });
  } catch (err: any) {
    console.error("[auth] google-token login error:", err?.message || err);
    res.status(500).json({ error: err?.message || "Google token login failed" });
  }
});

export default router;
