-- Media Items Security Update
-- This migration adds security-related columns to the media_items table
-- to support enhanced file validation and security features

-- Add columns to media_items table
ALTER TABLE media_items 
ADD COLUMN IF NOT EXISTS original_extension TEXT,
ADD COLUMN IF NOT EXISTS validated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS validation_method TEXT;

-- Update existing records to have default values
UPDATE media_items
SET 
  original_extension = CASE 
    WHEN position('.' in filename) > 0 
    THEN lower(substring(filename from position('.' in filename) + 1))
    ELSE ''
  END,
  validated = TRUE,
  validation_method = 'retroactive'
WHERE original_extension IS NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN media_items.original_extension IS 'Original file extension for security validation';
COMMENT ON COLUMN media_items.validated IS 'Whether the file has been validated for security';
COMMENT ON COLUMN media_items.validation_method IS 'Method used for validating the file (mime+extension, content, etc)';

-- Update RLS policies to account for new columns
DO $$
BEGIN
  -- Check if policy exists first
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'media_items'
    AND policyname = 'Media items are viewable by owners'
  ) THEN
    -- Drop existing policy
    DROP POLICY "Media items are viewable by owners" ON media_items;
  END IF;

  -- Create updated policy
  CREATE POLICY "Media items are viewable by owners" ON media_items
    FOR SELECT
    USING (auth.uid() = user_id);

  -- Update insert policy if needed
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'media_items'
    AND policyname = 'Media items can be inserted by authenticated users'
  ) THEN
    -- Drop existing policy
    DROP POLICY "Media items can be inserted by authenticated users" ON media_items;
  END IF;

  -- Create updated insert policy
  CREATE POLICY "Media items can be inserted by authenticated users" ON media_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

END $$; 