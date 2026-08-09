-- Cannabis Boggle tables

-- Game rooms
CREATE TABLE boggle_games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  board TEXT[] NOT NULL,           -- 16 letters (4x4 grid), stored as array
  status TEXT DEFAULT 'waiting',   -- waiting, playing, finished
  created_by TEXT REFERENCES team(id),
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Players in each game
CREATE TABLE boggle_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES boggle_games(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES team(id),
  ready BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, player_id)
);

-- Words submitted by each player
CREATE TABLE boggle_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES boggle_games(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES team(id),
  word TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT true,  -- false if another player also found it
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable realtime for multiplayer sync
ALTER PUBLICATION supabase_realtime ADD TABLE boggle_games;
ALTER PUBLICATION supabase_realtime ADD TABLE boggle_players;

-- Index for quick lookups
CREATE INDEX idx_boggle_games_status ON boggle_games(status);
CREATE INDEX idx_boggle_players_game ON boggle_players(game_id);
CREATE INDEX idx_boggle_words_game ON boggle_words(game_id);
