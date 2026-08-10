-- Google Reviews table
-- Drop old table if it exists with wrong schema
DROP TABLE IF EXISTS google_reviews;

CREATE TABLE google_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  google_review_id TEXT UNIQUE,         -- dedup key from Google/Zapier
  customer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,              -- 1-5 stars
  review_text TEXT,
  review_date TIMESTAMPTZ DEFAULT now(),
  reply_text TEXT,                       -- owner reply if any
  mentioned_staff TEXT[] DEFAULT '{}',   -- staff first names detected in review
  points_awarded BOOLEAN DEFAULT false,  -- whether points were already given
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for now
ALTER TABLE google_reviews DISABLE ROW LEVEL SECURITY;

-- Index for display
CREATE INDEX idx_google_reviews_date ON google_reviews(review_date DESC);
