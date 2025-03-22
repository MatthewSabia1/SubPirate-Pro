-- Campaign Activity Tracking Database Migration
-- This migration adds campaign activity tracking and enhances the existing campaign tables

-- Add campaign_activity table for tracking campaign events
CREATE TABLE IF NOT EXISTS campaign_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add RLS policy reference
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add comment to campaign_activity table
COMMENT ON TABLE campaign_activity IS 'Tracks campaign and post activity for analytics';

-- Add missing columns to campaign_posts table
ALTER TABLE campaign_posts
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS execution_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS reddit_permalink TEXT,
ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL;

-- Add comments to new columns
COMMENT ON COLUMN campaign_posts.processing_started_at IS 'Timestamp when processing of this post began';
COMMENT ON COLUMN campaign_posts.execution_time_ms IS 'Time taken to process and submit the post in milliseconds';
COMMENT ON COLUMN campaign_posts.last_error IS 'Last error message if post failed';
COMMENT ON COLUMN campaign_posts.reddit_permalink IS 'Permalink to the Reddit post if successfully posted';
COMMENT ON COLUMN campaign_posts.parent_post_id IS 'For recurring posts, reference to the original post that generated this one';

-- Add indices for performance
CREATE INDEX IF NOT EXISTS idx_campaign_activity_campaign_id ON campaign_activity(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_post_id ON campaign_activity(post_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_action_type ON campaign_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_created_at ON campaign_activity(created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_parent_id ON campaign_posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_status ON campaign_posts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_scheduled_for ON campaign_posts(scheduled_for);

-- Add RLS policies
ALTER TABLE campaign_activity ENABLE ROW LEVEL SECURITY;

-- Policy for campaign_activity table - users can only see their own campaign activities
CREATE POLICY campaign_activity_select_policy ON campaign_activity 
FOR SELECT USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT user_id FROM campaigns WHERE id = campaign_activity.campaign_id
  )
);

-- Policy for inserting campaign activities - service roles and the campaign owner can insert
CREATE POLICY campaign_activity_insert_policy ON campaign_activity
FOR INSERT WITH CHECK (
  -- Service role or owner can insert
  (user_id = auth.uid()) OR
  (auth.role() = 'service_role') OR 
  (
    user_id IN (
      SELECT user_id FROM campaigns WHERE id = campaign_activity.campaign_id
    )
  )
);

-- Function to set user_id on campaign_activity from the campaign
CREATE OR REPLACE FUNCTION set_campaign_activity_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    SELECT user_id INTO NEW.user_id FROM campaigns WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set user_id on campaign_activity insert
CREATE TRIGGER campaign_activity_set_user_id
BEFORE INSERT ON campaign_activity
FOR EACH ROW
EXECUTE FUNCTION set_campaign_activity_user_id();

-- Create a view to show campaigns with their post metrics
CREATE OR REPLACE VIEW campaign_metrics AS
SELECT 
  c.id AS campaign_id,
  c.name AS campaign_name,
  c.user_id,
  c.is_active,
  c.created_at,
  COUNT(DISTINCT cp.id) AS total_posts,
  SUM(CASE WHEN cp.status = 'posted' THEN 1 ELSE 0 END) AS posted_count,
  SUM(CASE WHEN cp.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
  SUM(CASE WHEN cp.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
  MAX(cp.posted_at) AS last_post_at,
  MIN(CASE WHEN cp.status = 'scheduled' THEN cp.scheduled_for ELSE NULL END) AS next_scheduled_post
FROM campaigns c
LEFT JOIN campaign_posts cp ON c.id = cp.campaign_id
GROUP BY c.id, c.name, c.user_id, c.is_active, c.created_at;

-- Add RLS policy for the view
ALTER VIEW campaign_metrics OWNER TO postgres;
CREATE POLICY campaign_metrics_policy ON campaign_metrics FOR SELECT USING (user_id = auth.uid());