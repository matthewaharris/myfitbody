-- Migration 002: Supabase Auth (Clerk -> Supabase migration)
-- Adds users.auth_user_id to hold the Supabase Auth UID.
-- users.id stays the PK for all FKs; existing rows get linked by email
-- on first sign-in (see backend getOrLinkUserByAuthId).

ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON users(auth_user_id);

-- New users created via Supabase Auth have no Clerk id
ALTER TABLE users ALTER COLUMN clerk_user_id DROP NOT NULL;
