-- Migration: AI Features Setup
-- 1. Add food_preferences column to user_profiles
-- 2. Prepare for AI-powered features

-- =============================================
-- FOOD PREFERENCES
-- =============================================

-- Add food_preferences JSONB column to store loved and avoided foods
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS food_preferences JSONB DEFAULT '{"lovedFoods": [], "avoidedFoods": []}';

-- Comment on the column for documentation
COMMENT ON COLUMN user_profiles.food_preferences IS 'JSON object containing lovedFoods and avoidedFoods arrays for AI recipe recommendations';

-- =============================================
-- AI GENERATED CONTENT TRACKING (Optional - for future analytics)
-- =============================================

-- Table to store AI-generated workouts for tracking/feedback
CREATE TABLE IF NOT EXISTS ai_generated_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_workout JSONB NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table to store AI-generated recipes for tracking/feedback
CREATE TABLE IF NOT EXISTS ai_generated_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  generated_recipe JSONB NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  was_used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ai_workouts_user ON ai_generated_workouts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recipes_user ON ai_generated_recipes(user_id, created_at DESC);
