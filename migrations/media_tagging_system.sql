-- Media Tagging System Migration

-- Create tags table
CREATE TABLE IF NOT EXISTS media_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#808080', -- Default gray color
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure tag names are unique per user
  UNIQUE(user_id, name)
);

-- Create media_item_tags junction table
CREATE TABLE IF NOT EXISTS media_item_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each media item can only have a specific tag once
  UNIQUE(media_item_id, tag_id)
);

-- Create campaign-tag preferences table for AI-based media selection
CREATE TABLE IF NOT EXISTS campaign_tag_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES media_tags(id) ON DELETE CASCADE,
  weight INTEGER NOT NULL DEFAULT 1, -- Higher weight means higher preference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each campaign can only have a specific tag once
  UNIQUE(campaign_id, tag_id)
);

-- RLS Policies for tags table
ALTER TABLE media_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_tags_select_policy ON media_tags
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY media_tags_insert_policy ON media_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY media_tags_update_policy ON media_tags
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY media_tags_delete_policy ON media_tags
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for media_item_tags junction table
ALTER TABLE media_item_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY media_item_tags_select_policy ON media_item_tags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM media_items 
      WHERE id = media_item_tags.media_item_id 
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY media_item_tags_insert_policy ON media_item_tags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM media_items 
      WHERE id = media_item_tags.media_item_id 
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY media_item_tags_delete_policy ON media_item_tags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM media_items 
      WHERE id = media_item_tags.media_item_id 
      AND user_id = auth.uid()
    )
  );

-- RLS Policies for campaign_tag_preferences
ALTER TABLE campaign_tag_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY campaign_tag_preferences_select_policy ON campaign_tag_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_tag_preferences.campaign_id 
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY campaign_tag_preferences_insert_policy ON campaign_tag_preferences
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_tag_preferences.campaign_id 
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY campaign_tag_preferences_update_policy ON campaign_tag_preferences
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_tag_preferences.campaign_id 
      AND user_id = auth.uid()
    )
  );
  
CREATE POLICY campaign_tag_preferences_delete_policy ON campaign_tag_preferences
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM campaigns 
      WHERE id = campaign_tag_preferences.campaign_id 
      AND user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS media_tags_user_id_idx ON media_tags(user_id);
CREATE INDEX IF NOT EXISTS media_item_tags_media_item_id_idx ON media_item_tags(media_item_id);
CREATE INDEX IF NOT EXISTS media_item_tags_tag_id_idx ON media_item_tags(tag_id);
CREATE INDEX IF NOT EXISTS campaign_tag_preferences_campaign_id_idx ON campaign_tag_preferences(campaign_id);