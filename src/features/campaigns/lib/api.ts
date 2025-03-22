import { supabase } from '../../../lib/supabase';
import { 
  Campaign, 
  CampaignPost, 
  MediaItem, 
  CreateCampaignDto, 
  CreateCampaignPostDto,
  UpdateCampaignDto,
  UpdateCampaignPostDto,
  CampaignWithPosts
} from '../types';

export const campaignApi = {
  // Campaign Methods
  async getCampaigns(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Campaign[];
  },

  async getCampaignById(id: string): Promise<CampaignWithPosts> {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        posts:campaign_posts(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as CampaignWithPosts;
  },

  async createCampaign(campaign: CreateCampaignDto): Promise<Campaign> {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.id) {
      throw new Error('User not authenticated or user ID not available');
    }
    
    try {
      // Use the transaction-based function to create the campaign
      const { data, error } = await supabase
        .rpc('create_campaign_with_transaction', {
          p_name: campaign.name,
          p_description: campaign.description || null,
          p_schedule_type: campaign.schedule_type || 'one-time',
          p_is_active: campaign.is_active !== false
        });
      
      if (error) {
        console.error('Error creating campaign:', error);
        
        // Provide more specific error message for RLS violations
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw new Error('Permission denied: You do not have permission to create campaigns');
        }
        
        throw error;
      }
      
      // Fetch the newly created campaign details
      const { data: campaignData, error: fetchError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', data)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      return campaignData as Campaign;
    } catch (error) {
      console.error('Error in createCampaign:', error);
      throw error;
    }
  },

  async updateCampaign(id: string, updates: UpdateCampaignDto): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Campaign;
  },

  async deleteCampaign(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Campaign Posts Methods
  async getCampaignPosts(campaignId: string): Promise<CampaignPost[]> {
    const { data, error } = await supabase
      .from('campaign_posts')
      .select(`
        *,
        reddit_account:reddit_accounts(username),
        subreddit:subreddits(name),
        media_item:media_items(*)
      `)
      .eq('campaign_id', campaignId)
      .order('scheduled_for', { ascending: true });
    
    if (error) throw error;
    
    // Transform data to ensure proper type conversion
    const typedData: CampaignPostWithDetails[] = data.map(post => ({
      ...post,
      reddit_account: post.reddit_account || { username: '' },
      subreddit: post.subreddit || { name: '' },
      media_item: post.media_item || undefined
    }));
    
    return typedData;
  },

  async createCampaignPost(post: CreateCampaignPostDto): Promise<CampaignPost> {
    try {
      // Use the transaction-based function to create the campaign post
      const { data, error } = await supabase
        .rpc('create_campaign_post_with_transaction', {
          p_campaign_id: post.campaign_id,
          p_reddit_account_id: post.reddit_account_id,
          p_media_item_id: post.media_item_id || null,
          p_subreddit_id: post.subreddit_id,
          p_title: post.title,
          p_content_type: post.content_type,
          p_content: post.content,
          p_scheduled_for: post.scheduled_for,
          p_interval_hours: post.interval_hours || null,
          p_use_ai_title: post.use_ai_title,
          p_use_ai_timing: post.use_ai_timing
        });
      
      if (error) {
        console.error('Error creating campaign post:', error);
        throw error;
      }
      
      // Fetch the newly created post details
      const { data: postData, error: fetchError } = await supabase
        .from('campaign_posts')
        .select('*')
        .eq('id', data)
        .single();
        
      if (fetchError) {
        throw fetchError;
      }
      
      return postData as CampaignPost;
    } catch (error) {
      console.error('Error in createCampaignPost:', error);
      throw error;
    }
  },

  async updateCampaignPost(id: string, updates: UpdateCampaignPostDto): Promise<CampaignPost> {
    const { data, error } = await supabase
      .from('campaign_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as CampaignPost;
  },

  async deleteCampaignPost(id: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_posts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Media Library Methods
  async getMediaItems(): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media_items')
      .select(`
        *,
        tags:media_item_tags(
          id,
          tag_id,
          media_tags(id, name, color)
        )
      `)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform the nested structure from Supabase to match our interface
    const mediaItemsWithTags = data.map(item => {
      const transformedItem = {
        ...item,
        tags: item.tags 
          ? item.tags
              .filter(t => t.media_tags) // Filter out any null tags
              .map(t => ({
                id: t.media_tags.id,
                name: t.media_tags.name,
                color: t.media_tags.color,
                user_id: '', // Will be populated by RLS
                created_at: '' // Not needed in UI
              }))
          : []
      };
      delete transformedItem.media_item_tags; // Remove the original nested structure
      return transformedItem;
    });
    
    return mediaItemsWithTags as MediaItem[];
  },
  
  async getMediaItemsByTag(tagId: string): Promise<MediaItem[]> {
    const { data, error } = await supabase
      .from('media_item_tags')
      .select(`
        media_item:media_items(
          *,
          tags:media_item_tags(
            id,
            tag_id,
            media_tags(id, name, color)
          )
        )
      `)
      .eq('tag_id', tagId);
      
    if (error) throw error;
    
    // Extract and transform the media items
    const mediaItems = data
      .filter(item => item.media_item) // Filter out any null items
      .map(item => {
        const mediaItem = item.media_item;
        // Transform tags the same way as in getMediaItems
        return {
          ...mediaItem,
          tags: mediaItem.tags 
            ? mediaItem.tags
                .filter(t => t.media_tags)
                .map(t => ({
                  id: t.media_tags.id,
                  name: t.media_tags.name,
                  color: t.media_tags.color,
                  user_id: '',
                  created_at: ''
                }))
            : []
        };
      });
      
    return mediaItems as MediaItem[];
  },

  async uploadMedia(file: File): Promise<MediaItem> {
    // Validate file size (5MB max)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the maximum limit of 5MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }

    // Validate file type using both extension and MIME type
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedExtensions.includes(fileExt)) {
      throw new Error(`File extension '${fileExt}' is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`);
    }
    
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error(`File type '${file.type}' is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    // Sanitize filename: generate a UUID + validated extension
    const sanitizedExt = allowedExtensions.find(ext => ext === fileExt) || 'jpg';
    const fileName = `${crypto.randomUUID()}.${sanitizedExt}`;
    const filePath = `media/${fileName}`;

    // Storage path for cleanup if needed
    let fileUploaded = false;
    
    try {
      // Try to ensure bucket exists with proper permissions
      let bucketExists = false;
      try {
        // First check if bucket already exists
        const { data: buckets, error: bucketListError } = await supabase.storage.listBuckets();
        
        if (bucketListError) {
          console.warn('Error checking buckets:', bucketListError);
        } else {
          bucketExists = buckets?.some(b => b.name === 'campaign-media') || false;
        }
        
        // If bucket doesn't exist, try to create it
        if (!bucketExists) {
          try {
            // Use public:true for now - this is more compatible with default Supabase RLS
            const { error: bucketError } = await supabase.storage.createBucket('campaign-media', {
              public: true, // Set to public to avoid RLS issues
              allowedMimeTypes: allowedMimeTypes,
              fileSizeLimit: MAX_FILE_SIZE
            });
            
            if (bucketError) {
              console.warn('Error creating bucket, will try upload anyway:', bucketError);
            }
          } catch (createErr) {
            console.warn('Error during bucket creation, will try upload anyway:', createErr);
          }
        }
      } catch (err) {
        console.warn('Error checking/creating bucket, will try upload anyway:', err);
      }

      // Additional file validation: verify the actual file content matches the claimed type
      try {
        // For images, we can create an object URL and load it as an image to verify it's valid
        if (file.type.startsWith('image/')) {
          await new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = () => {
              URL.revokeObjectURL(objectUrl);
              resolve(true);
            };
            
            img.onerror = () => {
              URL.revokeObjectURL(objectUrl);
              reject(new Error('Invalid image file. The file could not be verified as a valid image.'));
            };
            
            img.src = objectUrl;
          });
        }
      } catch (validationError) {
        throw validationError;
      }

      // Upload to Supabase Storage with properly validated file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file, {
          contentType: file.type, // Explicitly set the content type
          cacheControl: '3600',
          upsert: true // Use upsert to handle potential conflicts
        });
      
      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }
      
      // Mark file as uploaded so we can cleanup if needed
      fileUploaded = true;

      // Get the public URL for now (since we're using public bucket)
      const { data: { publicUrl } } = supabase.storage
        .from('campaign-media')
        .getPublicUrl(filePath);

      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.id) {
        throw new Error('User not authenticated or user ID not available');
      }

      // Create record in media_items table with additional security metadata
      // Only include fields that exist in the database schema - remove extra fields until migration runs
      const mediaItem = {
        user_id: user.id,
        filename: file.name, // Original filename (for user reference)
        storage_path: filePath,
        media_type: file.type,
        file_size: file.size,
        url: publicUrl
        // The migration will add these fields:
        // original_extension: fileExt,
        // validated: true,
        // validation_method: 'mime+extension+content'
      };

      // First check if the schema has the new columns - this helps prevent errors if migration hasn't run
      let hasNewColumns = false;
      try {
        const { data: checkData, error: checkError } = await supabase
          .from('media_items')
          .select('original_extension')
          .limit(1);
        
        hasNewColumns = !checkError;
      } catch {
        hasNewColumns = false;
      }

      // Add the new fields only if they exist in the schema
      if (hasNewColumns) {
        Object.assign(mediaItem, {
          original_extension: fileExt,
          validated: true,
          validation_method: 'mime+extension+content'
        });
      }

      // Insert record in database
      const { data, error } = await supabase
        .from('media_items')
        .insert(mediaItem)
        .select()
        .single();
      
      if (error) {
        // Provide more specific error message
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          throw { 
            statusCode: '403', 
            error: 'Unauthorized', 
            message: 'New row violates row-level security policy',
            details: 'Ensure your user account has permission to insert records'
          };
        }
        
        throw error;
      }
      
      return data as MediaItem;
    } catch (error) {
      console.error('Error in media upload process:', error);
      
      // Clean up the uploaded file if it was uploaded but we encountered an error afterward
      if (fileUploaded) {
        try {
          console.log('Cleaning up file after error:', filePath);
          await supabase.storage
            .from('campaign-media')
            .remove([filePath]);
        } catch (removeErr) {
          console.error('Failed to clean up storage after error:', removeErr);
          // Continue with the original error even if cleanup fails
        }
      }
      
      // Re-throw the original error with more context
      if (error instanceof Error) {
        throw new Error(`Failed to complete media upload: ${error.message}`);
      } else {
        throw error; // For non-standard errors, pass through
      }
    }
  },

  async deleteMedia(id: string): Promise<void> {
    // First get the storage path
    const { data: mediaItem, error: fetchError } = await supabase
      .from('media_items')
      .select('storage_path')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('campaign-media')
      .remove([mediaItem.storage_path]);
    
    if (storageError) throw storageError;

    // Delete record
    const { error } = await supabase
      .from('media_items')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Tag Management Methods
  async getTags(): Promise<MediaTag[]> {
    const { data, error } = await supabase
      .from('media_tags')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data as MediaTag[];
  },

  async createTag(tag: CreateTagDto): Promise<MediaTag> {
    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.id) {
      throw new Error('User not authenticated or user ID not available');
    }
    
    // Include user_id in the tag data
    const tagWithUserId = {
      ...tag,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('media_tags')
      .insert(tagWithUserId)
      .select()
      .single();
    
    if (error) {
      // Check for duplicate tag name
      if (error.code === '23505') {
        throw new Error(`Tag "${tag.name}" already exists`);
      }
      throw error;
    }
    
    return data as MediaTag;
  },

  async updateTag(id: string, updates: UpdateTagDto): Promise<MediaTag> {
    const { data, error } = await supabase
      .from('media_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      // Check for duplicate tag name
      if (error.code === '23505') {
        throw new Error(`Tag "${updates.name}" already exists`);
      }
      throw error;
    }
    
    return data as MediaTag;
  },

  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('media_tags')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Media Item Tag Management
  async addTagToMediaItem(mediaItemId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('media_item_tags')
      .insert({ media_item_id: mediaItemId, tag_id: tagId });
    
    if (error) {
      // Check if the tag is already applied
      if (error.code === '23505') {
        // Silently ignore duplicate tags
        return;
      }
      throw error;
    }
  },

  async removeTagFromMediaItem(mediaItemId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('media_item_tags')
      .delete()
      .eq('media_item_id', mediaItemId)
      .eq('tag_id', tagId);
    
    if (error) throw error;
  },
  
  async addTagsToMediaItems(mediaItemIds: string[], tagId: string): Promise<void> {
    // Create array of objects for insertion
    const items = mediaItemIds.map(mediaItemId => ({
      media_item_id: mediaItemId,
      tag_id: tagId
    }));
    
    // First check if any of these relationships already exist to avoid duplicates
    const { data: existingTags } = await supabase
      .from('media_item_tags')
      .select('media_item_id')
      .eq('tag_id', tagId)
      .in('media_item_id', mediaItemIds);
    
    // Filter out items that already have the tag
    const existingMediaItemIds = existingTags?.map(t => t.media_item_id) || [];
    const newItems = items.filter(item => !existingMediaItemIds.includes(item.media_item_id));
    
    // Only insert if there are new items to add
    if (newItems.length > 0) {
      const { error } = await supabase
        .from('media_item_tags')
        .insert(newItems);
      
      if (error) throw error;
    }
  },
  
  async removeTagFromMediaItems(mediaItemIds: string[], tagId: string): Promise<void> {
    const { error } = await supabase
      .from('media_item_tags')
      .delete()
      .in('media_item_id', mediaItemIds)
      .eq('tag_id', tagId);
    
    if (error) throw error;
  },
  
  // Campaign Tag Preferences
  async getCampaignTagPreferences(campaignId: string): Promise<CampaignTagPreference[]> {
    const { data, error } = await supabase
      .from('campaign_tag_preferences')
      .select(`
        *,
        tag:media_tags(*)
      `)
      .eq('campaign_id', campaignId);
    
    if (error) throw error;
    
    return data.map(pref => ({
      ...pref,
      tag: pref.tag
    })) as CampaignTagPreference[];
  },
  
  async setCampaignTagPreference(campaignId: string, tagId: string, weight: number): Promise<void> {
    const { error } = await supabase
      .from('campaign_tag_preferences')
      .upsert({
        campaign_id: campaignId,
        tag_id: tagId,
        weight
      }, {
        onConflict: ['campaign_id', 'tag_id']
      });
    
    if (error) throw error;
  },
  
  async removeCampaignTagPreference(campaignId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_tag_preferences')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('tag_id', tagId);
    
    if (error) throw error;
  }
};