import { google } from "googleapis";
import sql from "../db";
import { Readable } from "stream";
import { createReadStream } from "node:fs";
import { readOwnedVideo } from "./ownedMedia";

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
  videoBuffer: Buffer | string,
  mimeType: string,
  metadata: {
    title: string;
    description?: string;
    tags?: string[];
    categoryId?: string;
    visibility?: string;
    madeForKids?: boolean;
    publishAt?: string;
    targetChannelId?: string;
  }
): Promise<UploadResult> {
  const rows = metadata.targetChannelId
    ? await sql`SELECT * FROM user_youtube_tokens
        WHERE user_id = ${userId} AND channel_id = ${metadata.targetChannelId}
          AND refresh_token IS NOT NULL LIMIT 1`
    : await sql`SELECT * FROM user_youtube_tokens
        WHERE user_id = ${userId} ORDER BY connected_at DESC LIMIT 1`;
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

  const stream = typeof videoBuffer === "string"
    ? createReadStream(videoBuffer)
    : Readable.from(videoBuffer);

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

/**
 * Claims a schedule in one database statement. No worker may publish unless
 * it won the pending -> processing transition.
 *
 * This prevents simultaneous workers from uploading one schedule twice.
 * It does NOT make the external YouTube API transactional.
 */
export async function uploadSchedule(scheduleId: string): Promise<void> {
  const claimed = await sql`
    UPDATE upload_schedules
    SET status = 'processing',
        processing_started_at = now(),
        updated_at = now()
    WHERE id = ${scheduleId}
      AND status = 'pending'
      AND scheduled_at <= now()
    RETURNING *
  `;
  if (claimed.length !== 1) return;

  const schedule = claimed[0];
  console.log(`[scheduler] claimed schedule ${scheduleId}`);

  try {
    const metadata = typeof schedule.metadata === "string" ? JSON.parse(schedule.metadata) : schedule.metadata;
    if (!schedule.video_blob_url) {
      throw new Error("No uploaded video associated with this schedule");
    }
    const { buffer, mimeType } = await readOwnedVideo(schedule.user_id, schedule.video_blob_url);
    const result = await uploadVideoForUser(schedule.user_id, buffer, mimeType, {
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      categoryId: metadata.categoryId,
      visibility: metadata.visibility,
      madeForKids: metadata.madeForKids,
      // A cron upload runs when due; passing a past publishAt to YouTube is invalid.
      // The user-selected visibility is applied when the upload reaches YouTube.
    });

    // Persist the provider's ID immediately. If the process dies after YouTube
    // succeeds, the schedule will NOT be automatically retried.
    await sql`
      UPDATE upload_schedules
      SET youtube_video_id = ${result.youtubeVideoId},
          status = 'needs_review',
          updated_at = now()
      WHERE id = ${scheduleId} AND status = 'processing'
    `;

    await sql`
      INSERT INTO youtube_uploads
        (user_id, project_id, schedule_id, upload_mode, title, description, tags,
         category_id, visibility, made_for_kids, status, progress_percent,
         scheduled_publish_at, youtube_video_id, youtube_video_url, uploaded_at)
      VALUES
        (${schedule.user_id}, ${schedule.project_id}, ${scheduleId}, 'scheduled_publish',
         ${metadata.title}, ${metadata.description || ''}, ${metadata.tags || []},
         ${metadata.categoryId || '22'}, ${metadata.visibility || 'private'},
         ${metadata.madeForKids || false}, 'uploaded', 100,
         ${schedule.scheduled_at}, ${result.youtubeVideoId}, ${result.youtubeVideoUrl}, now())
      ON CONFLICT (schedule_id) WHERE schedule_id IS NOT NULL DO NOTHING
    `;

    await sql`
      UPDATE upload_schedules
      SET status = 'completed', updated_at = now()
      WHERE id = ${scheduleId} AND status = 'needs_review'
        AND youtube_video_id = ${result.youtubeVideoId}
    `;
    console.log(`[scheduler] completed schedule ${scheduleId}: ${result.youtubeVideoId}`);
  } catch (err: any) {
    console.error(`[scheduler] failed schedule ${scheduleId}:`, err);
    // After provider interaction, a failed response may mean uncertain external
    // state. Never automatically requeue this schedule.
    await sql`
      UPDATE upload_schedules
      SET status = 'needs_review',
          updated_at = now()
      WHERE id = ${scheduleId} AND status IN ('processing', 'needs_review')
    `;
  }
}
