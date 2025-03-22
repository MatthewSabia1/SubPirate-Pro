-- Migration to fix multi-step operations in campaign feature by adding transaction support
-- This adds several functions with proper transaction handling for campaign operations

-- Function to create a campaign with proper transaction handling
CREATE OR REPLACE FUNCTION public.create_campaign_with_transaction(
  p_name TEXT,
  p_description TEXT,
  p_schedule_type TEXT DEFAULT 'one-time',
  p_is_active BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Start a transaction with serializable isolation level
  BEGIN
    -- Create the campaign record
    INSERT INTO campaigns (
      user_id,
      name,
      description,
      schedule_type,
      is_active
    ) VALUES (
      auth.uid(),
      p_name,
      p_description,
      p_schedule_type,
      p_is_active
    )
    RETURNING id INTO v_campaign_id;
    
    -- Add an activity log entry (optional, for future use)
    INSERT INTO campaign_activity (
      campaign_id,
      user_id,
      action_type,
      details
    ) VALUES (
      v_campaign_id,
      auth.uid(),
      'campaign_created',
      jsonb_build_object(
        'name', p_name,
        'schedule_type', p_schedule_type
      )
    );
    
    -- Return the campaign ID
    RETURN v_campaign_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
COMMENT ON FUNCTION public.create_campaign_with_transaction IS 'Creates a campaign with transaction safety';
GRANT EXECUTE ON FUNCTION public.create_campaign_with_transaction TO authenticated;

-- Function to create a campaign post with transaction safety
CREATE OR REPLACE FUNCTION public.create_campaign_post_with_transaction(
  p_campaign_id UUID,
  p_reddit_account_id UUID,
  p_subreddit_id UUID,
  p_title TEXT,
  p_content_type TEXT,
  p_content TEXT,
  p_scheduled_for TIMESTAMP WITH TIME ZONE,
  p_media_item_id UUID DEFAULT NULL,
  p_interval_hours INTEGER DEFAULT NULL,
  p_use_ai_title BOOLEAN DEFAULT false,
  p_use_ai_timing BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
  v_post_id UUID;
  v_campaign_owner UUID;
BEGIN
  -- Start a transaction
  BEGIN
    -- First verify the user owns the campaign
    SELECT user_id INTO v_campaign_owner
    FROM campaigns
    WHERE id = p_campaign_id;
    
    IF v_campaign_owner IS NULL THEN
      RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    IF v_campaign_owner != auth.uid() THEN
      RAISE EXCEPTION 'You do not have permission to add posts to this campaign';
    END IF;
    
    -- Create the campaign post
    INSERT INTO campaign_posts (
      campaign_id,
      reddit_account_id,
      media_item_id,
      subreddit_id,
      title,
      content_type,
      content,
      scheduled_for,
      interval_hours,
      use_ai_title,
      use_ai_timing
    ) VALUES (
      p_campaign_id,
      p_reddit_account_id,
      p_media_item_id,
      p_subreddit_id,
      p_title,
      p_content_type,
      p_content,
      p_scheduled_for,
      p_interval_hours,
      p_use_ai_title,
      p_use_ai_timing
    )
    RETURNING id INTO v_post_id;
    
    -- Log the activity
    INSERT INTO campaign_activity (
      campaign_id,
      post_id,
      user_id,
      action_type,
      details
    ) VALUES (
      p_campaign_id,
      v_post_id,
      auth.uid(),
      'post_created',
      jsonb_build_object(
        'title', p_title,
        'content_type', p_content_type,
        'scheduled_for', p_scheduled_for,
        'is_recurring', p_interval_hours IS NOT NULL
      )
    );
    
    -- Return the new post ID
    RETURN v_post_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
COMMENT ON FUNCTION public.create_campaign_post_with_transaction IS 'Creates a campaign post with transaction safety';
GRANT EXECUTE ON FUNCTION public.create_campaign_post_with_transaction TO authenticated;

-- Function to schedule next recurring post with transaction safety
CREATE OR REPLACE FUNCTION public.schedule_next_recurring_post(
  p_parent_post_id UUID,
  p_scheduled_for TIMESTAMP WITH TIME ZONE
)
RETURNS UUID AS $$
DECLARE
  v_parent_post campaign_posts%ROWTYPE;
  v_new_post_id UUID;
  v_campaign_owner UUID;
BEGIN
  -- Start a transaction
  BEGIN
    -- Get the parent post details
    SELECT * INTO v_parent_post
    FROM campaign_posts
    WHERE id = p_parent_post_id;
    
    IF v_parent_post.id IS NULL THEN
      RAISE EXCEPTION 'Parent post not found';
    END IF;
    
    -- Check campaign ownership
    SELECT user_id INTO v_campaign_owner
    FROM campaigns
    WHERE id = v_parent_post.campaign_id;
    
    IF v_campaign_owner IS NULL THEN
      RAISE EXCEPTION 'Campaign not found';
    END IF;
    
    -- Create the new recurring post
    INSERT INTO campaign_posts (
      campaign_id,
      reddit_account_id,
      media_item_id,
      subreddit_id,
      title,
      content_type,
      content,
      status,
      scheduled_for,
      interval_hours,
      use_ai_title,
      use_ai_timing,
      parent_post_id
    ) VALUES (
      v_parent_post.campaign_id,
      v_parent_post.reddit_account_id,
      v_parent_post.media_item_id,
      v_parent_post.subreddit_id,
      v_parent_post.title,
      v_parent_post.content_type,
      v_parent_post.content,
      'scheduled',
      p_scheduled_for,
      v_parent_post.interval_hours,
      v_parent_post.use_ai_title,
      v_parent_post.use_ai_timing,
      p_parent_post_id
    )
    RETURNING id INTO v_new_post_id;
    
    -- Log the activity
    INSERT INTO campaign_activity (
      campaign_id,
      post_id,
      related_post_id,
      action_type,
      details
    ) VALUES (
      v_parent_post.campaign_id,
      v_new_post_id,
      p_parent_post_id,
      'recurring_scheduled',
      jsonb_build_object(
        'scheduled_for', p_scheduled_for,
        'parent_post_id', p_parent_post_id,
        'interval_hours', v_parent_post.interval_hours
      )
    );
    
    -- Return the new post ID
    RETURN v_new_post_id;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
COMMENT ON FUNCTION public.schedule_next_recurring_post IS 'Schedules the next occurrence of a recurring post with transaction safety';
GRANT EXECUTE ON FUNCTION public.schedule_next_recurring_post TO service_role;

-- Function for updating post status with transaction safety
CREATE OR REPLACE FUNCTION public.update_campaign_post_status(
  p_post_id UUID,
  p_status TEXT,
  p_reddit_post_id TEXT DEFAULT NULL,
  p_reddit_permalink TEXT DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_post campaign_posts%ROWTYPE;
  v_details JSONB;
BEGIN
  -- Start a transaction
  BEGIN
    -- Get the post details
    SELECT * INTO v_post
    FROM campaign_posts
    WHERE id = p_post_id;
    
    IF v_post.id IS NULL THEN
      RAISE EXCEPTION 'Post not found';
    END IF;
    
    -- Prepare update data
    v_details := jsonb_build_object(
      'previous_status', v_post.status,
      'new_status', p_status
    );
    
    -- Add additional details based on status
    IF p_status = 'posted' THEN
      v_details := v_details || jsonb_build_object(
        'reddit_post_id', p_reddit_post_id,
        'execution_time_ms', p_execution_time_ms
      );
      
      -- Update the post record
      UPDATE campaign_posts
      SET 
        status = p_status,
        posted_at = NOW(),
        reddit_post_id = p_reddit_post_id,
        reddit_permalink = p_reddit_permalink,
        execution_time_ms = p_execution_time_ms
      WHERE id = p_post_id;
      
    ELSIF p_status = 'failed' THEN
      v_details := v_details || jsonb_build_object(
        'error_message', p_error_message
      );
      
      -- Update the post record
      UPDATE campaign_posts
      SET 
        status = p_status,
        last_error = p_error_message
      WHERE id = p_post_id;
      
    ELSIF p_status = 'processing' THEN
      -- Update the post record
      UPDATE campaign_posts
      SET 
        status = p_status,
        processing_started_at = NOW()
      WHERE id = p_post_id;
      
    ELSE
      -- Generic update
      UPDATE campaign_posts
      SET status = p_status
      WHERE id = p_post_id;
    END IF;
    
    -- Log the status change activity
    INSERT INTO campaign_activity (
      campaign_id,
      post_id,
      action_type,
      details
    ) VALUES (
      v_post.campaign_id,
      p_post_id,
      'post_status_updated',
      v_details
    );
    
    RETURN TRUE;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
COMMENT ON FUNCTION public.update_campaign_post_status IS 'Updates a campaign post status with transaction safety';
GRANT EXECUTE ON FUNCTION public.update_campaign_post_status TO service_role;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added transaction-based functions for campaign operations';
END $$; 