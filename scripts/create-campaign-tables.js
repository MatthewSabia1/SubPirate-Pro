// Simple script to create campaign tables using the ANON_KEY
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Use ANON_KEY since SERVICE_KEY may not be available

// Check if credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

// Get current file directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Creating Supabase client with available credentials...');
console.log('URL:', supabaseUrl.substring(0, 20) + '...');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Define the tables needed for campaigns feature
async function createCampaignTables() {
  console.log('Creating campaign tables...');
  
  try {
    // Step 1: Create campaigns table if it doesn't exist
    console.log('Creating campaigns table...');
    const { error: campaignsError } = await supabase.sql(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE,
        schedule_type TEXT DEFAULT 'one-time'
      );
    `);
    
    if (campaignsError) {
      console.error('Error creating campaigns table:', campaignsError);
    } else {
      console.log('Campaigns table created or already exists.');
    }
    
    // Step 2: Create campaign_posts table if it doesn't exist
    console.log('Creating campaign_posts table...');
    const { error: postsError } = await supabase.sql(`
      CREATE TABLE IF NOT EXISTS campaign_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        reddit_account_id UUID,
        media_item_id UUID,
        subreddit_id UUID,
        title TEXT NOT NULL,
        content_type TEXT NOT NULL,
        content TEXT,
        status TEXT DEFAULT 'scheduled',
        scheduled_for TIMESTAMP WITH TIME ZONE,
        posted_at TIMESTAMP WITH TIME ZONE,
        reddit_post_id TEXT,
        interval_hours INTEGER,
        use_ai_title BOOLEAN DEFAULT FALSE,
        use_ai_timing BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        processing_started_at TIMESTAMP WITH TIME ZONE,
        execution_time_ms INTEGER,
        last_error TEXT,
        reddit_permalink TEXT,
        parent_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL
      );
    `);
    
    if (postsError) {
      console.error('Error creating campaign_posts table:', postsError);
    } else {
      console.log('Campaign_posts table created or already exists.');
    }
    
    // Step 3: Create campaign_activity table
    console.log('Creating campaign_activity table...');
    const { error: activityError } = await supabase.sql(`
      CREATE TABLE IF NOT EXISTS campaign_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
        post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
        related_post_id UUID REFERENCES campaign_posts(id) ON DELETE SET NULL,
        action_type TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
      );
    `);
    
    if (activityError) {
      console.error('Error creating campaign_activity table:', activityError);
    } else {
      console.log('Campaign_activity table created or already exists.');
    }
    
    // Step 4: Create campaign_metrics view
    console.log('Creating campaign_metrics view...');
    const { error: metricsError } = await supabase.sql(`
      CREATE OR REPLACE VIEW campaign_metrics AS
      SELECT 
        c.id AS campaign_id,
        c.name AS campaign_name,
        c.user_id,
        c.is_active,
        c.created_at,
        COUNT(DISTINCT cp.id) AS total_posts,
        SUM(CASE WHEN cp.status = 'posted' THEN 1 ELSE 0 END) AS posted_count,
        SUM(CASE WHEN cp.status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled_count,
        SUM(CASE WHEN cp.status = 'failed' THEN 1 ELSE 0 END) AS failed_count,
        MAX(cp.posted_at) AS last_post_at,
        MIN(CASE WHEN cp.status = 'scheduled' THEN cp.scheduled_for ELSE NULL END) AS next_scheduled_post
      FROM campaigns c
      LEFT JOIN campaign_posts cp ON c.id = cp.campaign_id
      GROUP BY c.id, c.name, c.user_id, c.is_active, c.created_at;
    `);
    
    if (metricsError) {
      console.error('Error creating campaign_metrics view:', metricsError);
    } else {
      console.log('Campaign_metrics view created or replaced.');
    }
    
    // Step 5: Create indices for performance
    console.log('Creating indices...');
    const indices = [
      'CREATE INDEX IF NOT EXISTS idx_campaign_posts_campaign_id ON campaign_posts(campaign_id);',
      'CREATE INDEX IF NOT EXISTS idx_campaign_posts_status ON campaign_posts(status);',
      'CREATE INDEX IF NOT EXISTS idx_campaign_posts_scheduled_for ON campaign_posts(scheduled_for);',
      'CREATE INDEX IF NOT EXISTS idx_campaign_activity_campaign_id ON campaign_activity(campaign_id);',
      'CREATE INDEX IF NOT EXISTS idx_campaign_activity_post_id ON campaign_activity(post_id);',
      'CREATE INDEX IF NOT EXISTS idx_campaign_activity_action_type ON campaign_activity(action_type);'
    ];
    
    for (const indexSql of indices) {
      const { error: indexError } = await supabase.sql(indexSql);
      if (indexError) {
        console.error(`Error creating index: ${indexSql}`, indexError);
      }
    }
    
    console.log('Indices created.');
    
    // Create or update RLS policies (simplified - user must create proper RLS policies through dashboard)
    console.log('\nDatabase setup completed successfully!');
    console.log('\nNOTE: Row Level Security (RLS) policies are not automatically created.');
    console.log('Please set up appropriate RLS policies through the Supabase dashboard.');
    
  } catch (error) {
    console.error('Error creating campaign tables:', error);
    process.exit(1);
  }
}

// Run the function
createCampaignTables();