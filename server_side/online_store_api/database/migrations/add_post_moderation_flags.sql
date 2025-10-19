-- Add moderation/status flags to posts table
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure existing rows have non-null values
UPDATE posts SET 
  is_pinned = COALESCE(is_pinned, FALSE),
  is_locked = COALESCE(is_locked, FALSE),
  is_hidden = COALESCE(is_hidden, FALSE),
  is_flagged = COALESCE(is_flagged, FALSE)
WHERE TRUE;

-- Optional: indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_posts_is_locked ON posts(is_locked);
CREATE INDEX IF NOT EXISTS idx_posts_is_hidden ON posts(is_hidden);
CREATE INDEX IF NOT EXISTS idx_posts_is_flagged ON posts(is_flagged);


