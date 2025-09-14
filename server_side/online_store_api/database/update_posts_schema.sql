-- Add category and tags fields to posts table
ALTER TABLE posts 
ADD COLUMN category VARCHAR(50) DEFAULT 'General',
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Update existing posts to have default category
UPDATE posts SET category = 'General' WHERE category IS NULL;

-- Add index for better performance on category filtering
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);
