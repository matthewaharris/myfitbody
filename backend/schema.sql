-- MyFitBody Database Schema (MVP)
-- PostgreSQL/Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Clerk authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  food_preferences JSONB DEFAULT '{}',
  dietary_restrictions TEXT[] DEFAULT '{}',
  weight_goal TEXT CHECK (weight_goal IN ('build_muscle', 'lose_fat', 'maintain', 'recomp')),
  macro_targets JSONB DEFAULT '{"protein": 150, "carbs": 200, "fat": 60, "calories": 2000}',
  meal_preferences JSONB DEFAULT '{}',
  notification_settings JSONB DEFAULT '{"enableMoodCheckins": true, "enableCaloriePrompts": true, "quietHoursStart": 22, "quietHoursEnd": 7}',
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
  sugar DECIMAL(6,2),
  serving_size TEXT,
  notes TEXT,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, measurement_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_date ON body_measurements(user_id, measurement_date DESC);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (using Clerk JWT)
-- Note: In Supabase, we'll use custom claims from Clerk JWT

-- Users can only see their own data
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY users_insert_own ON users
  FOR INSERT
  WITH CHECK (clerk_user_id = auth.jwt() ->> 'sub');

CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (clerk_user_id = auth.jwt() ->> 'sub');

-- User Profiles
CREATE POLICY user_profiles_all ON user_profiles
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Exercises (users can see their own + system exercises)
CREATE POLICY exercises_select ON exercises
  FOR SELECT
  USING (
    user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    OR is_system_exercise = TRUE
  );

CREATE POLICY exercises_insert ON exercises
  FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY exercises_update ON exercises
  FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

CREATE POLICY exercises_delete ON exercises
  FOR DELETE
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Workouts
CREATE POLICY workouts_all ON workouts
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Workout Exercises
CREATE POLICY workout_exercises_all ON workout_exercises
  FOR ALL
  USING (
    workout_id IN (
      SELECT id FROM workouts
      WHERE user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub')
    )
  );

-- Meals
CREATE POLICY meals_all ON meals
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Body Measurements
CREATE POLICY body_measurements_all ON body_measurements
  FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE clerk_user_id = auth.jwt() ->> 'sub'));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed some system exercises
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
