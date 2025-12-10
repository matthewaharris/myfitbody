-- Migration 008: Engagement Features
-- Adds mood check-ins, achievement badges, notification settings, and journal entries

-- =============================================
-- MOOD/ENERGY CHECK-INS
-- =============================================

CREATE TABLE IF NOT EXISTS mood_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mood_rating INTEGER NOT NULL CHECK (mood_rating >= 1 AND mood_rating <= 5),
    energy_rating INTEGER NOT NULL CHECK (energy_rating >= 1 AND energy_rating <= 5),
    notes TEXT,
    checkin_type TEXT DEFAULT 'general', -- 'general', 'post_workout', 'post_meal', 'morning', 'evening'
    related_workout_id UUID REFERENCES workouts(id) ON DELETE SET NULL,
    related_meal_id UUID REFERENCES meals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mood_checkins_user ON mood_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_checkins_date ON mood_checkins(user_id, created_at);

-- =============================================
-- ACHIEVEMENT BADGES
-- =============================================

-- Badge definitions (system-wide)
CREATE TABLE IF NOT EXISTS badge_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    icon TEXT NOT NULL, -- emoji or icon name
    category TEXT NOT NULL, -- 'workout', 'nutrition', 'streak', 'milestone', 'special'
    requirement_type TEXT NOT NULL, -- 'count', 'streak', 'first', 'total'
    requirement_value INTEGER NOT NULL, -- the number needed to unlock
    requirement_metric TEXT NOT NULL, -- 'workouts', 'meals', 'days', 'reps', 'calories_burned', etc.
    points INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's earned badges
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badge_definitions(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    notified BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);

-- Insert default badge definitions
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
-- PUSH NOTIFICATION SETTINGS & SCHEDULED REMINDERS
-- =============================================

-- Enhanced notification settings in user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS reminder_settings JSONB DEFAULT '{
    "breakfast_reminder": {"enabled": false, "time": "08:00"},
    "lunch_reminder": {"enabled": false, "time": "12:00"},
    "dinner_reminder": {"enabled": false, "time": "18:00"},
    "workout_reminder": {"enabled": false, "time": "17:00", "days": ["mon", "wed", "fri"]},
    "water_reminder": {"enabled": false, "interval_hours": 2},
    "mood_checkin_reminder": {"enabled": false, "time": "21:00"},
    "inactivity_reminder": {"enabled": true, "days_threshold": 3}
}';

-- Notification history (for tracking what was sent)
CREATE TABLE IF NOT EXISTS notification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'meal_reminder', 'workout_reminder', 'inactivity', 'achievement', 'streak'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notification_history_user ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent ON notification_history(sent_at);

-- =============================================
-- JOURNAL ENTRIES
-- =============================================

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    title TEXT,
    content TEXT, -- user's written content
    auto_summary JSONB DEFAULT '{}', -- auto-generated summary data
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    tags TEXT[] DEFAULT '{}',
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_date ON journal_entries(user_id, entry_date);

-- =============================================
-- USER STATS TRACKING (for badge calculations)
-- =============================================

-- Running totals for efficient badge checking
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

-- Function to update user stats after workout
CREATE OR REPLACE FUNCTION update_user_stats_workout()
RETURNS TRIGGER AS $$
DECLARE
    v_streak INTEGER;
    v_last_date DATE;
BEGIN
    -- Get or create user stats
    INSERT INTO user_stats (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;

    -- Get current stats
    SELECT last_workout_date, current_workout_streak INTO v_last_date, v_streak
    FROM user_stats WHERE user_id = NEW.user_id;

    -- Update streak
    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := 1;
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
    END IF;
    -- If same day, don't change streak

    -- Update stats
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
    -- Get or create user stats
    INSERT INTO user_stats (user_id) VALUES (NEW.user_id) ON CONFLICT (user_id) DO NOTHING;

    -- Get current stats
    SELECT last_meal_date, current_meal_streak INTO v_last_date, v_streak
    FROM user_stats WHERE user_id = NEW.user_id;

    -- Update streak (only count once per day)
    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := 1;
    ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
        v_streak := v_streak + 1;
    END IF;

    -- Update stats
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

-- Create triggers
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
