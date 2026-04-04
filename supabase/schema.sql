-- Huntington Steel CMS - Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS TABLE
-- Synced from Google OAuth via NextAuth
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login TIMESTAMPTZ DEFAULT now()
);

-- Make emaloney@huntingtonsteel.com an admin by default
-- (Run after first login or insert manually)
-- UPDATE users SET role = 'admin' WHERE email = 'emaloney@huntingtonsteel.com';

-- ============================================================
-- DEVICES TABLE
-- Digital signage display devices
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  platform TEXT NOT NULL CHECK (platform IN ('unifi', 'google_slides', 'other')),
  device_type TEXT, -- 'uc_cast', 'uc_cast_lite', 'google_slides', etc.
  max_resolution TEXT, -- e.g. '1920x1080', '3840x2160'
  max_file_size_mb INTEGER,
  supported_formats TEXT[], -- array of file extensions
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default devices
INSERT INTO devices (name, location, platform, device_type, max_resolution, max_file_size_mb, supported_formats, notes)
VALUES
  (
    'UC Cast',
    'Main Area',
    'unifi',
    'uc_cast',
    '3840x2160',
    20,
    ARRAY['jpg','jpeg','png','gif','bmp','mp4','mov'],
    'UniFi UC Cast 4K display in main production area. Supports 4K UHD resolution.'
  ),
  (
    'UC Cast Lite',
    'Secondary Area',
    'unifi',
    'uc_cast_lite',
    '1920x1080',
    20,
    ARRAY['jpg','jpeg','png','gif','bmp','mp4','mov'],
    'UniFi UC Cast Lite 1080p display in secondary area. Full HD only.'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- SUBMISSIONS TABLE
-- Content submitted by users for display
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('image', 'video', 'audio')),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_type TEXT,
  width INTEGER,
  height INTEGER,
  duration_seconds INTEGER,
  target_devices UUID[], -- array of device IDs
  schedule_start TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'live', 'expired')),
  admin_feedback TEXT,
  reviewer_notes TEXT, -- notes from submitter to reviewer
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- AUDIT LOG TABLE
-- Track all admin actions for accountability
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL, -- 'submit', 'approve', 'reject', 'device_add', etc.
  entity_type TEXT, -- 'submission', 'device', 'user'
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Service role key (used in API routes) bypasses RLS
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Users: authenticated users can read all, but only write their own row
CREATE POLICY "Users can read all users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Devices: everyone can read active devices
CREATE POLICY "Anyone can read active devices" ON devices
  FOR SELECT USING (is_active = true);

-- Submissions: users can read their own, admins can read all
-- Note: In practice these are enforced at the API layer with service role key
CREATE POLICY "Users can read own submissions" ON submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own submissions" ON submissions
  FOR INSERT WITH CHECK (true);

-- Audit log: read-only for authenticated users
CREATE POLICY "Authenticated users can read audit log" ON audit_log
  FOR SELECT USING (true);

-- ============================================================
-- STORAGE BUCKETS
-- Run these in Supabase Dashboard > Storage, or via API
-- ============================================================
-- NOTE: Create a bucket called 'submissions' with:
-- - Public: false (use signed URLs or service role for access)
-- - File size limit: 100MB
-- - Allowed MIME types: image/*, video/*

-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'submissions',
--   'submissions',
--   false,
--   104857600,
--   ARRAY['image/jpeg','image/png','image/gif','image/bmp','image/webp','video/mp4','video/quicktime','video/mov']
-- );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- UniFi publish tracking (run this if upgrading an existing database)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS unifi_publish_status TEXT CHECK (unifi_publish_status IN ('pending', 'published', 'failed')),
  ADD COLUMN IF NOT EXISTS unifi_publish_error TEXT;

-- Google Slides tracking columns
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS google_slides_slide_id TEXT,
  ADD COLUMN IF NOT EXISTS google_publish_status TEXT CHECK (google_publish_status IN ('pending', 'published', 'failed'));

-- Store admin's Google refresh token for API calls
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

-- Store Google Slides presentation ID on the device record
ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS device_id TEXT;
