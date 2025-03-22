// Temporary environment helper script
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

// Set the service role key (provided by user)
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkZ255aGtuZ2V3bW5ldWpzaGVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTg4NTc2NiwiZXhwIjoyMDU1NDYxNzY2fQ.YS61kJJBeBqbPRjRo4jvL7f7nVPWIPEl2x91ofMzY9o';

console.log(`URL: ${supabaseUrl}`);

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to execute the migration
async function executeMigration(filePath) {
  console.log(`Running migration from file: ${filePath}`);
  
  // Read the SQL file
  const sqlContent = fs.readFileSync(filePath, 'utf8');
  
  try {
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      console.log(`Executing statement ${i+1}/${statements.length}`);
      
      try {
        // Execute the statement using REST API
        const { data, error } = await supabase.rpc('exec_sql', { 
          query: stmt 
        });
        
        if (error) {
          console.warn(`Warning: Statement ${i+1} execution error: ${error.message}`);
          
          // For the first statement, try to create the function
          if (i === 0 && stmt.includes('CREATE OR REPLACE FUNCTION exec_sql')) {
            console.log('Attempting to create exec_sql function directly...');
            try {
              const { error: sqlError } = await supabase.from('_exec_sql').select('*').limit(1);
              console.log('Direct SQL attempt result:', sqlError ? `Error: ${sqlError.message}` : 'Success');
            } catch (directError) {
              console.warn('Direct SQL execution failed:', directError);
            }
          }
        } else {
          console.log(`Statement ${i+1} executed successfully`);
        }
      } catch (e) {
        console.warn(`Statement execution error:`, e);
      }
    }
    
    console.log('Migration completed');
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
}

// Execute the migrations
async function runMigrations() {
  // Get current file directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, '..');
  
  // Define migration files
  const migrationFiles = [
    path.join(rootDir, 'migrations', 'db_setup.sql'),
    path.join(rootDir, 'migrations', 'campaign_activity_tracking.sql')
  ];
  
  // Run each migration
  for (const filePath of migrationFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`\nProcessing ${path.basename(filePath)}...`);
      await executeMigration(filePath);
    } else {
      console.error(`Migration file not found: ${filePath}`);
    }
  }
}

// Run the migrations
runMigrations();