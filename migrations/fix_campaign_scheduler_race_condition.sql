-- Migration to fix race condition in Campaign Scheduler
-- This adds functions for safely processing scheduled posts with advisory locks

-- Helper function to calculate a bigint hash from a UUID for use in advisory locks
CREATE OR REPLACE FUNCTION public.uuid_to_hashint(input_uuid UUID)
RETURNS bigint AS $$
DECLARE
  hex_str text;
  result bigint;
BEGIN
  -- Convert UUID to its hex representation without dashes
  hex_str := replace(input_uuid::text, '-', '');
  
  -- Take first 16 chars (64 bits) and convert to bigint
  -- This gives us a stable integer for any UUID that we can use for advisory locks
  result := ('x' || substring(hex_str, 1, 16))::bit(64)::bigint;
  
  -- Ensure it's positive to avoid issues with some lock functions
  IF result < 0 THEN
    result := -result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.uuid_to_hashint IS 
  'Converts a UUID to a stable bigint hash for use with advisory locks';
GRANT EXECUTE ON FUNCTION public.uuid_to_hashint TO service_role;

-- Function to safely claim a post for processing
CREATE OR REPLACE FUNCTION public.claim_post_for_processing(post_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_lock_acquired BOOLEAN;
  v_post_hash BIGINT;
  v_post campaign_posts%ROWTYPE;
BEGIN
  -- Convert post ID to a hash integer for advisory lock
  v_post_hash := public.uuid_to_hashint(post_id);
  
  -- Try to acquire an advisory lock (non-blocking)
  -- Returns true if lock was obtained, false if already locked
  v_lock_acquired := pg_try_advisory_xact_lock(v_post_hash);
  
  -- If we couldn't acquire the lock, another process has claimed this post
  IF NOT v_lock_acquired THEN
    RETURN FALSE;
  END IF;
  
  -- We got the lock, now check if the post is still in 'scheduled' status
  SELECT * INTO v_post
  FROM campaign_posts
  WHERE id = post_id AND status = 'scheduled'
  FOR UPDATE; -- Row-level lock to prevent concurrent updates
  
  -- If the post doesn't exist or is not in scheduled status, return false
  IF v_post.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mark post as processing
  UPDATE campaign_posts
  SET 
    status = 'processing',
    processing_started_at = NOW()
  WHERE id = post_id;
  
  -- Log the activity
  INSERT INTO campaign_activity (
    campaign_id,
    post_id,
    action_type,
    details
  ) VALUES (
    v_post.campaign_id,
    post_id,
    'processing_started',
    jsonb_build_object(
      'scheduled_for', v_post.scheduled_for,
      'processing_started_at', NOW()
    )
  );
  
  -- Return true to indicate successful claim
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.claim_post_for_processing IS 
  'Claims a post for processing using advisory locks to prevent race conditions';
GRANT EXECUTE ON FUNCTION public.claim_post_for_processing TO service_role;

-- Function to get the next batch of posts to process with locking
CREATE OR REPLACE FUNCTION public.get_posts_for_processing(
  batch_size INT DEFAULT 5,
  max_age_minutes INT DEFAULT 60
)
RETURNS SETOF campaign_posts AS $$
DECLARE
  v_post campaign_posts%ROWTYPE;
  v_now TIMESTAMP WITH TIME ZONE;
  v_claimed_count INT;
BEGIN
  v_now := NOW();
  v_claimed_count := 0;
  
  -- Find posts scheduled for now or earlier
  FOR v_post IN
    SELECT cp.* 
    FROM campaign_posts cp
    WHERE 
      cp.status = 'scheduled' AND
      cp.scheduled_for <= v_now AND
      v_now - cp.scheduled_for < make_interval(mins := max_age_minutes)
    ORDER BY cp.scheduled_for ASC
    LIMIT batch_size * 3 -- Get more than we need in case some can't be claimed
  LOOP
    -- Try to claim this post using our locking function
    IF public.claim_post_for_processing(v_post.id) THEN
      -- Successfully claimed, return this record to the caller
      RETURN NEXT v_post;
      
      -- Increment our counter
      v_claimed_count := v_claimed_count + 1;
      
      -- If we've claimed enough posts, exit
      IF v_claimed_count >= batch_size THEN
        EXIT;
      END IF;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_posts_for_processing IS 
  'Gets a batch of posts for processing with advisory locking to prevent race conditions';
GRANT EXECUTE ON FUNCTION public.get_posts_for_processing TO service_role;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added advisory locking functions for campaign scheduler';
END $$; 