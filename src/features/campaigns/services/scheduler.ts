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
      
      // Check if account is active
      if (redditAccount.is_active === false) {
        throw new Error(`Reddit account ${redditAccount.username} is inactive and needs to be reconnected`);
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
          // Check if the error indicates the account needs to be reconnected
          const errorMessage = tokenError instanceof Error ? tokenError.message : 'Unknown error';
          const needsReconnection = errorMessage.includes('inactive') || 
                                    errorMessage.includes('reconnect') ||
                                    errorMessage.includes('invalid_grant');
          
          // Update the post status to failed with a clear error message
          await supabase.rpc('update_campaign_post_status', {
            p_post_id: post.id,
            p_status: 'failed',
            p_error_message: needsReconnection 
              ? `Reddit account needs to be reconnected: ${errorMessage}` 
              : `Token refresh failed: ${errorMessage}`
          });
          
          throw tokenError;
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
      console.log(`Campaign scheduler: Refreshing token for account ID ${accountId}`);
      
      const clientId = import.meta.env.VITE_REDDIT_APP_ID || 'missing_client_id';
      const clientSecret = import.meta.env.VITE_REDDIT_APP_SECRET || 'missing_client_secret';
      
      if (!clientId || !clientSecret || clientId === 'missing_client_id' || clientSecret === 'missing_client_secret') {
        throw new Error('Missing Reddit API credentials in environment');
      }
      
      // Check if the account still exists and get current refresh attempt count
      const { data: account, error: accountError } = await supabase
        .from('reddit_accounts')
        .select('username, refresh_attempts, is_active')
        .eq('id', accountId)
        .single();
        
      if (accountError || !account) {
        throw new Error('Reddit account not found or could not be accessed');
      }
      
      // Check if account is already marked inactive
      if (account && !account.is_active) {
        throw new Error(`Reddit account ${account.username} is marked as inactive and needs to be reconnected`);
      }
      
      // Encode in Base64
      const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      // Make the token refresh request
      const response = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${encodedCredentials}`,
          'User-Agent': 'SubPirate/1.0.0' // Use consistent user agent
        },
        body: new URLSearchParams({
          'grant_type': 'refresh_token',
          'refresh_token': refreshToken
        })
      });
      
      // Get response text first to handle both JSON and non-JSON responses
      const responseText = await response.text();
      let responseData;
      
      try {
        // Try to parse as JSON
        responseData = JSON.parse(responseText);
      } catch (e) {
        // If not valid JSON and not a successful response, throw error with text
        if (!response.ok) {
          throw new Error(`Token refresh failed: ${response.status} - ${responseText}`);
        }
      }
      
      // Handle specific error cases even if response is technically "OK"
      if (!response.ok) {
        // Handle common Reddit OAuth errors
        if (responseData && responseData.error) {
          // Track the failure in the database
          await this.trackRefreshFailure(accountId, `${responseData.error}: ${responseData.error_description || ''}`);
          
          // Invalid grant means the refresh token is no longer valid
          if (responseData.error === 'invalid_grant') {
            await this.markAccountInactive(accountId, 'Refresh token is invalid or expired. Account needs to be reconnected.');
            throw new Error(`Reddit auth failed: refresh token is invalid or expired. Account needs to be reconnected.`);
          }
          
          // Invalid client credentials
          if (responseData.error === 'invalid_client') {
            throw new Error(`Invalid Reddit client credentials. Please check your app configuration.`);
          }
          
          // Rate limiting
          if (responseData.error === 'too_many_requests' || response.status === 429) {
            throw new Error(`Rate limited by Reddit. Try again later.`);
          }
          
          throw new Error(`Reddit OAuth error: ${responseData.error}`);
        }
        
        throw new Error(`Token refresh failed: ${response.status}`);
      }
      
      if (!responseData || !responseData.access_token) {
        throw new Error('Token refresh did not return an access token');
      }
      
      // Calculate new expiry time (typically 1 hour)
      const expiresIn = responseData.expires_in || 3600;
      const newExpiry = new Date();
      newExpiry.setSeconds(newExpiry.getSeconds() + expiresIn);
      
      console.log(`Successfully refreshed token for account ID ${accountId}, expires in ${expiresIn} seconds`);
      
      // Update token in database, reset refresh attempts
      const { error } = await supabase
        .from('reddit_accounts')
        .update({
          oauth_token: responseData.access_token,
          token_expiry: newExpiry.toISOString(),
          access_token: responseData.access_token, // Update both token fields for compatibility with both services
          refresh_error: null,
          refresh_attempts: 0,
          is_active: true,
          last_token_refresh: new Date().toISOString()
        })
        .eq('id', accountId);
      
      if (error) {
        console.error('Error updating database with new token:', error);
        throw error;
      }
      
      return {
        success: true,
        accessToken: responseData.access_token,
        expiresAt: newExpiry.toISOString()
      };
    } catch (error) {
      console.error('Error refreshing Reddit token:', error);
      
      // Ensure error is tracked in the database, but don't fail if this fails
      try {
        await this.trackRefreshFailure(accountId, error instanceof Error ? error.message : 'Unknown error');
      } catch (trackingError) {
        console.error('Failed to track token refresh error:', trackingError);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error refreshing token'
      };
    }
  }
  
  // Track token refresh failures
  static async trackRefreshFailure(accountId: string, errorMessage: string) {
    try {
      // Get current account to check refresh attempts
      const { data: account } = await supabase
        .from('reddit_accounts')
        .select('refresh_attempts')
        .eq('id', accountId)
        .single();
      
      const refreshAttempts = (account?.refresh_attempts || 0) + 1;
      
      // After 3 consecutive failures, mark account as inactive
      const shouldDeactivate = refreshAttempts >= 3;
      
      if (shouldDeactivate) {
        await this.markAccountInactive(accountId, `Account deactivated after ${refreshAttempts} failed refresh attempts: ${errorMessage}`);
      } else {
        await supabase
          .from('reddit_accounts')
          .update({
            refresh_error: errorMessage,
            refresh_attempts: refreshAttempts,
            last_token_refresh: new Date().toISOString()
          })
          .eq('id', accountId);
      }
    } catch (error) {
      console.error('Error tracking token refresh failure:', error);
      throw error;
    }
  }
  
  // Mark account as inactive
  static async markAccountInactive(accountId: string, reason: string) {
    try {
      console.warn(`Marking Reddit account ID ${accountId} as inactive: ${reason}`);
      
      await supabase
        .from('reddit_accounts')
        .update({
          is_active: false,
          refresh_error: reason,
          last_token_refresh: new Date().toISOString()
        })
        .eq('id', accountId);
    } catch (error) {
      console.error('Error marking account as inactive:', error);
      throw error;
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