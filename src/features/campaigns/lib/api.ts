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
    
    // Include user_id in the campaign data
    const campaignWithUserId = {
      ...campaign,
      user_id: user.id
    };
    
    const { data, error } = await supabase
      .from('campaigns')
      .insert(campaignWithUserId)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating campaign:', error);
      
      // Provide more specific error message for RLS violations
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw new Error('Permission denied: You do not have permission to create campaigns');
      }
      
      throw error;
    }
    
    return data as Campaign;
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
    return data as unknown as CampaignPost[];
  },

  async createCampaignPost(post: CreateCampaignPostDto): Promise<CampaignPost> {
    const { data, error } = await supabase
      .from('campaign_posts')
      .insert(post)
      .select()
      .single();
    
    if (error) throw error;
    return data as CampaignPost;
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
      .select('*')
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    return data as MediaItem[];
  },

  async uploadMedia(file: File): Promise<MediaItem> {
    // Generate a unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `media/${fileName}`;

    try {
      // Check if bucket exists and create it if it doesn't
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'campaign-media');
      
      if (!bucketExists) {
        // Create the bucket
        const { error: bucketError } = await supabase.storage.createBucket('campaign-media', {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (bucketError) {
          console.error('Error creating storage bucket:', bucketError);
          throw new Error('Failed to create storage bucket');
        }
        
        // Set bucket policy to public
        try {
          const { error: policyError } = await supabase.storage.updateBucket('campaign-media', {
            public: true
          });
          
          if (policyError) {
            console.error('Error setting bucket policy:', policyError);
            // Continue anyway as the upload might still work
          }
          
          // Create storage policies for authenticated users
          try {
            // Policy for read access
            await supabase.storage.from('campaign-media').createSignedUrl('dummy.txt', 1);
            
            // Try to explicitly set the storage policies (may not work in all Supabase projects)
            const queries = [
              `CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'campaign-media');`,
              `CREATE POLICY "Authenticated users can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'campaign-media' AND owner = auth.uid());`,
              `CREATE POLICY "Media is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'campaign-media');`,
              `CREATE POLICY "Authenticated users can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'campaign-media' AND owner = auth.uid());`
            ];
            
            // This may not work depending on Supabase project settings, but it's worth a try
            for (const query of queries) {
              try {
                await supabase.rpc('execute_sql', { sql: query });
              } catch (err) {
                console.warn('Failed to create storage policy, may need to set manually:', err);
              }
            }
          } catch (policiesErr) {
            console.warn('Failed to create storage policies:', policiesErr);
          }
        } catch (policyErr) {
          console.error('Error setting bucket policy:', policyErr);
          // Continue anyway as the upload might still work
        }
      }
    } catch (err) {
      console.error('Error checking/creating bucket:', err);
      // Continue anyway, in case the bucket already exists but the listBuckets API failed
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('campaign-media')
      .upload(filePath, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('campaign-media')
      .getPublicUrl(filePath);

    // Get the current user's ID
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || !user.id) {
      throw new Error('User not authenticated or user ID not available');
    }

    // Create record in media_items table
    const mediaItem = {
      user_id: user.id,
      filename: file.name,
      storage_path: filePath,
      media_type: file.type,
      file_size: file.size,
      url: publicUrl
    };

    const { data, error } = await supabase
      .from('media_items')
      .insert(mediaItem)
      .select()
      .single();
    
    if (error) {
      console.error('Database error creating media item:', error);
      
      // Clean up the uploaded file if we can't create the database record
      try {
        await supabase.storage
          .from('campaign-media')
          .remove([filePath]);
      } catch (removeErr) {
        console.error('Failed to clean up storage after error:', removeErr);
      }
      
      // Provide more specific error message
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        throw { 
          statusCode: '403', 
          error: 'Unauthorized', 
          message: 'new row violates row-level security policy',
          details: 'Ensure your user account has permission to insert records'
        };
      }
      
      throw error;
    }
    return data as MediaItem;
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
  }
};