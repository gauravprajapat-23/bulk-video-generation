import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { requireAuth } from "../middleware/auth";
import sql from "../db";
import { resolveOwnedVideoFile } from "../services/ownedMedia";
import {createReadStream} from "node:fs";

const router = Router();

async function getRefreshedClient(userId: string, targetChannelId?:string) {
  const rows = targetChannelId
    ? await sql`SELECT * FROM user_youtube_tokens WHERE user_id=${userId}
        AND channel_id=${targetChannelId} AND refresh_token IS NOT NULL LIMIT 1`
    : await sql`SELECT * FROM user_youtube_tokens WHERE user_id=${userId}
        AND refresh_token IS NOT NULL ORDER BY connected_at DESC LIMIT 2`;
  if(!targetChannelId && rows.length>1){
    throw new Error("Multiple channels connected; specify channelId");
  }
  if (rows.length === 0 || !rows[0].refresh_token) return null;

  const tokenRow = rows[0];
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    expiry_date: tokenRow.token_expiry ? new Date(tokenRow.token_expiry).getTime() : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await sql`
        UPDATE user_youtube_tokens SET
          access_token = ${tokens.access_token},
          token_expiry = ${tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null}
        WHERE id = ${tokenRow.id}
      `;
    }
  });

  return { oauth2Client, channelId: tokenRow.channel_id, channelTitle: tokenRow.channel_title };
}

router.get("/channels", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`
      SELECT channel_id, channel_title, channel_thumbnail_url, connected_at
      FROM user_youtube_tokens
      WHERE user_id = ${userId}
      ORDER BY connected_at DESC
    `;
    res.json(rows);
  } catch (err) {
    console.error("[youtube] channels error:", err);
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// Revoking a server-side connection prevents future scheduled uploads using its tokens.
router.delete("/channels/:channelId", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`DELETE FROM user_youtube_tokens
      WHERE user_id = ${userId} AND channel_id = ${req.params.channelId}
      RETURNING channel_id`;
    if (!rows.length) {
      res.status(404).json({ error: "Channel not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[youtube] disconnect failed:", err);
    res.status(500).json({ error: "Unable to disconnect channel" });
  }
});

router.post("/upload", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  const { title, description, tags, categoryId, visibility, madeForKids, publishAt, videoUrl, channelId } = req.body ?? {};

  if(typeof title!=="string"||!title.trim()||title.length>100||
    typeof videoUrl!=="string"||videoUrl.length>2048||
    (visibility!==undefined&&!["private","unlisted","public"].includes(visibility))||
    (publishAt!==undefined&&(typeof publishAt!=="string"||
      !Number.isFinite(Date.parse(publishAt))||Date.parse(publishAt)<=Date.now()))||
    (tags!==undefined&&(!Array.isArray(tags)||tags.length>50||
      tags.some((t:unknown)=>typeof t!=="string"||t.length>100)))||
    (madeForKids!==undefined&&typeof madeForKids!=="boolean")||
    (channelId!==undefined&&(typeof channelId!=="string"||channelId.length>200))||
    (description!==undefined&&(typeof description!=="string"||description.length>5000))||
    (categoryId!==undefined&&(typeof categoryId!=="string"||!/^[0-9]{1,3}$/.test(categoryId)))){
    res.status(400).json({error:"Invalid title, video reference, visibility, schedule or metadata"});return;
  }
  if (!title || !videoUrl) {
    res.status(400).json({ error: "title and videoUrl are required" });
    return;
  }

  let client;
  try{client=await getRefreshedClient(userId,channelId);}
  catch{res.status(409).json({error:"Select a connected server YouTube channel explicitly"});return;}
  if (!client) {
    res.status(400).json({ error: "No YouTube channel connected. Please connect via /api/auth/google first." });
    return;
  }

  try {
    const { filePath, mimeType } = await resolveOwnedVideoFile(userId, videoUrl);

    const youtube = google.youtube({ version: "v3", auth: client.oauth2Client });

    const insertRes = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: (title || "").slice(0, 100),
          description: (description || "").slice(0, 5000),
          tags: tags || [],
          categoryId: categoryId || "22",
        },
        status: {
          privacyStatus: publishAt ? "private" : (visibility || "private"),
          publishAt: publishAt || undefined,
          selfDeclaredMadeForKids: madeForKids || false,
        },
      },
      media: {
        mimeType,
        body: createReadStream(filePath),
      },
    });

    const videoId = insertRes.data.id;
    if(!videoId)throw new Error("YouTube upload response missing video ID");
    const videoUrlResult = `https://youtube.com/watch?v=${videoId}`;

    const uploadRows = await sql`
      INSERT INTO youtube_uploads
        (user_id, project_id, upload_mode, title, description, tags, category_id, visibility, made_for_kids, status, progress_percent, scheduled_publish_at, youtube_video_id, youtube_video_url, uploaded_at)
      VALUES
        (${userId}, ${req.body.projectId || ""}, ${publishAt ? "scheduled_publish" : "instant"}, ${title}, ${description || ""}, ${tags || []}, ${categoryId || "22"}, ${visibility || "private"}, ${madeForKids || false}, "uploaded", 100, ${publishAt || null}, ${videoId}, ${videoUrlResult}, now())
      RETURNING *
    `;

    res.json({ youtubeVideoId: videoId, youtubeVideoUrl: videoUrlResult, upload: uploadRows[0] });
  } catch (err: any) {
    console.error("[youtube] upload error:", err);
    res.status(502).json({ error: "YouTube upload failed or its outcome is uncertain; check YouTube Studio before retrying" });
  }
});

router.get("/uploads", requireAuth, async (req: Request, res: Response) => {
  const { userId } = (req as any).auth;
  try {
    const rows = await sql`
      SELECT * FROM youtube_uploads
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    res.json(rows);
  } catch (err) {
    console.error("[youtube] uploads list error:", err);
    res.status(500).json({ error: "Failed to fetch uploads" });
  }
});

export default router;
