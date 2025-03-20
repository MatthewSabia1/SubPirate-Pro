import { supabase } from '../../../lib/supabase';
import { CampaignPost } from '../types';
import { RedditPostingService } from './reddit';

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
      
      // Get posts that are scheduled to be posted now or in the past
      const { data: posts, error } = await supabase
        .from('campaign_posts')
        .select(`
          *,
          reddit_account:reddit_accounts(id, username, oauth_token, oauth_refresh_token, token_expiry),
          subreddit:subreddits(id, name),
          campaign:campaigns(id, name),
          media_item:media_items(*)
        `)
        .eq('status', 'scheduled')
        .lte('scheduled_for', now.toISOString());
      
      if (error) {
        throw error;
      }

      if (posts && posts.length > 0) {
        console.log(`Found ${posts.length} posts to execute`);
        
        // Process each post that needs to be executed
        // Using Promise.all with a concurrency limit to avoid overwhelming the API
        const concurrencyLimit = 3; // Process max 3 posts at once
        
        // Create chunks of posts to process
        for (let i = 0; i < posts.length; i += concurrencyLimit) {
          const chunk = posts.slice(i, i + concurrencyLimit);
          
          console.log(`Processing batch of ${chunk.length} posts`);
          await Promise.all(chunk.map(post => {
            console.log(`Processing post: "${post.title}" for subreddit r/${post.subreddit?.name}, scheduled for ${post.scheduled_for}`);
            return this.executePost(post).catch(err => {
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
    try {
      // First update status to processing to prevent duplicate processing
      const { error: updateError } = await supabase
        .from('campaign_posts')
        .update({ status: 'processing' })
        .eq('id', post.id);
      
      if (updateError) throw updateError;

      // Get the Reddit account token
      const redditAccount = post.reddit_account;
      const subredditName = post.subreddit?.name;
      
      // If this is an image post, fetch the full media item data
      if (post.content_type === 'image' && post.media_item_id) {
        try {
          const { data: mediaItem, error: mediaError } = await supabase
            .from('media_items')
            .select('*')
            .eq('id', post.media_item_id)
            .single();
            
          if (mediaError) {
            console.error('Error fetching media item:', mediaError);
          } else if (mediaItem) {
            post.media_item = mediaItem;
          }
        } catch (err) {
          console.error('Error fetching media details:', err);
        }
      }
      
      if (!redditAccount || !subredditName) {
        throw new Error('Missing Reddit account or subreddit information');
      }

      // Check if we need to refresh the token
      let accessToken = redditAccount.oauth_token;
      let refreshToken = redditAccount.oauth_refresh_token;
      const tokenExpiry = redditAccount.token_expiry ? new Date(redditAccount.token_expiry) : null;
      
      // Check if token is expired or will expire in the next 10 minutes
      const isTokenExpired = !tokenExpiry || 
                             tokenExpiry < new Date(Date.now() + 10 * 60 * 1000);
      
      if (isTokenExpired && refreshToken) {
        try {
          console.log(`Token for ${redditAccount.username} is expired or will expire soon. Refreshing...`);
          
          // Get app credentials from environment
          // Check both process.env and import.meta.env for flexibility between server and browser environments
          const CLIENT_ID = process.env.VITE_REDDIT_APP_ID || 
                           (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_REDDIT_APP_ID : undefined);
          const CLIENT_SECRET = process.env.VITE_REDDIT_APP_SECRET || 
                               (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_REDDIT_APP_SECRET : undefined);
          
          if (!CLIENT_ID || !CLIENT_SECRET) {
            throw new Error('Reddit API credentials missing. Set VITE_REDDIT_APP_ID and VITE_REDDIT_APP_SECRET.');
          }
          
          // Create the authorization string
          const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
          
          // Prepare request body
          const body = new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          });
          
          // Make the request to refresh the token
          const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${authString}`,
              'User-Agent': 'SubPirate/1.0.0 (by /u/subpirate_app)'
            },
            body: body.toString()
          });
          
          // Handle unsuccessful response
          if (!response.ok) {
            const responseText = await response.text();
            throw new Error(`Failed to refresh token: ${response.status} ${response.statusText} - ${responseText}`);
          }
          
          // Parse the response
          const data = await response.json();
          if (!data.access_token) {
            throw new Error('Invalid token response from Reddit');
          }
          
          // Calculate new expiry time
          const expiresAt = new Date(Date.now() + (data.expires_in * 1000));
          
          // Update tokens in database
          const { error: updateError } = await supabase
            .from('reddit_accounts')
            .update({
              access_token: data.access_token,
              token_expiry: expiresAt.toISOString(),
              last_used_at: new Date().toISOString()
            })
            .eq('id', redditAccount.id);
          
          if (updateError) {
            throw updateError;
          }
          
          // Use the new token
          accessToken = data.access_token;
          console.log(`Successfully refreshed token for ${redditAccount.username}`);
        } catch (error) {
          console.error(`Error refreshing token for ${redditAccount.username}:`, error);
          throw new Error(`Failed to refresh Reddit authentication token: ${error.message || 'Unknown error'}`);
        }
      }

      // Submit the post to Reddit
      const result = await RedditPostingService.submitPost(
        post,
        {
          username: redditAccount.username,
          accessToken: accessToken
        },
        subredditName
      );

      if (result.success) {
        // Update the post as successfully posted
        await supabase
          .from('campaign_posts')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            reddit_post_id: result.postId
          })
          .eq('id', post.id);

        // If this is a recurring post, schedule the next occurrence
        if (post.interval_hours && post.interval_hours > 0) {
          await this.scheduleNextRecurringPost(post);
        }
      } else {
        // Update as failed
        await supabase
          .from('campaign_posts')
          .update({
            status: 'failed',
            posted_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        console.error('Failed to post to Reddit:', result.error);
      }
    } catch (error) {
      console.error('Error executing campaign post:', error);
      
      // Update the post as failed
      await supabase
        .from('campaign_posts')
        .update({
          status: 'failed',
          posted_at: new Date().toISOString()
        })
        .eq('id', post.id);
    }
  }

  // Schedule the next occurrence of a recurring post
  static async scheduleNextRecurringPost(post: any) {
    try {
      // Calculate the next posting time
      const nextTime = new Date(post.scheduled_for);
      nextTime.setHours(nextTime.getHours() + post.interval_hours);

      // Create a new post entry for the next occurrence
      const newPost = {
        campaign_id: post.campaign_id,
        reddit_account_id: post.reddit_account_id,
        media_item_id: post.media_item_id,
        subreddit_id: post.subreddit_id,
        title: post.title,
        content_type: post.content_type,
        content: post.content,
        status: 'scheduled',
        scheduled_for: nextTime.toISOString(),
        interval_hours: post.interval_hours,
        use_ai_title: post.use_ai_title,
        use_ai_timing: post.use_ai_timing
      };

      const { error } = await supabase
        .from('campaign_posts')
        .insert(newPost);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error scheduling next recurring post:', error);
    }
  }
}