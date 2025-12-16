-- Migration: Medium Effort Features
-- 1. Water Intake Tracking
-- 2. Workout Streak Tracking (uses existing tables with queries)
-- 3. Recipe Saving
-- 4. Stats Summary (uses existing tables with queries)

-- =============================================
-- WATER INTAKE TRACKING
-- =============================================

-- Create water_intake table
CREATE TABLE IF NOT EXISTS water_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount_oz DECIMAL(6,2) NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, logged_at);

-- Add water goal to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_water_goal_oz INTEGER DEFAULT 64;

-- =============================================
-- RECIPE SAVING
-- =============================================

-- Create recipes table
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

-- Create recipe_ingredients table
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

-- Indexes for recipes
CREATE INDEX IF NOT EXISTS idx_recipes_user ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_recipes_favorite ON recipes(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);

-- =============================================
-- VIEWS FOR STREAK TRACKING
-- =============================================

-- View for daily workout counts by user
CREATE OR REPLACE VIEW daily_workout_counts AS
SELECT
  user_id,
  DATE(workout_date) as workout_day,
  COUNT(*) as workout_count
FROM workouts
WHERE is_template = FALSE OR is_template IS NULL
GROUP BY user_id, DATE(workout_date);

-- View for daily meal counts by user
CREATE OR REPLACE VIEW daily_meal_counts AS
SELECT
  user_id,
  DATE(meal_date) as meal_day,
  COUNT(*) as meal_count
FROM meals
GROUP BY user_id, DATE(meal_date);

-- =============================================
-- VIEWS FOR STATS SUMMARY
-- =============================================

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

-- Weight trend view (from body_measurements)
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
