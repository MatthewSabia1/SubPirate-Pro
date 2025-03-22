// Simple test script to verify campaign scheduler functionality
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Scheduler API endpoint
// For simplicity in testing, we hardcode the URL
const schedulerUrl = `http://localhost:4242`;

// Utility function to check server health
async function checkServerHealth() {
  try {
    console.log('Checking scheduler server health...');
    const response = await fetch(`${schedulerUrl}/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Server is running:', data);
      return true;
    } else {
      console.error('❌ Server health check failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Cannot connect to scheduler server. Is it running?');
    console.error('   Run npm run campaigns:run to start the server');
    return false;
  }
}

// Test API endpoints
async function testApiEndpoints() {
  console.log('\nTesting API endpoints...');
  
  // Test /api/test endpoint
  try {
    const response = await fetch(`${schedulerUrl}/api/test`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API test endpoint:', data);
    } else {
      console.error('❌ API test endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ API test endpoint error:', error.message);
  }
  
  // Test /api/campaigns/scheduled endpoint
  try {
    const response = await fetch(`${schedulerUrl}/api/campaigns/scheduled`);
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Scheduled posts endpoint:', {
        success: data.success,
        count: data.count,
        sample: data.posts && data.posts.length > 0 ? data.posts[0] : 'No scheduled posts'
      });
    } else {
      console.error('❌ Scheduled posts endpoint failed:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Scheduled posts endpoint error:', error.message);
  }
}

// Check for test posts
async function checkDatabaseTables() {
  console.log('\nChecking database tables...');
  
  // Check campaigns table
  try {
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, is_active, created_at')
      .limit(5);
    
    if (campaignsError) {
      console.error('❌ Error accessing campaigns table:', campaignsError.message);
    } else {
      console.log(`✅ Found ${campaigns.length} campaigns`);
      if (campaigns.length > 0) {
        console.log('   Sample campaign:', campaigns[0]);
      }
    }
  } catch (error) {
    console.error('❌ Database error when checking campaigns:', error.message);
  }
  
  // Check campaign_posts table
  try {
    const { data: posts, error: postsError } = await supabase
      .from('campaign_posts')
      .select('id, title, status, scheduled_for, campaign_id')
      .limit(5);
    
    if (postsError) {
      console.error('❌ Error accessing campaign_posts table:', postsError.message);
    } else {
      console.log(`✅ Found ${posts.length} posts`);
      if (posts.length > 0) {
        console.log('   Sample post:', posts[0]);
      }
    }
  } catch (error) {
    console.error('❌ Database error when checking posts:', error.message);
  }
  
  // Check campaign_activity table
  try {
    const { data: activities, error: activitiesError } = await supabase
      .from('campaign_activity')
      .select('id, campaign_id, action_type, created_at')
      .limit(5);
    
    if (activitiesError) {
      console.error('❌ Error accessing campaign_activity table:', activitiesError.message);
      console.log('   The campaign_activity table may not exist yet. Run migrations to create it.');
    } else {
      console.log(`✅ Found ${activities.length} activity records`);
      if (activities.length > 0) {
        console.log('   Sample activity:', activities[0]);
      }
    }
  } catch (error) {
    console.error('❌ Database error when checking activity:', error.message);
  }
}

// Create a test scheduled post
async function createTestPost() {
  console.log('\nCreating a test scheduled post...');
  
  // First check if we have campaigns
  const { data: campaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('id, name, user_id')
    .eq('is_active', true)
    .limit(1);
  
  if (campaignsError || !campaigns || campaigns.length === 0) {
    console.error('❌ No active campaigns found to create test post');
    console.log('   Please create a campaign in the UI first');
    return;
  }
  
  const campaignId = campaigns[0].id;
  
  // Get a Reddit account
  const { data: accounts, error: accountsError } = await supabase
    .from('reddit_accounts')
    .select('id, username')
    .limit(1);
  
  if (accountsError || !accounts || accounts.length === 0) {
    console.error('❌ No Reddit accounts found to create test post');
    console.log('   Please connect a Reddit account in the UI first');
    return;
  }
  
  const accountId = accounts[0].id;
  
  // Get a subreddit
  const { data: subreddits, error: subredditsError } = await supabase
    .from('subreddits')
    .select('id, name')
    .limit(1);
  
  if (subredditsError || !subreddits || subreddits.length === 0) {
    console.error('❌ No subreddits found to create test post');
    console.log('   Please add a subreddit in the UI first');
    return;
  }
  
  const subredditId = subreddits[0].id;
  
  // Create a post scheduled 1 minute from now
  const scheduledTime = new Date();
  scheduledTime.setMinutes(scheduledTime.getMinutes() + 1);
  
  // Create the test post
  try {
    const { data: post, error: postError } = await supabase
      .from('campaign_posts')
      .insert({
        campaign_id: campaignId,
        reddit_account_id: accountId,
        subreddit_id: subredditId,
        title: '[TEST] Automated test post from SubPirate',
        content_type: 'text',
        content: 'This is an automated test post created by the SubPirate campaign test script. If you see this, the system is working correctly!',
        status: 'scheduled',
        scheduled_for: scheduledTime.toISOString(),
        use_ai_title: false
      })
      .select();
    
    if (postError) {
      console.error('❌ Error creating test post:', postError.message);
    } else {
      console.log('✅ Test post created successfully!');
      console.log('   Post ID:', post[0].id);
      console.log('   Scheduled for:', scheduledTime.toISOString());
      console.log('   It should be picked up by the scheduler in about 1 minute');
    }
  } catch (error) {
    console.error('❌ Error creating test post:', error.message);
  }
}

// Trigger the scheduler manually
async function triggerScheduler() {
  console.log('\nManually triggering scheduler...');
  
  try {
    const response = await fetch(`${schedulerUrl}/api/campaigns/process`, {
      method: 'POST'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Scheduler triggered successfully:', data);
    } else {
      console.error('❌ Failed to trigger scheduler:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error triggering scheduler:', error.message);
  }
}

// Main function to run all tests
async function runTests() {
  console.log('\n=== Campaign Scheduler Test ===\n');
  
  // Check if server is running
  const isServerRunning = await checkServerHealth();
  if (!isServerRunning) {
    console.log('\nPlease start the campaign scheduler with:');
    console.log('npm run campaigns:run');
    process.exit(1);
  }
  
  // Run all tests
  await testApiEndpoints();
  await checkDatabaseTables();
  
  // Ask if user wants to create a test post
  console.log('\nWould you like to create a test scheduled post? (y/n)');
  process.stdin.once('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    if (input === 'y' || input === 'yes') {
      await createTestPost();
      
      console.log('\nWould you like to trigger the scheduler now? (y/n)');
      process.stdin.once('data', async (triggerData) => {
        const triggerInput = triggerData.toString().trim().toLowerCase();
        if (triggerInput === 'y' || triggerInput === 'yes') {
          await triggerScheduler();
        }
        console.log('\nTest complete!');
        process.exit(0);
      });
    } else {
      console.log('\nTest complete!');
      process.exit(0);
    }
  });
}

// Run the tests
runTests();