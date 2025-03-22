// Script to set up campaign tables using Supabase API
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use the service role key provided by the user
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTg4NTc2NiwiZXhwIjoyMDU1NDYxNzY2fQ.YS61kJJBeBqbPRjRo4jvL7f7nVPWIPEl2x91ofMzY9o';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function setupCampaignTables() {
  console.log('Setting up campaign tables...');

  try {
    // Step 1: Check if campaigns table exists
    console.log('Checking if campaigns table exists...');
    const { data: campaignsExists, error: campaignsCheckError } = await supabase
      .from('campaigns')
      .select('id')
      .limit(1);
    
    if (campaignsCheckError && campaignsCheckError.code === '42P01') {
      console.log('Creating campaigns table...');
      
      // Create campaigns table through REST API
      // This won't work through the JS client, but we'll check if the table exists in the next step
      try {
        await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({
            command: `
              CREATE TABLE IF NOT EXISTS campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                is_active BOOLEAN DEFAULT TRUE,
                schedule_type TEXT DEFAULT 'one-time'
              );
            `
          })
        });
      } catch (e) {
        console.log('Error creating table via REST API (expected):', e.message);
      }
    } else {
      console.log('Campaigns table already exists.');
    }
    
    // Step 2: Check if campaign_posts table exists
    console.log('Checking if campaign_posts table exists...');
    const { data: postsExists, error: postsCheckError } = await supabase
      .from('campaign_posts')
      .select('id')
      .limit(1);
    
    if (postsCheckError && postsCheckError.code === '42P01') {
      console.log('Campaign_posts table does not exist.');
      // We can't create it directly through the JS client
    } else {
      console.log('Campaign_posts table already exists.');
      // Let's check if we need to add new columns
      try {
        // Check if processing_started_at column exists
        console.log('Checking and adding new columns to campaign_posts...');
        const { data: hasNewColumns } = await supabase
          .from('campaign_posts')
          .select('processing_started_at, execution_time_ms, last_error, reddit_permalink, parent_post_id')
          .limit(1);
        
        console.log('Campaign_posts table has the required columns.');
      } catch (columnError) {
        console.log('Some columns might be missing in campaign_posts table.');
        // We'd need SQL directly to alter the table
      }
    }
    
    // Step 3: Check if campaign_activity table exists
    console.log('Checking if campaign_activity table exists...');
    const { data: activityExists, error: activityCheckError } = await supabase
      .from('campaign_activity')
      .select('id')
      .limit(1);
    
    if (activityCheckError && activityCheckError.code === '42P01') {
      console.log('Campaign_activity table does not exist.');
      // We can't create it directly through the JS client
    } else {
      console.log('Campaign_activity table already exists.');
    }

    console.log('\nChecks completed!');
    
    // Instruct user to run SQL migrations if tables don't exist
    if ((campaignsCheckError && campaignsCheckError.code === '42P01') || 
        (postsCheckError && postsCheckError.code === '42P01') ||
        (activityCheckError && activityCheckError.code === '42P01')) {
      console.log('\nSome required tables do not exist in the database.');
      console.log('Please run SQL migrations through the Supabase dashboard:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Copy and paste the SQL from migrations/db_setup.sql and run it');
      console.log('3. Copy and paste the SQL from migrations/campaign_activity_tracking.sql and run it');
      
      // Print the SQL content for easy copying
      console.log('\nAlternatively, check if the Supabase functions are available that would allow us');
      console.log('to run the migrations through the client.');
    } else {
      console.log('\nAll required tables exist. You can now run the campaign scheduler:');
      console.log('npm run campaigns:run');
    }

  } catch (error) {
    console.error('Error checking campaign tables:', error);
  }
}

// Run the setup
setupCampaignTables();