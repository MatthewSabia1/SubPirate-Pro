// Simple test server for campaign feature
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'API routes are working',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Check scheduled posts
app.get('/api/campaigns/scheduled', async (req, res) => {
  try {
    // Get posts scheduled in the next 24 hours
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data, error } = await supabase
      .from('campaign_posts')
      .select(`
        id, title, content_type, status, scheduled_for
      `)
      .lte('scheduled_for', tomorrow.toISOString())
      .order('scheduled_for', { ascending: true });
      
    if (error) throw error;
    
    res.json({
      success: true,
      count: data.length,
      posts: data
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching scheduled posts',
      error: error.message
    });
  }
});

// Start server
const port = process.env.WEBHOOK_SERVER_PORT || 4242;
app.listen(port, () => {
  console.log(`
========================================================
🚀 Test Server Started
========================================================
Server: http://localhost:${port}
Health Check: http://localhost:${port}/health
View Scheduled: http://localhost:${port}/api/campaigns/scheduled
========================================================
  `);
});