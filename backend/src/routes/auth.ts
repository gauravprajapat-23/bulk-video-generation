import { Router, Request, Response } from "express";
import sql from "../db";
import { signToken } from "../middleware/auth";

const router = Router();

router.get("/google", (_req: Request, res: Response) => {
  res.status(410).json({ error: "Legacy OAuth redirect disabled. Use Google Identity Services token flow." });
});

router.get("/google/callback", (_req: Request, res: Response) => {
  res.status(410).json({ error: "Legacy OAuth callback disabled." });
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
