-- Production Campaign Setup SQL
-- This script sets up all required tables and functions for the campaign feature

-- Ensure we have the required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  schedule_type TEXT DEFAULT 'one-time'
);

-- Create campaign_posts table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  reddit_account_id UUID,
  media_item_id UUID,
  subreddit_id UUID,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'scheduled',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  reddit_post_id TEXT,
  interval_hours INTEGER,
  use_ai_title BOOLEAN DEFAULT FALSE,
  use_ai_timing BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  last_error TEXT,
  reddit_permalink TEXT,
  parent_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL
);

-- Add indices for campaign_posts
CREATE INDEX IF NOT EXISTS idx_campaign_posts_campaign_id ON campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_status ON campaign_posts(status);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_scheduled_for ON campaign_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_posts_parent_id ON campaign_posts(parent_post_id);

-- Add campaign_activity table for tracking campaign events
CREATE TABLE IF NOT EXISTS campaign_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
  related_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indices for campaign_activity
CREATE INDEX IF NOT EXISTS idx_campaign_activity_campaign_id ON campaign_activity(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_post_id ON campaign_activity(post_id);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_action_type ON campaign_activity(action_type);
CREATE INDEX IF NOT EXISTS idx_campaign_activity_created_at ON campaign_activity(created_at);

-- Set up Row Level Security
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_activity ENABLE ROW LEVEL SECURITY;

-- Policies for campaigns table
CREATE POLICY campaigns_select_policy ON campaigns 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY campaigns_insert_policy ON campaigns 
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY campaigns_update_policy ON campaigns 
FOR UPDATE USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY campaigns_delete_policy ON campaigns 
FOR DELETE USING (user_id = auth.uid());

-- Policies for campaign_posts table
CREATE POLICY campaign_posts_select_policy ON campaign_posts 
FOR SELECT USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

CREATE POLICY campaign_posts_insert_policy ON campaign_posts 
FOR INSERT WITH CHECK (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  ) OR
  auth.role() = 'service_role'
);

CREATE POLICY campaign_posts_update_policy ON campaign_posts 
FOR UPDATE USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  ) OR 
  auth.role() = 'service_role'
);

CREATE POLICY campaign_posts_delete_policy ON campaign_posts 
FOR DELETE USING (
  campaign_id IN (
    SELECT id FROM campaigns WHERE user_id = auth.uid()
  )
);

-- Policies for campaign_activity table
CREATE POLICY campaign_activity_select_policy ON campaign_activity 
FOR SELECT USING (
  user_id = auth.uid() OR
  user_id IN (
    SELECT user_id FROM campaigns WHERE id = campaign_activity.campaign_id
  )
);

CREATE POLICY campaign_activity_insert_policy ON campaign_activity
FOR INSERT WITH CHECK (
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
DROP TRIGGER IF EXISTS campaign_activity_set_user_id ON campaign_activity;
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