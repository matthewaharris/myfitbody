-- Migration 007: Admin Features
-- Adds user suspension and admin management fields

-- Add suspension fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_by TEXT;

-- Add admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add last_active tracking for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ;

-- Create admin audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster admin queries
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at);

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update last_active when user logs activity
-- (triggers on workouts, meals, water_intake)
DROP TRIGGER IF EXISTS update_last_active_on_workout ON workouts;
CREATE TRIGGER update_last_active_on_workout
    AFTER INSERT ON workouts
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_active();

DROP TRIGGER IF EXISTS update_last_active_on_meal ON meals;
CREATE TRIGGER update_last_active_on_meal
    AFTER INSERT ON meals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_active();

DROP TRIGGER IF EXISTS update_last_active_on_water ON water_intake;
CREATE TRIGGER update_last_active_on_water
    AFTER INSERT ON water_intake
    FOR EACH ROW
    EXECUTE FUNCTION update_user_last_active();
