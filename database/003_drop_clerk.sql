-- Migration 003: remove Clerk remnants
-- Run after the Supabase Auth migration (002) is proven in production.
-- All identity now flows through users.auth_user_id.

DROP INDEX IF EXISTS idx_users_clerk_id;

ALTER TABLE users DROP COLUMN IF EXISTS clerk_user_id;
