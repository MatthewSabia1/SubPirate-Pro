import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
// Import without .js extension for compatibility with ES modules in Node
import { RedditPostingService } from './src/features/campaigns/services/reddit.js';
import { CampaignScheduler } from './src/features/campaigns/services/scheduler.js';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Use JSON parser for all routes except the webhook
app.use(bodyParser.json());

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simplified webhook route (Stripe integration removed)
app.post('/api/stripe/webhook', (req, res) => {
  console.log('Webhook request received (Stripe integration removed)');
  return res.status(200).json({ 
    success: true, 
    message: 'Stripe webhook functionality has been removed' 
  });
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'API routes are working' });
});

// Endpoint to manually trigger the campaign scheduler
app.post('/api/campaigns/process', async (req, res) => {
  try {
    console.log('Manual trigger of campaign processing');
    await CampaignScheduler.checkScheduledPosts();
    res.json({ success: true, message: 'Campaign processing triggered' });
  } catch (error) {
    console.error('Error processing campaigns:', error);
    res.status(500).json({ success: false, message: 'Error processing campaigns' });
  }
});

// Start the campaign scheduler
console.log('Starting campaign scheduler...');
const schedulerInterval = CampaignScheduler.startScheduler();

// Start server on a different port to avoid conflicts with Vite
const port = 4242;
const server = app.listen(port, () => {
  console.log(`Webhook server running at http://localhost:${port}`);
  console.log(`Campaign scheduler active`);
  console.log(`Manual processing endpoint: http://localhost:${port}/api/campaigns/process`);
  console.log(`Reddit API credentials: ${process.env.VITE_REDDIT_APP_ID ? 'Found' : 'Missing'}`);
  console.log(`Supabase credentials: ${process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY ? 'Found' : 'Missing'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('Received shutdown signal, closing server...');
  
  // Clear the scheduler interval
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('Campaign scheduler stopped');
  }
  
  // Close the express server
  server.close(() => {
    console.log('Express server closed');
    process.exit(0);
  });
  
  // Force close after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
}