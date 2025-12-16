-- Migration: Add first name, last name, and phone number to users table
-- Run this in your Supabase SQL editor

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Optional: Add index on phone number for lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;

-- Add notification preferences to user_profiles if not exists
-- Update the default notification_settings to include SMS/email preferences
COMMENT ON COLUMN users.phone_number IS 'Phone number for SMS notifications (E.164 format preferred, e.g., +15551234567)';
