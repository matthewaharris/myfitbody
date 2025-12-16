-- Migration: Quick Wins Features
-- 1. Workout Templates/Favorites
-- 2. Meal Favorites
-- 3. Progress Photos

-- Add template and favorite flags to workouts
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS template_name TEXT;

-- Add favorite flag to meals
ALTER TABLE meals ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT FALSE;

-- Add photo URL to body measurements
ALTER TABLE body_measurements ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create index for faster template/favorite queries
CREATE INDEX IF NOT EXISTS idx_workouts_template ON workouts(user_id, is_template) WHERE is_template = TRUE;
CREATE INDEX IF NOT EXISTS idx_workouts_favorite ON workouts(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_meals_favorite ON meals(user_id, is_favorite) WHERE is_favorite = TRUE;

-- Create view for recent exercise history (last performance per exercise)
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

-- ============================================
-- STORAGE SETUP (Run in Supabase Dashboard)
-- ============================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket called "progress-photos"
-- 3. Set it to Public (so images can be viewed)
-- 4. Add the following RLS policy:

-- Storage bucket policy (run in SQL editor):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', true);

-- Storage RLS policies:
-- CREATE POLICY "Users can upload their own photos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own photos"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own photos"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
