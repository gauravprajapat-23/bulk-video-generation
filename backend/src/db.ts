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
    await sql`ALTER TABLE automation_rules ADD COLUMN IF NOT EXISTS last_claimed_slot TEXT`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_processing_started
      ON upload_schedules(processing_started_at) WHERE status = 'processing'`;


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

    await sql`ALTER TABLE autopilot_configs ADD COLUMN IF NOT EXISTS active_run_id UUID`;
    await sql`ALTER TABLE autopilot_configs ADD COLUMN IF NOT EXISTS active_run_started_at TIMESTAMPTZ`;
    await sql`CREATE INDEX IF NOT EXISTS idx_autopilot_configs_user ON autopilot_configs(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_config ON autopilot_jobs(config_id)`;

    // AUTO-QUIZ-01: durable render-to-YouTube jobs. Default is draft/private only.
    // Jobs left running after a crash are not retried automatically because the
    // YouTube upload could have succeeded without a stored acknowledgement.
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_automation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_id TEXT NOT NULL,
        niche TEXT NOT NULL,
        topic TEXT NOT NULL,
        csv_source TEXT,
        question_count INTEGER NOT NULL DEFAULT 10,
        output_visibility TEXT NOT NULL DEFAULT 'private'
          CHECK (output_visibility IN ('private', 'unlisted')),
        status TEXT NOT NULL DEFAULT 'queued'
          CHECK (status IN ('queued','generating','rendering','uploading','completed','failed','needs_review')),
        progress INTEGER NOT NULL DEFAULT 0,
        youtube_video_id TEXT,
        youtube_video_url TEXT,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_auto_due ON quiz_automation_jobs(created_at)
      WHERE status = 'queued'`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_auto_owner ON quiz_automation_jobs(user_id, created_at DESC)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_auto_one_active_per_user
      ON quiz_automation_jobs(user_id)
      WHERE status IN ('queued','generating','rendering','uploading','needs_review')`;

    // AUTO-QUIZ-02: channel-level recurring profiles, owner-set cadence and
    // immutable per-slot claim keys. No auto-publication; approval is external.
    await sql`
      CREATE TABLE IF NOT EXISTS quiz_studio_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel_id TEXT NOT NULL,
        niche TEXT NOT NULL,
        topic TEXT NOT NULL,
        template_key TEXT NOT NULL DEFAULT 'general_trivia',
        question_count INTEGER NOT NULL DEFAULT 10,
        schedule_mode TEXT NOT NULL DEFAULT 'daily',
        schedule_time_utc TEXT NOT NULL DEFAULT '13:00',
        publish_policy TEXT NOT NULL DEFAULT 'private_review',
        enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id,channel_id)
      )
    `;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES quiz_studio_profiles(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS scheduled_slot TEXT`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS template_key TEXT NOT NULL DEFAULT 'football_gold'`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS quality_report JSONB`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_quiz_studio_scheduled_slot
      ON quiz_automation_jobs(profile_id,scheduled_slot) WHERE profile_id IS NOT NULL AND scheduled_slot IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_studio_profiles_enabled
      ON quiz_studio_profiles(schedule_time_utc) WHERE enabled=true`;

    // AUTO-QUIZ-03: an explicit review state separate from render/upload completion.
    // Publication requests are one-shot database claims and never automatically retried.
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS evidence_report JSONB`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (review_status IN ('pending','approved','rejected'))`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS reviewed_by TEXT`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'not_requested'
      CHECK (publication_status IN ('not_requested','publishing','published','needs_review'))`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS review_note TEXT`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS source_kind TEXT NOT NULL DEFAULT 'ai'
      CHECK (source_kind IN ('ai','csv'))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_jobs_review
      ON quiz_automation_jobs(user_id,review_status,created_at DESC)`;
    // AUTO-QUIZ-04: verified asset provenance and fencing for long-running workers.
    await sql`CREATE TABLE IF NOT EXISTS quiz_studio_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      channel_id TEXT NOT NULL,
      asset_kind TEXT NOT NULL CHECK(asset_kind IN ('music','image','video','font')),
      label TEXT NOT NULL,
      source_url TEXT,
      license_name TEXT NOT NULL,
      license_evidence_url TEXT NOT NULL,
      attribution_text TEXT NOT NULL,
      commercial_use_allowed BOOLEAN NOT NULL DEFAULT false,
      youtube_use_allowed BOOLEAN NOT NULL DEFAULT false,
      expires_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(id,user_id)
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_quiz_assets_owner ON quiz_studio_assets(user_id,channel_id,created_at DESC)`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS worker_claim_id UUID`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS worker_heartbeat_at TIMESTAMPTZ`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS media_qa_report JSONB`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS source_check_report JSONB`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES quiz_studio_assets(id) ON DELETE SET NULL`;
    // AUTO-QUIZ-05: private immutable asset file registration.
    await sql`ALTER TABLE quiz_studio_assets ADD COLUMN IF NOT EXISTS stored_filename TEXT`;
    await sql`ALTER TABLE quiz_studio_assets ADD COLUMN IF NOT EXISTS content_sha256 TEXT`;
    await sql`ALTER TABLE quiz_studio_assets ADD COLUMN IF NOT EXISTS size_bytes BIGINT`;
    await sql`ALTER TABLE quiz_studio_assets ADD COLUMN IF NOT EXISTS mime_type TEXT`;
    await sql`ALTER TABLE quiz_studio_profiles ADD COLUMN IF NOT EXISTS music_asset_id UUID REFERENCES quiz_studio_assets(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS music_asset_id UUID REFERENCES quiz_studio_assets(id) ON DELETE SET NULL`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS worker_lease_expires_at TIMESTAMPTZ`;
    await sql`ALTER TABLE quiz_automation_jobs ADD COLUMN IF NOT EXISTS worker_attempt_count INTEGER NOT NULL DEFAULT 0`;
    dbAvailable = true;
    console.log("[db] tables verified — database connected");
  } catch (err: any) {
    dbAvailable = false;
    console.error("[db] database connection failed:", err.message);
    console.error("[db] server will continue without database — schedules and automation disabled");
  }
}

export default sql;
