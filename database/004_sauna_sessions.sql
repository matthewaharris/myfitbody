-- Migration 004: sauna session tracking
-- Simple log of sauna visits: when, how hot, how long.

CREATE TABLE IF NOT EXISTS sauna_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  temperature_f INTEGER CHECK (temperature_f BETWEEN 60 AND 250),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 600),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sauna_sessions_user_date ON sauna_sessions(user_id, session_date DESC);

-- Same model as all other tables: RLS on, no policies (backend-only access)
ALTER TABLE sauna_sessions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_sauna_sessions_updated_at
  BEFORE UPDATE ON sauna_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
