// Production Campaign Scheduler with full Reddit posting capabilities
import express from 'express';
import bodyParser from 'body-parser';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Security middleware
app.use(cors({
  origin: '*',  // In production, you should restrict this
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '1mb' }));

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pdgnyhkngewmneujsheq.supabase.co';
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTg4NTc2NiwiZXhwIjoyMDU1NDYxNzY2fQ.YS61kJJBeBqbPRjRo4jvL7f7nVPWIPEl2x91ofMzY9o';

console.log('Using Supabase URL:', supabaseUrl);
console.log('Service role key available:', !!serviceRoleKey);

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logger function
function logMessage(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${type.toUpperCase()}] ${message}\n`;
  
  // Log to console
  console.log(logEntry.trim());
  
  // Log to file with date-based rotation
  const today = new Date().toISOString().split('T')[0];
  const logFilePath = path.join(logsDir, `scheduler-${today}.log`);
  
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
}

// Reddit API Client 
class RedditPostingService {
  // Post to Reddit
  static async submitPost(post, accountDetails, subredditName) {
    try {
      logMessage(`Submitting post "${post.title}" to r/${subredditName} using account ${accountDetails.username}`);
      
      // Validate essential data
      if (!post || !accountDetails || !subredditName) {
        return {
          success: false,
          error: 'Missing post data, account details, or subreddit name'
        };
      }
      
      if (!accountDetails.accessToken) {
        return {
          success: false,
          error: 'Missing Reddit access token'
        };
      }
      
      // Prepare request based on content type
      let url = 'https://oauth.reddit.com/api/submit';
      const body = new URLSearchParams({
        sr: subredditName,
        title: post.title,
        api_type: 'json',
        resubmit: 'true'
      });
      
      // Add content based on type
      if (post.content_type === 'text') {
        body.append('kind', 'self');
        body.append('text', post.content || '');
        logMessage(`Text post body: ${post.content?.substring(0, 100)}...`);
      } 
      else if (post.content_type === 'link') {
        body.append('kind', 'link');
        body.append('url', post.content);
        logMessage(`Link post URL: ${post.content}`);
      }
      else if (post.content_type === 'image') {
        body.append('kind', 'image');
        
        // Use media_item URL if available
        let mediaUrl;
        if (post.media_item && post.media_item.url) {
          mediaUrl = post.media_item.url;
        } else if (post.content && post.content.startsWith('http')) {
          mediaUrl = post.content;
        } else {
          return {
            success: false,
            error: 'Image post is missing a valid media URL'
          };
        }
        
        body.append('url', mediaUrl);
        logMessage(`Image post URL: ${mediaUrl}`);
        
        // Optional caption text
        if (post.content && !post.content.startsWith('http')) {
          body.append('text', post.content);
        }
      }
      
      // Make the API request to Reddit
      logMessage('Making Reddit API request...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accountDetails.accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SubPirate/1.0.0 by u/subpirate_app'
        },
        body: body
      });
      
      // Get response as text first for better error handling
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse error as JSON if possible
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.json?.errors?.length > 0) {
            errorDetail = errorJson.json.errors.map(e => e.join(': ')).join(', ');
          } else if (errorJson.message) {
            errorDetail = errorJson.message;
          }
        } catch (e) {
          // If we can't parse as JSON, use the raw text
        }
        
        return {
          success: false,
          error: `Reddit API error (${response.status}): ${errorDetail}`
        };
      }
      
      // Parse the JSON response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        return {
          success: false,
          error: `Failed to parse Reddit API response: ${e.message}`
        };
      }
      
      // Extract post ID and permalink
      let postId, permalink;
      
      if (data.json?.data?.id) {
        postId = data.json.data.id;
        permalink = data.json.data.permalink;
      } else if (data.id || data.name) {
        postId = data.id || data.name;
        permalink = data.permalink;
      } else {
        // Try to find any ID-like field as fallback
        const possibleIds = Object.entries(data)
          .filter(([key]) => key.includes('id') || key.includes('name'))
          .map(([_, value]) => value);
        
        postId = possibleIds.length > 0 ? possibleIds[0] : 'unknown';
      }
      
      logMessage(`Post successfully submitted to Reddit! ID: ${postId}, Permalink: ${permalink || '[Not available]'}`);
      
      return {
        success: true,
        postId,
        permalink
      };
    } catch (error) {
      logMessage(`Error posting to Reddit: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message || 'Unknown error occurred'
      };
    }
  }
}

// Function to refresh OAuth token
async function refreshRedditToken(refreshToken) {
  try {
    // Get app credentials from environment
    const CLIENT_ID = process.env.VITE_REDDIT_APP_ID;
    const CLIENT_SECRET = process.env.VITE_REDDIT_APP_SECRET;
    
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
    
    return {
      accessToken: data.access_token,
      expiresAt
    };
  } catch (error) {
    logMessage(`Error refreshing token: ${error.message}`, 'error');
    throw error;
  }
}

// Core scheduler function to check and process posts
async function checkScheduledPosts() {
  try {
    const now = new Date();
    logMessage(`Checking for scheduled posts at ${now.toISOString()}`);
    
    // Get posts that are scheduled to be posted now or in the past
    const { data: posts, error } = await supabase
      .from('campaign_posts')
      .select(`
        *,
        reddit_account:reddit_accounts(id, username, oauth_token, oauth_refresh_token, token_expiry),
        subreddit:subreddits(id, name),
        campaign:campaigns(id, name, user_id),
        media_item:media_items(id, url)
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_for', now.toISOString());
    
    if (error) {
      throw error;
    }

    if (posts && posts.length > 0) {
      logMessage(`Found ${posts.length} posts to execute`);
      
      // Process posts one by one (could be done in parallel with a concurrency limit)
      for (const post of posts) {
        const startTime = Date.now();
        
        try {
          logMessage(`Processing post: "${post.title}" for subreddit r/${post.subreddit?.name}, scheduled for ${post.scheduled_for}`);
          
          // Update post to processing status
          const { error: updateError } = await supabase
            .from('campaign_posts')
            .update({ 
              status: 'processing',
              processing_started_at: new Date().toISOString()
            })
            .eq('id', post.id);
          
          if (updateError) {
            logMessage(`Error updating post ${post.id} to processing status: ${updateError.message}`, 'error');
            continue;
          }
          
          // Log to campaign_activity
          try {
            await supabase
              .from('campaign_activity')
              .insert({
                campaign_id: post.campaign_id,
                post_id: post.id,
                action_type: 'processing_started',
                details: {
                  scheduled_for: post.scheduled_for,
                  started_at: new Date().toISOString()
                }
              });
          } catch (logError) {
            logMessage(`Could not log to campaign_activity: ${logError.message}`, 'warn');
          }
          
          // Get Reddit account details
          const redditAccount = post.reddit_account;
          if (!redditAccount || !redditAccount.oauth_token) {
            throw new Error('Missing Reddit account or OAuth token');
          }
          
          // Check if token is expired
          let accessToken = redditAccount.oauth_token;
          
          // If token_expiry exists and is expired (or within 10 mins of expiry), refresh it
          const tokenExpiry = redditAccount.token_expiry ? new Date(redditAccount.token_expiry) : null;
          const isTokenExpired = !tokenExpiry || tokenExpiry < new Date(Date.now() + 10 * 60 * 1000);
          
          if (isTokenExpired && redditAccount.oauth_refresh_token) {
            try {
              logMessage(`Token for ${redditAccount.username} is expired or will expire soon. Refreshing...`);
              
              const tokenResult = await refreshRedditToken(redditAccount.oauth_refresh_token);
              accessToken = tokenResult.accessToken;
              
              // Update tokens in database
              await supabase
                .from('reddit_accounts')
                .update({
                  oauth_token: tokenResult.accessToken,
                  token_expiry: tokenResult.expiresAt.toISOString(),
                  last_used_at: new Date().toISOString()
                })
                .eq('id', redditAccount.id);
              
              logMessage(`Successfully refreshed token for ${redditAccount.username}`);
            } catch (refreshError) {
              throw new Error(`Failed to refresh Reddit token: ${refreshError.message}`);
            }
          }
          
          // Now submit the post to Reddit
          const subredditName = post.subreddit?.name;
          if (!subredditName) {
            throw new Error('Missing subreddit name');
          }
          
          const result = await RedditPostingService.submitPost(
            post,
            {
              username: redditAccount.username,
              accessToken: accessToken
            },
            subredditName
          );
          
          // Calculate execution time
          const executionTime = Date.now() - startTime;
          
          if (result.success) {
            // Update the post as successfully posted
            const { error: successUpdateError } = await supabase
              .from('campaign_posts')
              .update({
                status: 'posted',
                posted_at: new Date().toISOString(),
                reddit_post_id: result.postId,
                reddit_permalink: result.permalink || null,
                execution_time_ms: executionTime,
                last_error: null
              })
              .eq('id', post.id);
              
            if (successUpdateError) {
              logMessage(`Error updating post status to posted: ${successUpdateError.message}`, 'error');
            }
            
            // Log to campaign_activity
            try {
              await supabase
                .from('campaign_activity')
                .insert({
                  campaign_id: post.campaign_id,
                  post_id: post.id,
                  action_type: 'post_success',
                  details: {
                    reddit_post_id: result.postId,
                    permalink: result.permalink,
                    execution_time_ms: executionTime,
                    subreddit: subredditName,
                    reddit_account: redditAccount.username
                  }
                });
            } catch (logError) {
              logMessage(`Could not log to campaign_activity: ${logError.message}`, 'warn');
            }
            
            // If this is a recurring post, schedule the next occurrence
            if (post.interval_hours && post.interval_hours > 0) {
              await scheduleNextRecurringPost(post);
            }
          } else {
            // Update as failed with the error message
            const { error: failureUpdateError } = await supabase
              .from('campaign_posts')
              .update({
                status: 'failed',
                posted_at: new Date().toISOString(),
                execution_time_ms: executionTime,
                last_error: result.error
              })
              .eq('id', post.id);
              
            if (failureUpdateError) {
              logMessage(`Error updating post status to failed: ${failureUpdateError.message}`, 'error');
            }
            
            // Log failure to campaign_activity
            try {
              await supabase
                .from('campaign_activity')
                .insert({
                  campaign_id: post.campaign_id,
                  post_id: post.id,
                  action_type: 'post_failure',
                  details: {
                    error: result.error,
                    execution_time_ms: executionTime,
                    subreddit: subredditName,
                    reddit_account: redditAccount.username
                  }
                });
            } catch (logError) {
              logMessage(`Could not log to campaign_activity: ${logError.message}`, 'warn');
            }
          }
        } catch (postError) {
          // Handle any errors during post processing
          logMessage(`Error processing post ${post.id}: ${postError.message}`, 'error');
          
          // Update the post as failed
          try {
            await supabase
              .from('campaign_posts')
              .update({
                status: 'failed',
                posted_at: new Date().toISOString(),
                execution_time_ms: Date.now() - startTime,
                last_error: postError.message
              })
              .eq('id', post.id);
              
            // Log error to campaign_activity
            await supabase
              .from('campaign_activity')
              .insert({
                campaign_id: post.campaign_id,
                post_id: post.id,
                action_type: 'post_error',
                details: {
                  error: postError.message,
                  execution_time_ms: Date.now() - startTime
                }
              });
          } catch (updateError) {
            logMessage(`Error updating post failure status: ${updateError.message}`, 'error');
          }
        }
      }
    } else {
      logMessage('No scheduled posts found for current time window');
    }
  } catch (error) {
    logMessage(`Error checking scheduled posts: ${error.message}`, 'error');
  }
}

// Schedule the next occurrence of a recurring post
async function scheduleNextRecurringPost(post) {
  try {
    logMessage(`Scheduling next occurrence of recurring post ID ${post.id}, interval: ${post.interval_hours} hours`);
    
    // Calculate next posting time based on the original scheduled time
    const nextTime = new Date(post.scheduled_for);
    nextTime.setHours(nextTime.getHours() + post.interval_hours);
    
    // Ensure the next time is in the future
    const now = new Date();
    if (nextTime <= now) {
      logMessage(`Calculated next time is in the past, adjusting to future time`);
      nextTime.setTime(now.getTime() + (post.interval_hours * 60 * 60 * 1000));
    }
    
    logMessage(`Next post scheduled for ${nextTime.toISOString()}`);
    
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
      use_ai_timing: post.use_ai_timing,
      parent_post_id: post.id
    };
    
    const { data, error } = await supabase
      .from('campaign_posts')
      .insert(newPost)
      .select();
    
    if (error) {
      throw error;
    }
    
    logMessage(`New recurring post created with ID: ${data?.[0]?.id || 'unknown'}`);
    
    // Log to campaign_activity
    try {
      await supabase
        .from('campaign_activity')
        .insert({
          campaign_id: post.campaign_id,
          post_id: post.id,
          related_post_id: data?.[0]?.id,
          action_type: 'recurring_scheduled',
          details: {
            interval_hours: post.interval_hours,
            scheduled_for: nextTime.toISOString()
          }
        });
    } catch (logError) {
      logMessage(`Could not log to campaign_activity: ${logError.message}`, 'warn');
    }
  } catch (error) {
    logMessage(`Error scheduling next recurring post: ${error.message}`, 'error');
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0-production',
    timestamp: new Date().toISOString()
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'API routes are working',
    scheduler: 'active',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Endpoint to manually trigger the campaign scheduler
app.post('/api/campaigns/process', async (req, res) => {
  try {
    logMessage('Manual trigger of campaign processing');
    await checkScheduledPosts();
    res.json({ 
      success: true, 
      message: 'Campaign processing triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logMessage(`Error processing campaigns: ${error.message}`, 'error');
    res.status(500).json({ 
      success: false, 
      message: 'Error processing campaigns',
      error: error.message
    });
  }
});

// Create an endpoint to check upcoming posts
app.get('/api/campaigns/scheduled', async (req, res) => {
  try {
    // Get posts scheduled in the next 24 hours
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data, error } = await supabase
      .from('campaign_posts')
      .select(`
        id, title, content_type, status, scheduled_for,
        campaign:campaigns(id, name),
        subreddit:subreddits(id, name),
        reddit_account:reddit_accounts(id, username)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', tomorrow.toISOString())
      .order('scheduled_for', { ascending: true });
      
    if (error) throw error;
    
    res.json({
      success: true,
      count: data.length,
      posts: data.map(post => ({
        id: post.id,
        title: post.title,
        campaign: post.campaign?.name,
        subreddit: post.subreddit?.name,
        reddit_account: post.reddit_account?.username,
        content_type: post.content_type,
        status: post.status,
        scheduled_for: post.scheduled_for
      }))
    });
  } catch (error) {
    logMessage(`Error fetching scheduled posts: ${error.message}`, 'error');
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching scheduled posts',
      error: error.message
    });
  }
});

// Get campaign stats endpoint
app.get('/api/campaigns/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaign_metrics')
      .select('*');
      
    if (error) throw error;
    
    res.json({
      success: true,
      campaigns: data
    });
  } catch (error) {
    logMessage(`Error fetching campaign stats: ${error.message}`, 'error');
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching campaign stats' 
    });
  }
});

// Start the scheduler loop
let schedulerInterval = null;

function startScheduler() {
  // Run immediately once
  checkScheduledPosts();
  
  // Then check every minute
  schedulerInterval = setInterval(() => {
    checkScheduledPosts();
  }, 60 * 1000);
  
  return schedulerInterval;
}

// Start server
const port = process.env.WEBHOOK_SERVER_PORT || 4242;
const server = app.listen(port, () => {
  logMessage(`
========================================================
🚀 Production Campaign Scheduler Started
========================================================
Server: http://localhost:${port}
Health Check: http://localhost:${port}/health
Manual Process: http://localhost:${port}/api/campaigns/process
View Scheduled: http://localhost:${port}/api/campaigns/scheduled
========================================================
  `);
  
  // Start the scheduler
  startScheduler();
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  logMessage('\n🛑 Received shutdown signal, gracefully shutting down...');
  
  // Clear the scheduler interval
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    logMessage('✅ Campaign scheduler stopped');
  }
  
  // Close the express server
  server.close(() => {
    logMessage('✅ Express server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    logMessage('❌ Could not close connections in time, forcefully shutting down', 'error');
    process.exit(1);
  }, 10000);
}