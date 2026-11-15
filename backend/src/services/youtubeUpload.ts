import { google } from "googleapis";
import sql from "../db";
import { Readable } from "stream";

interface UploadResult {
  youtubeVideoId: string;
  youtubeVideoUrl: string;
}

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { token } = await oauth2Client.getAccessToken();
  if (!token) throw new Error("Failed to refresh access token");
  return token;
}

export async function uploadVideoForUser(
  userId: string,
  videoBuffer: Buffer,
  mimeType: string,
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    visibility?: string;
    madeForKids?: boolean;
    publishAt?: string;
  }
): Promise<UploadResult> {
  const rows = await sql`
    SELECT * FROM user_youtube_tokens
    WHERE user_id = ${userId}
    ORDER BY connected_at DESC
    LIMIT 1
  `;
  if (rows.length === 0 || !rows[0].refresh_token) {
    throw new Error("No YouTube channel connected for this user");
  }

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

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  const videoResource = {
    snippet: {
      title: (metadata.title || "").slice(0, 100),
      description: (metadata.description || "").slice(0, 5000),
      tags: metadata.tags || [],
      categoryId: metadata.categoryId || "22",
    },
    status: {
      privacyStatus: metadata.publishAt ? "private" : (metadata.visibility || "private"),
      publishAt: metadata.publishAt || undefined,
      selfDeclaredMadeForKids: metadata.madeForKids || false,
    },
  };

  const stream = new Readable({
    read() {
      this.push(videoBuffer);
      this.push(null);
    },
  });

  const insertRes = await youtube.videos.insert({
    part: ["snippet", "status"],
    requestBody: videoResource,
    media: {
      mimeType,
      body: stream,
    },
  });

  const videoId = insertRes.data.id;
  if (!videoId) throw new Error("YouTube did not return a video ID");

  return {
    youtubeVideoId: videoId,
    youtubeVideoUrl: `https://youtube.com/watch?v=${videoId}`,
  };
}

export async function uploadSchedule(scheduleId: string): Promise<void> {
  const rows = await sql`
    SELECT * FROM upload_schedules
    WHERE id = ${scheduleId} AND status = 'pending'
    LIMIT 1
  `;
  if (rows.length === 0) return;

  const schedule = rows[0];
  const metadata = typeof schedule.metadata === "string" ? JSON.parse(schedule.metadata) : schedule.metadata;

  await sql`UPDATE upload_schedules SET status = 'processing', updated_at = now() WHERE id = ${scheduleId}`;
  console.log(`[scheduler] processing schedule ${scheduleId}, video_blob_url: ${schedule.video_blob_url}`);

  try {
    if (!schedule.video_blob_url) {
      throw new Error("No video file URL attached to this schedule. Upload the video from the frontend first.");
    }

    let buffer: Buffer;
    let mimeType: string;

    if (schedule.video_blob_url.startsWith("http")) {
      const videoResponse = await fetch(schedule.video_blob_url);
      if (!videoResponse.ok) throw new Error(`Failed to download video: ${videoResponse.status}`);
      buffer = Buffer.from(await videoResponse.arrayBuffer());
      mimeType = videoResponse.headers.get("content-type") || "video/webm";
    } else {
      const fs = await import("fs");
      buffer = fs.readFileSync(schedule.video_blob_url);
      mimeType = "video/webm";
    }

    console.log(`[scheduler] video downloaded, size: ${buffer.length} bytes`);

    const result = await uploadVideoForUser(
      schedule.user_id,
      buffer,
      mimeType,
      {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        categoryId: metadata.categoryId,
        visibility: metadata.visibility,
        madeForKids: metadata.madeForKids,
        publishAt: schedule.scheduled_at,
      }
    );

    console.log(`[scheduler] uploaded to YouTube: ${result.youtubeVideoUrl}`);

    await sql`
      INSERT INTO youtube_uploads
        (user_id, project_id, schedule_id, upload_mode, title, description, tags, category_id, visibility, made_for_kids, status, progress_percent, scheduled_publish_at, youtube_video_id, youtube_video_url, uploaded_at)
      VALUES
        (${schedule.user_id}, ${schedule.project_id}, ${scheduleId}, 'scheduled_publish', ${metadata.title}, ${metadata.description || ''}, ${metadata.tags || []}, ${metadata.categoryId || '22'}, ${metadata.visibility || 'private'}, ${metadata.madeForKids || false}, 'uploaded', 100, ${schedule.scheduled_at}, ${result.youtubeVideoId}, ${result.youtubeVideoUrl}, now())
    `;

    await sql`UPDATE upload_schedules SET status = 'completed', updated_at = now() WHERE id = ${scheduleId}`;
    console.log(`[scheduler] schedule ${scheduleId} completed`);
  } catch (err: any) {
    console.error(`[scheduler] failed to process schedule ${scheduleId}:`, err.message);
    await sql`
      UPDATE upload_schedules SET status = 'failed', updated_at = now()
      WHERE id = ${scheduleId}
    `;
  }
}
