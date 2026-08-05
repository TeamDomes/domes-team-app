-- Points tracking table
CREATE TABLE IF NOT EXISTS points_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_member_id TEXT REFERENCES team(id) NOT NULL,
  points INTEGER NOT NULL,
  activity TEXT NOT NULL,
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated" ON points_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow insert for authenticated" ON points_log
  FOR INSERT TO authenticated WITH CHECK (true);

-- Index for fast weekly queries
CREATE INDEX idx_points_log_member ON points_log(team_member_id);
CREATE INDEX idx_points_log_created ON points_log(created_at);
