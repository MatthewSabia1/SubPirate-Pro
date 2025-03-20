export type ScheduleType = 'one-time' | 'recurring' | 'ai-optimized';
export type ContentType = 'text' | 'link' | 'image';
export type PostStatus = 'scheduled' | 'posted' | 'failed';

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description: string;
  created_at: string;
  is_active: boolean;
  schedule_type: ScheduleType;
}

export interface CampaignPost {
  id: string;
  campaign_id: string;
  reddit_account_id: string;
  media_item_id?: string;
  subreddit_id: string;
  title: string;
  content_type: ContentType;
  content: string;
  status: PostStatus;
  scheduled_for: string;
  posted_at?: string;
  reddit_post_id?: string;
  interval_hours?: number;
  use_ai_title: boolean;
  use_ai_timing: boolean;
  created_at: string;
}

export interface MediaTag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface MediaItemTag {
  id: string;
  media_item_id: string;
  tag_id: string;
  created_at: string;
  tag?: MediaTag; // For joined queries
}

export interface MediaItem {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  media_type: string;
  file_size: number;
  uploaded_at: string;
  url: string;
  tags?: MediaTag[]; // For joined queries
}

export interface CreateCampaignDto {
  name: string;
  description: string;
  schedule_type: ScheduleType;
  is_active: boolean;
}

export interface CreateCampaignPostDto {
  campaign_id: string;
  reddit_account_id: string;
  media_item_id?: string;
  subreddit_id: string;
  title: string;
  content_type: ContentType;
  content: string;
  scheduled_for: string;
  interval_hours?: number;
  use_ai_title: boolean;
  use_ai_timing: boolean;
}

export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  schedule_type?: ScheduleType;
  is_active?: boolean;
}

export interface UpdateCampaignPostDto {
  reddit_account_id?: string;
  media_item_id?: string;
  subreddit_id?: string;
  title?: string;
  content_type?: ContentType;
  content?: string;
  scheduled_for?: string;
  interval_hours?: number;
  use_ai_title?: boolean;
  use_ai_timing?: boolean;
}

export interface CampaignWithPosts extends Campaign {
  posts: CampaignPost[];
}

export interface CampaignPostWithDetails extends CampaignPost {
  reddit_account: {
    username: string;
  };
  subreddit: {
    name: string;
  };
  media_item?: MediaItem;
}

export interface MediaUploadResponse {
  id: string;
  url: string;
}

export interface CreateTagDto {
  name: string;
  color: string;
}

export interface UpdateTagDto {
  name?: string;
  color?: string;
}

export interface CampaignTagPreference {
  id: string;
  campaign_id: string;
  tag_id: string;
  weight: number;
  created_at: string;
  tag?: MediaTag; // For joined queries
}

export interface UpdateCampaignTagPreferenceDto {
  weight: number;
}