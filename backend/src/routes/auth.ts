import { Router, Request, Response } from "express";
import { google } from "googleapis";
import crypto from "crypto";
import sql from "../db";
import { requireAuth, signToken } from "../middleware/auth";
import {allowGoogleLoginAttempt} from "../services/loginRateLimit";

const router = Router();
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

function newGoogleClient() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
function callbackRedirect(path: string): string {
  return new URL(path, process.env.FRONTEND_URL || "http://localhost:3000").toString();
}

// Do not accept arbitrary user identifiers in redirect OAuth initiation.
router.get("/google", (_req: Request, res: Response) => {
  res.status(410).json({ error: "Use authenticated /api/auth/google/start instead." });
});

router.post("/google/start", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    res.status(503).json({ error: "Server OAuth is not configured" });
    return;
  }
  try {
    const nonce = crypto.randomBytes(32).toString("base64url");
    const hash = crypto.createHash("sha256").update(nonce).digest("hex");
    await sql`INSERT INTO youtube_oauth_states (state_hash, user_id, expires_at)
      VALUES (${hash}, ${userId}, now() + interval '10 minutes')`;
    const authUrl = newGoogleClient().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: YOUTUBE_SCOPES, state: nonce });
    res.json({ authUrl });
  } catch (err) {
    console.error("[auth] OAuth start failed:", err);
    res.status(500).json({ error: "Unable to start channel connection" });
  }
});

router.get("/google/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const nonce = typeof req.query.state === "string" ? req.query.state : "";
  if (!code || !/^[A-Za-z0-9_-]{40,80}$/.test(nonce)) {
    res.redirect(callbackRedirect("/youtube?error=invalid_state"));
    return;
  }
  try {
    const hash = crypto.createHash("sha256").update(nonce).digest("hex");
    const state = await sql`DELETE FROM youtube_oauth_states
      WHERE state_hash = ${hash} AND expires_at > now()
      RETURNING user_id`;
    if (state.length !== 1) {
      res.redirect(callbackRedirect("/youtube?error=expired_state"));
      return;
    }
    const userId = state[0].user_id as string;
    const oauth = newGoogleClient();
    const { tokens } = await oauth.getToken(code);
    // Persist actual granted scopes, never assume everything requested was granted.
    const grantedScopes = typeof tokens.scope === "string"
      ? tokens.scope.split(/\s+/).filter(Boolean) : [];
    if (!grantedScopes.includes("https://www.googleapis.com/auth/youtube.upload")) {
      res.redirect(callbackRedirect("/youtube?error=upload_scope_required"));
      return;
    }
    oauth.setCredentials(tokens);
    const youtube = google.youtube({ version: "v3", auth: oauth });
    const channels = await youtube.channels.list({ part: ["snippet"], mine: true });
    const channel = channels.data.items?.[0];
    if (!channel?.id) {
      res.redirect(callbackRedirect("/youtube?error=no_channel"));
      return;
    }
    // Unattended uploads require a refresh token, not just a short-lived access token.
    if (!tokens.refresh_token) {
      const existing = await sql`SELECT id FROM user_youtube_tokens
        WHERE user_id = ${userId} AND channel_id = ${channel.id} AND refresh_token IS NOT NULL LIMIT 1`;
      if (!existing.length) {
        res.redirect(callbackRedirect("/youtube?error=refresh_token_required"));
        return;
      }
    }
    const thumbnail = channel.snippet?.thumbnails?.default?.url || channel.snippet?.thumbnails?.medium?.url || null;
    await sql`
      INSERT INTO user_youtube_tokens
        (user_id, channel_id, channel_title, channel_thumbnail_url, access_token, refresh_token, token_expiry, scopes, connected_at)
      VALUES
        (${userId}, ${channel.id}, ${channel.snippet?.title || "YouTube Channel"}, ${thumbnail}, ${tokens.access_token || null},
         ${tokens.refresh_token || null}, ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null}, ${grantedScopes}, now())
      ON CONFLICT (user_id, channel_id) DO UPDATE SET
        channel_title = EXCLUDED.channel_title,
        channel_thumbnail_url = EXCLUDED.channel_thumbnail_url,
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, user_youtube_tokens.refresh_token),
        token_expiry = EXCLUDED.token_expiry,
        scopes = EXCLUDED.scopes,
        connected_at = now()
    `;
    res.redirect(callbackRedirect("/youtube?connected=server"));
  } catch (err) {
    console.error("[auth] OAuth callback error:", err);
    res.redirect(callbackRedirect("/youtube?error=oauth_failed"));
  }
});

router.post("/google-token", async (req: Request, res: Response) => {
  if(!allowGoogleLoginAttempt(req.ip||req.socket.remoteAddress||"unknown")){
    res.status(429).json({error:"Too many sign-in attempts. Retry later."});return;
  }
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
    const googleUser = (await response.json()) as { id?: string; sub?: string; email?: string;
      verified_email?: boolean; name?: string; picture?: string };
    if (!googleUser.email || googleUser.verified_email !== true) {
      res.status(401).json({ error: "Google account must provide a verified email" });
      return;
    }
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
    res.status(500).json({ error: "Google token login unavailable" });
  }
});

export default router;
