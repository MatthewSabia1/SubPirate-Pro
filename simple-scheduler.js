// Simple Scheduler - A lightweight version of the campaign scheduler
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
  origin: '*',  // For quick setup - restrict this in production
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
        reddit_account:reddit_accounts(id, username),
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
      
      // Log the posts that will be processed
      posts.forEach(post => {
        logMessage(`Scheduled post: "${post.title}" for subreddit r/${post.subreddit?.name}, scheduled for ${post.scheduled_for}`);
      });
      
      // Update the posts to processing status
      for (const post of posts) {
        const { error: updateError } = await supabase
          .from('campaign_posts')
          .update({ 
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', post.id);
        
        if (updateError) {
          logMessage(`Error updating post ${post.id} to processing status: ${updateError.message}`, 'error');
        } else {
          logMessage(`Updated post ${post.id} to processing status`);
          
          // Log to campaign_activity table
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
        }
      }
      
      // In a proper implementation, we would call the Reddit API here
      // For this simplified version, mark posts as "posted" for demonstration
      for (const post of posts) {
        logMessage(`Simulating posting for post ${post.id}: "${post.title}"`);
        
        // Update post status to posted
        const { error: postUpdateError } = await supabase
          .from('campaign_posts')
          .update({
            status: 'posted',
            posted_at: new Date().toISOString(),
            reddit_post_id: `simulated-${post.id}`,
            reddit_permalink: `/r/${post.subreddit?.name}/simulated/${post.id}`,
            execution_time_ms: 1500, // Simulated execution time
            last_error: null
          })
          .eq('id', post.id);
          
        if (postUpdateError) {
          logMessage(`Error updating post ${post.id} status: ${postUpdateError.message}`, 'error');
        } else {
          logMessage(`Updated post ${post.id} to posted status (simulation)`);
          
          // Log to campaign_activity
          try {
            await supabase
              .from('campaign_activity')
              .insert({
                campaign_id: post.campaign_id,
                post_id: post.id,
                action_type: 'post_success_simulated',
                details: {
                  reddit_post_id: `simulated-${post.id}`,
                  permalink: `/r/${post.subreddit?.name}/simulated/${post.id}`,
                  execution_time_ms: 1500,
                  subreddit: post.subreddit?.name,
                  reddit_account: post.reddit_account?.username
                }
              });
          } catch (logError) {
            logMessage(`Could not log to campaign_activity: ${logError.message}`, 'warn');
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0-simple',
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
🚀 Simple Campaign Scheduler Started
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