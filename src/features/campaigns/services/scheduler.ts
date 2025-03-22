import { supabase } from '../../../lib/supabase';
import { CampaignPost } from '../types';
import { RedditPostingService } from './reddit';

interface RedditAccountDetails {
  username: string;
  accessToken: string;
}

// Scheduler service for handling campaign post execution
export class CampaignScheduler {
  // Start the scheduling worker that will check for posts to execute
  static startScheduler() {
    console.log('Starting campaign scheduler - will check for posts every minute');
    
    // Check for posts to execute every minute
    const interval = setInterval(() => this.checkScheduledPosts(), 60 * 1000);
    
    // Also run immediately on startup
    this.checkScheduledPosts();
    
    return interval;
  }

  // Check for posts that need to be executed now
  static async checkScheduledPosts() {
    try {
      const now = new Date();
      console.log(`Checking for scheduled posts at ${now.toISOString()}`);
      
      // Use the advisory locking function to get posts that need processing
      // This prevents multiple servers/processes from claiming the same posts
      const { data: posts, error } = await supabase
        .rpc('get_posts_for_processing', {
          batch_size: 5, // Process max 5 posts at once
          max_age_minutes: 60 // Only process posts scheduled within the last hour
        });
      
      if (error) {
        console.error('Error getting posts for processing:', error);
        return;
      }

      if (posts && posts.length > 0) {
        console.log(`Found and claimed ${posts.length} posts to execute`);
        
        // Fetch additional data for the posts
        const postIds = posts.map(p => p.id);
        const { data: postsWithDetails, error: detailsError } = await supabase
          .from('campaign_posts')
          .select(`
            *,
            reddit_account:reddit_accounts(id, username, oauth_token, oauth_refresh_token, token_expiry),
            subreddit:subreddits(id, name),
            campaign:campaigns(id, name),
            media_item:media_items(*)
          `)
          .in('id', postIds);
          
        if (detailsError) {
          console.error('Error fetching post details:', detailsError);
          return;
        }
        
        // Create a map for quick lookups
        const detailsMap = new Map();
        postsWithDetails?.forEach(post => {
          detailsMap.set(post.id, post);
        });
        
        // Process posts with concurrency limit
        const concurrencyLimit = 3; // Process max 3 posts in parallel
        
        // Create chunks of posts to process
        for (let i = 0; i < posts.length; i += concurrencyLimit) {
          const chunk = posts.slice(i, i + concurrencyLimit);
          
          console.log(`Processing batch of ${chunk.length} posts`);
          
          // Process this batch in parallel
          await Promise.all(chunk.map(post => {
            // Get the post with all details
            const postWithDetails = detailsMap.get(post.id);
            
            if (!postWithDetails) {
              console.error(`Missing details for post ${post.id}, skipping`);
              return Promise.resolve();
            }
            
            console.log(`Processing post: "${postWithDetails.title}" for subreddit r/${postWithDetails.subreddit?.name}, scheduled for ${postWithDetails.scheduled_for}`);
            
            // Since we've already acquired the lock and set status to processing,
            // we can proceed directly to execution
            return this.executePost(postWithDetails).catch(err => {
              console.error(`Failed to execute post ID ${post.id}:`, err);
            });
          }));
        }
      } else {
        console.log('No scheduled posts found for current time window');
      }
    } catch (error) {
      console.error('Error checking scheduled posts:', error);
    }
  }

  // Execute a single post
  static async executePost(post: any) {
    const startTime = Date.now();
    console.log(`Executing post ID ${post.id}, title: "${post.title}", scheduled for ${post.scheduled_for}`);
    
    try {
      // Fetch the campaign to check if it's active
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('is_active, user_id')
        .eq('id', post.campaign_id)
        .single();
      
      if (campaignError || !campaign) {
        throw new Error(`Campaign not found or error fetching campaign: ${campaignError?.message || 'Unknown error'}`);
      }
      
      if (!campaign.is_active) {
        throw new Error(`Campaign is not active, skipping post execution`);
      }
      
      // For future subscription checks (not implementing feature gates now)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', campaign.user_id)
        .single();
        
      if (profileError) {
        console.warn(`Unable to verify user profile: ${profileError?.message}`);
      }
      
      // Get the Reddit account details
      const redditAccount = post.reddit_account;
      
      if (!redditAccount || !redditAccount.oauth_token || !redditAccount.oauth_refresh_token) {
        throw new Error(`Missing or invalid Reddit account information`);
      }
      
      // Get the subreddit name
      const subredditName = post.subreddit?.name;
      
      if (!subredditName) {
        throw new Error(`Missing or invalid subreddit information`);
      }
      
      // Check if the token is expired and refresh if needed
      let accessToken = redditAccount.oauth_token;
      const tokenExpiry = new Date(redditAccount.token_expiry || 0);
      
      if (tokenExpiry <= new Date()) {
        console.log(`Token for ${redditAccount.username} has expired, refreshing...`);
        
        try {
          const refreshResult = await this.refreshRedditToken(
            redditAccount.id,
            redditAccount.oauth_refresh_token
          );
          
          if (refreshResult.success) {
            accessToken = refreshResult.accessToken;
            console.log(`Successfully refreshed token for ${redditAccount.username}`);
          } else {
            throw new Error(`Failed to refresh token: ${refreshResult.error}`);
          }
        } catch (tokenError) {
          // Update the post status to failed with the error
          await supabase.rpc('update_campaign_post_status', {
            p_post_id: post.id,
            p_status: 'failed',
            p_error_message: `Token refresh failed: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`
          });
          
          throw new Error(`Failed to refresh token: ${tokenError instanceof Error ? tokenError.message : 'Unknown error'}`);
        }
      }

      // Submit the post to Reddit
      console.log(`Submitting post to Reddit - Subreddit: r/${subredditName}, Account: ${redditAccount.username}`);
      const result = await RedditPostingService.submitPost(
        post,
        {
          username: redditAccount.username,
          accessToken: accessToken
        },
        subredditName
      );

      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`Post successfully submitted to Reddit! Execution time: ${(executionTime / 1000).toFixed(2)}s`);
        console.log(`Reddit post ID: ${result.postId}, Permalink: ${result.permalink || '[Not available]'}`);
        
        // Update the post as successfully posted using transaction function
        const { error: statusError } = await supabase.rpc('update_campaign_post_status', {
          p_post_id: post.id,
          p_status: 'posted',
          p_reddit_post_id: result.postId,
          p_reddit_permalink: result.permalink || null,
          p_execution_time_ms: executionTime
        });
          
        if (statusError) {
          console.error(`Error updating post status to posted:`, statusError);
        }

        // If this is a recurring post, schedule the next occurrence
        if (post.interval_hours && post.interval_hours > 0) {
          await this.scheduleNextRecurringPost(post);
        }
        
        return result;
      } else {
        console.error(`Failed to submit post to Reddit:`, result.error);
        
        // Update post status to failed with error message using transaction function
        const { error: statusError } = await supabase.rpc('update_campaign_post_status', {
          p_post_id: post.id,
          p_status: 'failed',
          p_error_message: result.error || 'Unknown error submitting to Reddit'
        });
        
        if (statusError) {
          console.error(`Error updating post status to failed:`, statusError);
        }
        
        throw new Error(result.error || 'Unknown error submitting to Reddit');
      }
    } catch (error) {
      console.error(`Error executing post ${post.id}:`, error);
      
      // Ensure the post is marked as failed even if the error happens outside
      // of the main flow (e.g., during token refresh or API call)
      try {
        const { error: statusError } = await supabase.rpc('update_campaign_post_status', {
          p_post_id: post.id,
          p_status: 'failed',
          p_error_message: error instanceof Error ? error.message : 'Unknown execution error'
        });
        
        if (statusError) {
          console.error(`Error updating post status to failed:`, statusError);
        }
      } catch (updateError) {
        console.error(`Critical error: Could not update post status:`, updateError);
      }
      
      throw error;
    }
  }

  // Helper to refresh Reddit token
  static async refreshRedditToken(accountId: string, refreshToken: string) {
    try {
      const clientId = process.env.VITE_REDDIT_APP_ID || 'missing_client_id';
      const clientSecret = process.env.VITE_REDDIT_APP_SECRET || 'missing_client_secret';
      
      if (!clientId || !clientSecret || clientId === 'missing_client_id' || clientSecret === 'missing_client_secret') {
        throw new Error('Missing Reddit API credentials in environment');
      }
      
      // Encode in Base64
      const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${encodedCredentials}`
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken
        })
      });
      
      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Token refresh failed: ${response.status} - ${responseText}`);
      }
      
      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('Token refresh did not return an access token');
      }
      
      // Calculate new expiry time (typically 1 hour)
      const expiresIn = data.expires_in || 3600;
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + expiresIn);
      
      // Update token in database
      const { error } = await supabase
        .from('reddit_accounts')
        .update({
          oauth_token: data.access_token,
          token_expiry: newExpiry.toISOString()
        })
        .eq('id', accountId);
      
      if (error) {
        throw error;
      }
      
      return {
        success: true,
        accessToken: data.access_token,
        expiresAt: newExpiry.toISOString()
      };
    } catch (error) {
      console.error('Error refreshing Reddit token:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error refreshing token'
      };
    }
  }

  // Schedule the next occurrence of a recurring post
  static async scheduleNextRecurringPost(post: any) {
    try {
      if (!post.interval_hours || post.interval_hours <= 0) {
        console.log(`Post ${post.id} is not recurring, not scheduling next occurrence`);
        return;
      }
      
      // Calculate the next scheduled time
      const baseTime = new Date(post.posted_at || post.scheduled_for);
      const nextTime = new Date(baseTime);
      nextTime.setHours(nextTime.getHours() + post.interval_hours);
      
      console.log(`Scheduling next occurrence of post ${post.id} for ${nextTime.toISOString()}`);
      
      // Use the transaction function to schedule the next post
      const { data: newPostId, error } = await supabase
        .rpc('schedule_next_recurring_post', {
          p_parent_post_id: post.id,
          p_scheduled_for: nextTime.toISOString()
        });
      
      if (error) {
        throw error;
      }
      
      console.log(`New recurring post created with ID: ${newPostId || 'unknown'}`);
      return newPostId;
    } catch (error) {
      console.error('Error scheduling next recurring post:', error);
      throw error;
    }
  }
}