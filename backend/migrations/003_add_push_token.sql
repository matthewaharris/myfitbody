-- Migration: Add push notification token to users table
-- Run this in your Supabase SQL editor

-- Add push token column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add index for push token lookups (for sending notifications)
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;

COMMENT ON COLUMN users.push_token IS 'Expo push notification token (format: ExponentPushToken[xxxx])';
