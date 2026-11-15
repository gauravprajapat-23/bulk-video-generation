-- Video Maker Backend — Neon PostgreSQL Schema
-- Run this in the Neon SQL editor once to initialize the database.

-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- YOUTUBE OAUTH TOKENS (per user + channel)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_youtube_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  channel_id TEXT NOT NULL,
  channel_title TEXT,
  channel_thumbnail_url TEXT,
  access_token TEXT,
  refresh_token TEXT, -- In production, encrypt with pgcrypto
  token_expiry TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

-- ============================================================
-- UPLOAD SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS upload_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id TEXT NOT NULL,
  automation_rule_id UUID,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','queued','processing','completed','failed','cancelled','paused')),
  metadata JSONB NOT NULL DEFAULT '{}',
  video_blob_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedules_pending
  ON upload_schedules(scheduled_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_schedules_user
  ON upload_schedules(user_id);

-- ============================================================
-- YOUTUBE UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS youtube_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id TEXT NOT NULL,
  schedule_id UUID REFERENCES upload_schedules(id) ON DELETE SET NULL,
  upload_mode TEXT DEFAULT 'instant' CHECK (upload_mode IN ('instant','scheduled_publish')),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  category_id TEXT DEFAULT '22',
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public')),
  made_for_kids BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'not_uploaded' CHECK (status IN ('not_uploaded','uploading','uploaded','failed')),
  progress_percent INT DEFAULT 0,
  scheduled_publish_at TIMESTAMPTZ,
  youtube_video_id TEXT,
  youtube_video_url TEXT,
  error_message TEXT,
  attempt_count INT DEFAULT 1,
  uploaded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploads_user
  ON youtube_uploads(user_id);

-- ============================================================
-- AUTOMATION RULES
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  uploads_per_day INT DEFAULT 1,
  daily_times TEXT[] DEFAULT '{}',
  source_audio_playlist TEXT,
  metadata_template JSONB DEFAULT '{}',
  status TEXT DEFAULT 'paused' CHECK (status IN ('active','paused','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_user
  ON automation_rules(user_id);
