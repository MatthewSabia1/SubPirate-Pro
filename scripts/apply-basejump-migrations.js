import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const MIGRATION_FILES = [
  'basejump_integration.sql',
  'basejump_feature_setup.sql',
  'basejump_feature_access.sql'
];

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY are set.');
  process.exit(1);
}

// Create Supabase client with service key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  console.log('🚀 Starting Basejump migration process...');
  
  for (const fileName of MIGRATION_FILES) {
    try {
      const filePath = path.join(MIGRATIONS_DIR, fileName);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`❌ Migration file not found: ${fileName}`);
        continue;
      }
      
      // Read SQL file
      const sqlContent = fs.readFileSync(filePath, 'utf8');
      
      console.log(`⏳ Applying migration: ${fileName}`);
      
      // Execute the SQL using Supabase REST API
      const { error } = await supabase.rpc('exec_sql', { sql_query: sqlContent });
      
      if (error) {
        console.error(`❌ Error applying migration ${fileName}:`, error);
      } else {
        console.log(`✅ Successfully applied migration: ${fileName}`);
      }
    } catch (error) {
      console.error(`❌ Error processing migration ${fileName}:`, error);
    }
  }
  
  console.log('🏁 Migration process completed!');
}

// Execute the migrations
applyMigrations().catch(err => {
  console.error('Migration script failed:', err);
  process.exit(1);
});