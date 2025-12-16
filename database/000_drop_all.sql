-- =============================================
-- MyFitBody Database Drop Script
-- =============================================
-- WARNING: This script drops ALL tables and data!
-- Only run this when you want to completely reset the database.
-- Run 001_complete_schema.sql after this to recreate.
-- =============================================

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS weight_trend CASCADE;
DROP VIEW IF EXISTS weekly_workout_summary CASCADE;
DROP VIEW IF EXISTS weekly_calorie_summary CASCADE;
DROP VIEW IF EXISTS daily_meal_counts CASCADE;
DROP VIEW IF EXISTS daily_workout_counts CASCADE;
DROP VIEW IF EXISTS exercise_last_performance CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS update_stats_on_meal ON meals;
DROP TRIGGER IF EXISTS update_stats_on_workout ON workouts;
DROP TRIGGER IF EXISTS update_last_active_on_water ON water_intake;
DROP TRIGGER IF EXISTS update_last_active_on_meal ON meals;
DROP TRIGGER IF EXISTS update_last_active_on_workout ON workouts;
DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_stats_meal() CASCADE;
DROP FUNCTION IF EXISTS update_user_stats_workout() CASCADE;
DROP FUNCTION IF EXISTS update_user_last_active() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS user_stats CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS notification_history CASCADE;
DROP TABLE IF EXISTS user_badges CASCADE;
DROP TABLE IF EXISTS badge_definitions CASCADE;
DROP TABLE IF EXISTS mood_checkins CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS ai_generated_recipes CASCADE;
DROP TABLE IF EXISTS ai_generated_workouts CASCADE;
DROP TABLE IF EXISTS recipe_ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS water_intake CASCADE;
DROP TABLE IF EXISTS body_measurements CASCADE;
DROP TABLE IF EXISTS workout_exercises CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS workouts CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Verify cleanup
SELECT 'All tables dropped successfully' as status;
