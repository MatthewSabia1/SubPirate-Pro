-- Migration: Enhance Reddit Token Refresh Mechanism
-- Description: Adds columns to track token refresh attempts, errors, and success

-- Check if the columns already exist before adding them
DO $$
BEGIN
    -- Add refresh_attempts column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reddit_accounts' AND column_name = 'refresh_attempts') THEN
        ALTER TABLE reddit_accounts ADD COLUMN refresh_attempts INTEGER DEFAULT 0;
    END IF;

    -- Add refresh_error column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reddit_accounts' AND column_name = 'refresh_error') THEN
        ALTER TABLE reddit_accounts ADD COLUMN refresh_error TEXT DEFAULT NULL;
    END IF;

    -- Add last_token_refresh column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reddit_accounts' AND column_name = 'last_token_refresh') THEN
        ALTER TABLE reddit_accounts ADD COLUMN last_token_refresh TIMESTAMPTZ DEFAULT NULL;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'reddit_accounts' AND column_name = 'is_active') THEN
        ALTER TABLE reddit_accounts ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;

-- Initialize existing accounts with default values
UPDATE reddit_accounts
SET 
    refresh_attempts = 0,
    refresh_error = NULL,
    last_token_refresh = token_expiry,  -- Use token_expiry as an approximate last refresh time
    is_active = TRUE
WHERE refresh_attempts IS NULL;

-- Add comment to explain fields
COMMENT ON COLUMN reddit_accounts.refresh_attempts IS 'Number of consecutive failed token refresh attempts';
COMMENT ON COLUMN reddit_accounts.refresh_error IS 'Most recent error message when refreshing token';
COMMENT ON COLUMN reddit_accounts.last_token_refresh IS 'Timestamp of the last token refresh attempt';
COMMENT ON COLUMN reddit_accounts.is_active IS 'Whether the account is currently active and usable';

-- Create an index on is_active to speed up queries that filter for active accounts
CREATE INDEX IF NOT EXISTS idx_reddit_accounts_is_active ON reddit_accounts(is_active); 