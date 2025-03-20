-- Campaigns Feature Migration

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  schedule_type TEXT CHECK (schedule_type IN ('one-time', 'recurring', 'ai-optimized'))
);

-- Create media_items table
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url TEXT NOT NULL
);

-- Create campaign_posts table
CREATE TABLE IF NOT EXISTS campaign_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  reddit_account_id UUID NOT NULL REFERENCES reddit_accounts(id) ON DELETE CASCADE,
  media_item_id UUID REFERENCES media_items(id) ON DELETE SET NULL,
  subreddit_id UUID REFERENCES subreddits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT CHECK (content_type IN ('text', 'link', 'image')),
  content TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'processing', 'posted', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  posted_at TIMESTAMP WITH TIME ZONE,
  reddit_post_id TEXT,
  interval_hours INTEGER,
  use_ai_title BOOLEAN DEFAULT false,
  use_ai_timing BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies

-- Campaigns policies
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaigns_select_policy ON campaigns
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY campaigns_insert_policy ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY campaigns_update_policy ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY campaigns_delete_policy ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- Media items policies
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_items_select_policy ON media_items
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY media_items_insert_policy ON media_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY media_items_update_policy ON media_items
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY media_items_delete_policy ON media_items
  FOR DELETE USING (auth.uid() = user_id);

-- Campaign posts policies
ALTER TABLE campaign_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_posts_select_policy ON campaign_posts
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = campaign_posts.campaign_id
    )
  );
  
CREATE POLICY campaign_posts_insert_policy ON campaign_posts
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = campaign_posts.campaign_id
    )
  );
  
CREATE POLICY campaign_posts_update_policy ON campaign_posts
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = campaign_posts.campaign_id
    )
  );
  
CREATE POLICY campaign_posts_delete_policy ON campaign_posts
  FOR DELETE USING (
    auth.uid() IN (
      SELECT user_id FROM campaigns WHERE id = campaign_posts.campaign_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS campaigns_user_id_idx ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS media_items_user_id_idx ON media_items(user_id);
CREATE INDEX IF NOT EXISTS campaign_posts_campaign_id_idx ON campaign_posts(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_posts_scheduled_for_idx ON campaign_posts(scheduled_for);
CREATE INDEX IF NOT EXISTS campaign_posts_status_idx ON campaign_posts(status);