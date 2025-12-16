-- =============================================
-- MyFitBody Complete Database Schema
-- =============================================
-- This script creates the complete database from scratch.
-- Run this in Supabase SQL Editor to set up a fresh database.
--
-- Last updated: 2024
-- Includes: Base schema + all migrations (002-008)
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table (extends Clerk authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  push_token TEXT,
  is_suspended BOOLEAN DEFAULT FALSE,
  suspension_reason TEXT,
  suspended_at TIMESTAMPTZ,
  suspended_by TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  starting_weight DECIMAL(6,2),
  weight_unit TEXT DEFAULT 'lb' CHECK (weight_unit IN ('lb', 'kg')),
  food_preferences JSONB DEFAULT '{"lovedFoods": [], "avoidedFoods": []}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  weight_goal TEXT CHECK (weight_goal IN ('build_muscle', 'lose_fat', 'maintain', 'recomp')),
  macro_targets JSONB DEFAULT '{"protein": 150, "carbs": 200, "fat": 60, "calories": 2000}',
  meal_preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{"enableMoodCheckins": true, "enableCaloriePrompts": true, "quietHoursStart": 22, "quietHoursEnd": 7}',
  daily_water_goal_oz INTEGER DEFAULT 64,
  reminder_settings JSONB DEFAULT '{
    "breakfast_reminder": {"enabled": false, "time": "08:00"},
    "lunch_reminder": {"enabled": false, "time": "12:00"},
    "dinner_reminder": {"enabled": false, "time": "18:00"},
    "workout_reminder": {"enabled": false, "time": "17:00", "days": ["mon", "wed", "fri"]},
    "water_reminder": {"enabled": false, "interval_hours": 2},
    "mood_checkin_reminder": {"enabled": false, "time": "21:00"},
    "inactivity_reminder": {"enabled": true, "days_threshold": 3}
  }',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Exercises
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_groups TEXT[] DEFAULT '{}',
  equipment_type TEXT CHECK (equipment_type IN ('bodyweight', 'dumbbells', 'barbell', 'machine', 'other')),
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  is_system_exercise BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workouts
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  workout_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  name TEXT,
  notes TEXT,
  duration_minutes INTEGER,
  estimated_calories_burned INTEGER,
  is_template BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  template_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout Exercises (junction table)
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(6,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meals (Food Logging)
CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  fiber DECIMAL(6,2),
  sugar DECIMAL(6,2),
  serving_size DECIMAL(8,2),
  serving_unit TEXT,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Body Measurements
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  measurement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight DECIMAL(6,2),
  body_fat_percentage DECIMAL(5,2),
  muscle_mass_percentage DECIMAL(5,2),
  measurements JSONB DEFAULT '{}',
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, measurement_date)
);

-- =============================================
-- WATER INTAKE TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS water_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_oz DECIMAL(6,2) NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RECIPE SAVING
-- =============================================

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_calories INTEGER,
  total_protein DECIMAL(6,2),
  total_carbs DECIMAL(6,2),
  total_fat DECIMAL(6,2),
  servings INTEGER DEFAULT 1,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  serving_size DECIMAL(8,2),
  serving_unit TEXT DEFAULT 'g',
  calories INTEGER,
  protein DECIMAL(6,2),
  carbs DECIMAL(6,2),
  fat DECIMAL(6,2),
  fiber DECIMAL(6,2),
  sugar DECIMAL(6,2),
  order_index INTEGER DEFAULT 0
);

-- =============================================
-- AI GENERATED CONTENT TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS ai_generated_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_workout JSONB NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_generated_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_recipe JSONB NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADMIN AUDIT LOG
-- =============================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- MOOD CHECK-INS
-- =============================================

CREATE TABLE IF NOT EXISTS mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mood_rating INTEGER NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 5),
  energy_rating INTEGER NOT NULL CHECK (energy_rating >= 1 AND energy_rating <= 5),
  notes TEXT,
  checkin_type TEXT DEFAULT 'general',
  related_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
  related_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ACHIEVEMENT BADGES
-- =============================================

CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  requirement_metric TEXT NOT NULL,
  points INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, badge_id)
);

-- =============================================
-- NOTIFICATION HISTORY
-- =============================================

CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  data JSONB DEFAULT '{}'
);

-- =============================================
-- JOURNAL ENTRIES
-- =============================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  title TEXT,
  content TEXT,
  auto_summary JSONB DEFAULT '{}',
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- =============================================
-- USER STATS TRACKING
-- =============================================

CREATE TABLE IF NOT EXISTS user_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_workouts INTEGER DEFAULT 0,
  total_meals INTEGER DEFAULT 0,
  total_checkins INTEGER DEFAULT 0,
  current_workout_streak INTEGER DEFAULT 0,
  longest_workout_streak INTEGER DEFAULT 0,
  current_meal_streak INTEGER DEFAULT 0,
  longest_meal_streak INTEGER DEFAULT 0,
  current_water_streak INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  total_calories_burned INTEGER DEFAULT 0,
  last_workout_date DATE,
  last_meal_date DATE,
  last_water_goal_met DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_push_token ON users(push_token) WHERE push_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_is_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);

CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_workouts_template ON workouts(user_id, is_template) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_workouts_favorite ON workouts(user_id, is_favorite) WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_favorite ON meals(user_id, is_favorite) WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measurement_date DESC);

CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, logged_at);

CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON recipes(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

CREATE INDEX IF NOT EXISTS idx_ai_workouts_user ON ai_generated_workouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recipes_user ON ai_generated_recipes(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log(created_at);

CREATE INDEX IF NOT EXISTS idx_mood_checkins_user ON mood_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_date ON mood_checkins(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent ON notification_history(sent_at);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(user_id, entry_date);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are not enforced when using service_role key (backend)
-- These policies would apply if you're using the anon key from frontend

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update last_active timestamp
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE users SET last_active = NOW() WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after workout
CREATE OR REPLACE FUNCTION update_user_stats_workout()
RETURNS TRIGGER AS $$
DECLARE
    v_streak INTEGER;
    v_last_date DATE;
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;

    SELECT last_workout_date, current_workout_streak INTO v_last_date, v_streak
    FROM user_stats WHERE user_id = NEW.user_id;

    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := 1;
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
    END IF;

    UPDATE user_stats SET
        total_workouts = total_workouts + 1,
        current_workout_streak = v_streak,
        longest_workout_streak = GREATEST(longest_workout_streak, v_streak),
        last_workout_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update user stats after meal
CREATE OR REPLACE FUNCTION update_user_stats_meal()
RETURNS TRIGGER AS $$
DECLARE
    v_streak INTEGER;
    v_last_date DATE;
BEGIN
    INSERT INTO user_stats (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;

    SELECT last_meal_date, current_meal_streak INTO v_last_date, v_streak
    FROM user_stats WHERE user_id = NEW.user_id;

    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := 1;
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
    END IF;

    UPDATE user_stats SET
        total_meals = total_meals + 1,
        current_meal_streak = CASE WHEN v_last_date = CURRENT_DATE THEN current_meal_streak ELSE v_streak END,
        longest_meal_streak = GREATEST(longest_meal_streak, v_streak),
        last_meal_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exercises_updated_at ON exercises;
CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workouts_updated_at ON workouts;
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Triggers for last_active
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

-- Triggers for user stats
DROP TRIGGER IF EXISTS update_stats_on_workout ON workouts;
CREATE TRIGGER update_stats_on_workout
    AFTER INSERT ON workouts
    FOR EACH ROW
    WHEN (NEW.is_template IS NOT TRUE)
    EXECUTE FUNCTION update_user_stats_workout();

DROP TRIGGER IF EXISTS update_stats_on_meal ON meals;
CREATE TRIGGER update_stats_on_meal
    AFTER INSERT ON meals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_stats_meal();

-- =============================================
-- VIEWS
-- =============================================

-- View for recent exercise history
CREATE OR REPLACE VIEW exercise_last_performance AS
SELECT DISTINCT ON (we.exercise_id, w.user_id)
  we.exercise_id,
  w.user_id,
  we.sets,
  we.reps,
  we.weight,
  w.workout_date,
  e.name as exercise_name
FROM workout_exercises we
JOIN workouts w ON we.workout_id = w.id
JOIN exercises e ON we.exercise_id = e.id
WHERE w.is_template = FALSE OR w.is_template IS NULL
ORDER BY we.exercise_id, w.user_id, w.workout_date DESC;

-- View for daily workout counts
CREATE OR REPLACE VIEW daily_workout_counts AS
SELECT
  user_id,
  DATE(workout_date) as workout_day,
  COUNT(*) as workout_count
FROM workouts
WHERE is_template = FALSE OR is_template IS NULL
GROUP BY user_id, DATE(workout_date);

-- View for daily meal counts
CREATE OR REPLACE VIEW daily_meal_counts AS
SELECT
  user_id,
  DATE(meal_date) as meal_day,
  COUNT(*) as meal_count
FROM meals
GROUP BY user_id, DATE(meal_date);

-- Weekly calorie summary
CREATE OR REPLACE VIEW weekly_calorie_summary AS
SELECT
  user_id,
  DATE_TRUNC('week', meal_date) as week_start,
  SUM(calories) as total_calories,
  AVG(calories) as avg_daily_calories,
  SUM(protein) as total_protein,
  SUM(carbs) as total_carbs,
  SUM(fat) as total_fat,
  COUNT(DISTINCT DATE(meal_date)) as days_logged
FROM meals
GROUP BY user_id, DATE_TRUNC('week', meal_date);

-- Weekly workout summary
CREATE OR REPLACE VIEW weekly_workout_summary AS
SELECT
  user_id,
  DATE_TRUNC('week', workout_date) as week_start,
  COUNT(*) as workout_count,
  SUM(estimated_calories_burned) as total_burned,
  SUM(duration_minutes) as total_duration
FROM workouts
WHERE is_template = FALSE OR is_template IS NULL
GROUP BY user_id, DATE_TRUNC('week', workout_date);

-- Weight trend view
CREATE OR REPLACE VIEW weight_trend AS
SELECT
  user_id,
  measurement_date,
  weight,
  body_fat_percentage,
  LAG(weight) OVER (PARTITION BY user_id ORDER BY measurement_date) as previous_weight,
  weight - LAG(weight) OVER (PARTITION BY user_id ORDER BY measurement_date) as weight_change
FROM body_measurements
WHERE weight IS NOT NULL
ORDER BY user_id, measurement_date;

-- =============================================
-- SEED DATA
-- =============================================

-- Seed system exercises
INSERT INTO exercises (name, description, muscle_groups, equipment_type, difficulty, is_system_exercise, user_id) VALUES
  ('Push-ups', 'Classic bodyweight chest exercise', ARRAY['chest', 'triceps', 'shoulders'], 'bodyweight', 'beginner', TRUE, NULL),
  ('Squats', 'Fundamental lower body exercise', ARRAY['quads', 'glutes', 'hamstrings'], 'bodyweight', 'beginner', TRUE, NULL),
  ('Plank', 'Core stability exercise', ARRAY['core', 'abs'], 'bodyweight', 'beginner', TRUE, NULL),
  ('Lunges', 'Single-leg lower body exercise', ARRAY['quads', 'glutes'], 'bodyweight', 'beginner', TRUE, NULL),
  ('Pull-ups', 'Upper body pulling exercise', ARRAY['back', 'biceps'], 'bodyweight', 'intermediate', TRUE, NULL),
  ('Burpees', 'Full body cardio exercise', ARRAY['full_body'], 'bodyweight', 'intermediate', TRUE, NULL),
  ('Mountain Climbers', 'Dynamic core and cardio exercise', ARRAY['core', 'cardio'], 'bodyweight', 'beginner', TRUE, NULL),
  ('Jumping Jacks', 'Cardio warm-up exercise', ARRAY['cardio'], 'bodyweight', 'beginner', TRUE, NULL)
ON CONFLICT DO NOTHING;

-- Seed badge definitions
INSERT INTO badge_definitions (name, description, icon, category, requirement_type, requirement_value, requirement_metric, points) VALUES
-- First actions
('First Workout', 'Complete your first workout', '🏋️', 'milestone', 'first', 1, 'workouts', 10),
('First Meal', 'Log your first meal', '🍽️', 'milestone', 'first', 1, 'meals', 10),
('First Check-in', 'Complete your first mood check-in', '😊', 'milestone', 'first', 1, 'checkins', 10),
('Profile Complete', 'Fill out your complete profile', '✅', 'milestone', 'first', 1, 'profile', 10),
-- Workout count milestones
('Getting Started', 'Complete 5 workouts', '💪', 'workout', 'count', 5, 'workouts', 20),
('Committed', 'Complete 25 workouts', '🔥', 'workout', 'count', 25, 'workouts', 50),
('Dedicated', 'Complete 50 workouts', '⭐', 'workout', 'count', 50, 'workouts', 100),
('Fitness Enthusiast', 'Complete 100 workouts', '🏆', 'workout', 'count', 100, 'workouts', 200),
('Iron Will', 'Complete 250 workouts', '🥇', 'workout', 'count', 250, 'workouts', 500),
-- Meal count milestones
('Tracking Meals', 'Log 10 meals', '🥗', 'nutrition', 'count', 10, 'meals', 20),
('Nutrition Aware', 'Log 50 meals', '🥑', 'nutrition', 'count', 50, 'meals', 50),
('Macro Master', 'Log 100 meals', '📊', 'nutrition', 'count', 100, 'meals', 100),
('Nutrition Expert', 'Log 500 meals', '🎯', 'nutrition', 'count', 500, 'meals', 300),
-- Streak badges
('3-Day Streak', 'Work out 3 days in a row', '🔥', 'streak', 'streak', 3, 'workout_days', 30),
('Week Warrior', 'Work out 7 days in a row', '💥', 'streak', 'streak', 7, 'workout_days', 75),
('Two Week Titan', 'Work out 14 days in a row', '⚡', 'streak', 'streak', 14, 'workout_days', 150),
('Monthly Monster', 'Work out 30 days in a row', '👑', 'streak', 'streak', 30, 'workout_days', 300),
-- Logging streaks
('Consistent Logger', 'Log meals for 7 days straight', '📝', 'streak', 'streak', 7, 'meal_days', 50),
('Tracking Pro', 'Log meals for 30 days straight', '📈', 'streak', 'streak', 30, 'meal_days', 200),
-- Special achievements
('Early Bird', 'Complete a workout before 7am', '🌅', 'special', 'first', 1, 'early_workout', 25),
('Night Owl', 'Complete a workout after 9pm', '🌙', 'special', 'first', 1, 'late_workout', 25),
('Weekend Warrior', 'Work out on both Saturday and Sunday', '🎉', 'special', 'first', 1, 'weekend_workout', 25),
('Hydration Hero', 'Meet your water goal 7 days in a row', '💧', 'streak', 'streak', 7, 'water_goal', 50)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- STORAGE SETUP (Manual Steps in Supabase Dashboard)
-- =============================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "progress-photos"
-- 3. Set it to Public (so images can be viewed)
-- 4. The policies below are optional if using service_role key

-- Storage bucket (uncomment if running manually):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);

-- =============================================
-- SETUP COMPLETE
-- =============================================
-- After running this script:
-- 1. Create 'progress-photos' storage bucket in Supabase Dashboard
-- 2. Set up Clerk authentication
-- 3. Configure environment variables
-- 4. Deploy backend to Render
