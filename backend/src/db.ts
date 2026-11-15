import dotenv from "dotenv";
dotenv.config();

import { neon, NeonQueryFunction } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set in backend/.env");
}

const sql: NeonQueryFunction<false, false> = neon(databaseUrl);

/** Track whether the database is reachable. */
let dbAvailable = false;

/** Check if the database is currently available. */
export function isDbAvailable(): boolean {
  return dbAvailable;
}

export async function ensureTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS user_youtube_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        channel_id TEXT NOT NULL,
        channel_title TEXT,
        channel_thumbnail_url TEXT,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMPTZ,
        scopes TEXT[] DEFAULT '{}',
        connected_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(user_id, channel_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS upload_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        project_id TEXT NOT NULL,
        automation_rule_id UUID,
        scheduled_at TIMESTAMPTZ NOT NULL,
        status TEXT DEFAULT 'pending',
        metadata JSONB NOT NULL DEFAULT '{}',
        video_blob_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS youtube_uploads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        project_id TEXT NOT NULL,
        schedule_id UUID REFERENCES upload_schedules(id) ON DELETE SET NULL,
        upload_mode TEXT DEFAULT 'instant',
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        tags TEXT[] DEFAULT '{}',
        category_id TEXT DEFAULT '22',
        visibility TEXT DEFAULT 'private',
        made_for_kids BOOLEAN DEFAULT false,
        status TEXT DEFAULT 'not_uploaded',
        progress_percent INT DEFAULT 0,
        scheduled_publish_at TIMESTAMPTZ,
        youtube_video_id TEXT,
        youtube_video_url TEXT,
        error_message TEXT,
        attempt_count INT DEFAULT 1,
        uploaded_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT false,
        uploads_per_day INT DEFAULT 1,
        daily_times TEXT[] DEFAULT '{}',
        source_audio_playlist TEXT,
        metadata_template JSONB DEFAULT '{}',
        status TEXT DEFAULT 'paused',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS uploaded_media (
        filename TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT,
        size_bytes BIGINT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_uploaded_media_user ON uploaded_media(user_id)`;

    await sql`
      CREATE TABLE IF NOT EXISTS youtube_oauth_states (
        state_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_youtube_oauth_expiry ON youtube_oauth_states(expires_at)`;


    // Additive schema changes; existing schedules remain readable.
    await sql`ALTER TABLE upload_schedules ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ`;
    await sql`ALTER TABLE upload_schedules ADD COLUMN IF NOT EXISTS youtube_video_id TEXT`;
    // Historical duplicates must be reconciled before applying this constraint.
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_youtube_uploads_schedule
      ON youtube_uploads(schedule_id) WHERE schedule_id IS NOT NULL`;

    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_pending ON upload_schedules(scheduled_at) WHERE status = 'pending'`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_user ON upload_schedules(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_uploads_user ON youtube_uploads(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rules_user ON automation_rules(user_id)`;

    // Autopilot tables
    await sql`
      CREATE TABLE IF NOT EXISTS autopilot_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        name TEXT NOT NULL DEFAULT 'New Autopilot',
        niche TEXT DEFAULT 'custom',
        is_enabled BOOLEAN DEFAULT false,
        videos_per_day INT DEFAULT 3,
        page_duration_ms INT DEFAULT 5000,
        upload_times TEXT[] DEFAULT '{}',
        timezone TEXT DEFAULT 'UTC',
        csv_data TEXT DEFAULT '',
        csv_headers TEXT[] DEFAULT '{}',
        csv_rows JSONB DEFAULT '[]',
        csv_cursor INT DEFAULT 0,
        design_data JSONB DEFAULT '{}',
        animation_preset JSONB DEFAULT '{}',
        audio_id TEXT,
        default_title_template TEXT DEFAULT '{{headline}} #shorts',
        default_description_template TEXT DEFAULT '{{description}}',
        default_tags TEXT[] DEFAULT '{}',
        default_category_id TEXT DEFAULT '22',
        default_visibility TEXT DEFAULT 'public',
        default_made_for_kids BOOLEAN DEFAULT false,
        last_run_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS autopilot_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        config_id UUID REFERENCES autopilot_configs(id) ON DELETE CASCADE NOT NULL,
        csv_row_index INT NOT NULL,
        status TEXT DEFAULT 'queued' CHECK (status IN (
          'queued','generating_images','rendering_video',
          'uploading','completed','failed'
        )),
        render_progress INT DEFAULT 0,
        youtube_video_id TEXT,
        youtube_video_url TEXT,
        error_message TEXT,
        video_blob_url TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        completed_at TIMESTAMPTZ
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_autopilot_configs_user ON autopilot_configs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_config ON autopilot_jobs(config_id)`;

    dbAvailable = true;
    console.log("[db] tables verified — database connected");
  } catch (err: any) {
    dbAvailable = false;
    console.error("[db] database connection failed:", err.message);
    console.error("[db] server will continue without database — schedules and automation disabled");
  }
}

export default sql;
