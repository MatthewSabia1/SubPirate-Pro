// Simple Supabase database test script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase credentials (hardcoded for this test)
const supabaseUrl = 'https://pdgnyhkngewmneujsheq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk4ODU3NjYsImV4cCI6MjA1NTQ2MTc2Nn0.NWI2kmhZIlMQEWE-LVwdpXYvBYb_yfUJn9UrfnOKsB4';

// Create Supabase client
console.log('Creating Supabase client...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to check if a table exists
async function checkTable(tableName) {
  console.log(`Checking if ${tableName} table exists...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Error accessing ${tableName}: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Table ${tableName} exists and is accessible`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Error checking ${tableName}: ${error.message}`);
    return false;
  }
}

// Main function to run tests
async function runDatabaseTests() {
  console.log('\n=== Supabase Database Connection Test ===\n');
  
  // Check connection
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
    } else {
      console.log('✅ Supabase connection successful');
    }
  } catch (error) {
    console.log('❌ Failed to connect to Supabase:', error.message);
  }
  
  // Check essential tables
  const campaignsExist = await checkTable('campaigns');
  const postsExist = await checkTable('campaign_posts');
  const activityExists = await checkTable('campaign_activity');
  
  // Results summary
  console.log('\n=== Test Results ===');
  console.log(`Campaigns table: ${campaignsExist ? '✅ Exists' : '❌ Missing'}`);
  console.log(`Campaign posts table: ${postsExist ? '✅ Exists' : '❌ Missing'}`);
  console.log(`Campaign activity table: ${activityExists ? '✅ Exists' : '❌ Missing'}`);
  
  // Provide next steps
  console.log('\n=== Next Steps ===');
  
  if (!campaignsExist || !postsExist) {
    console.log('Run base migrations to create essential tables:');
    console.log('  npm run campaigns:db-setup');
  }
  
  if (campaignsExist && postsExist && !activityExists) {
    console.log('Run the activity tracking migration to add analytics support:');
    console.log('  npm run campaigns:migrate');
  }
  
  if (campaignsExist && postsExist && activityExists) {
    console.log('All required tables exist! You can now:');
    console.log('1. Start the scheduler: npm run campaigns:run');
    console.log('2. Create campaigns and schedule posts through the UI');
  }
}

// Run the tests
runDatabaseTests();