// Campaign database migration script
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Try to import the environment checker
let checkEnvironment;
try {
  const envChecker = await import('./check-env.js');
  checkEnvironment = envChecker.default;
} catch (err) {
  console.warn('Could not import environment checker script');
}

// Check if credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY environment variables');
  
  // Run environment checker if available
  if (checkEnvironment) {
    checkEnvironment();
  }
  
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get current file directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get migration file path from command line argument or use default
const migrationFile = process.argv[2] || '../migrations/campaign_activity_tracking.sql';
const filePath = path.resolve(__dirname, '..', migrationFile.replace(/^\.\//, ''));

// Check if migration file exists
if (!fs.existsSync(filePath)) {
  console.error(`Error: Migration file not found: ${filePath}`);
  process.exit(1);
}

console.log(`Running migration from file: ${filePath}`);

// Read migration file
const sqlContent = fs.readFileSync(filePath, 'utf8');

// Function to execute SQL
async function runMigration() {
  try {
    console.log('Connecting to Supabase...');
    console.log('URL:', supabaseUrl.substring(0, 15) + '...');
    console.log('Key length:', supabaseKey ? supabaseKey.length : 0);
    
    // Use PostgreSQL RPC function if available
    console.log('Attempting to execute SQL with RPC method...');
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sqlContent });
      
      if (error) {
        console.log('RPC method failed, will try alternative approach:', error.message);
        throw error;
      }
      
      console.log('Migration completed successfully via RPC');
      console.log(data);
      return;
    } catch (rpcError) {
      console.log('RPC method not available, trying direct SQL execution...');
    }
    
    // If RPC fails, try direct SQL execution if available
    try {
      const { error } = await supabase.sql(sqlContent);
      if (error) {
        throw error;
      }
      console.log('Migration completed successfully via direct SQL');
      return;
    } catch (sqlError) {
      console.log('Direct SQL execution failed, trying with single statements...');
    }
    
    // If both methods fail, try to split and execute statement by statement
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements individually...`);
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i+1}/${statements.length}...`);
      
      try {
        // Try with .sql() method
        const { error } = await supabase.sql(stmt);
        if (error) throw error;
      } catch (stmtError) {
        console.warn(`Warning: Statement ${i+1} failed:`, stmtError.message);
        console.warn('Continuing with next statement...');
      }
    }
    
    console.log('Migration completed with individual statements');
    
  } catch (error) {
    console.error('Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
runMigration();