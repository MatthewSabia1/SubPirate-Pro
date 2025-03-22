import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

// Get current file directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Required environment variables
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

// Optional environment variables
const optionalVars = [
  'VITE_SUPABASE_SERVICE_KEY',
  'VITE_REDDIT_APP_ID',
  'VITE_REDDIT_APP_SECRET',
  'SENTRY_DSN',
  'WEBHOOK_SERVER_PORT'
];

// Check required variables
const missingVars = requiredVars.filter(varName => !process.env[varName]);

// Check optional variables
const missingOptionalVars = optionalVars.filter(varName => !process.env[varName]);

// Function to print status
function printStatus() {
  console.log('\n=== Environment Variables Status ===\n');
  
  // Required variables
  console.log('Required variables:');
  requiredVars.forEach(varName => {
    const isSet = process.env[varName] !== undefined;
    console.log(`  ${isSet ? '✅' : '❌'} ${varName}`);
  });
  
  // Optional variables
  console.log('\nOptional variables:');
  optionalVars.forEach(varName => {
    const isSet = process.env[varName] !== undefined;
    console.log(`  ${isSet ? '✅' : '⚠️'} ${varName}`);
  });
  
  console.log('\n');
}

// Check if .env file exists
const envPath = path.join(rootDir, '.env');
const hasEnvFile = fs.existsSync(envPath);

// Main function
function checkEnvironment() {
  printStatus();
  
  if (missingVars.length > 0) {
    console.error('Error: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`  - ${varName}`));
    
    if (!hasEnvFile) {
      console.error('\nNo .env file found in project root!');
      console.error('Create a .env file with the required variables.');
    } else {
      console.error('\nPlease check your .env file and add the missing variables.');
    }
    
    // Print template for missing variables
    console.log('\nAdd the following to your .env file:');
    console.log('```');
    missingVars.forEach(varName => console.log(`${varName}=your_${varName.toLowerCase()}_here`));
    console.log('```');
    
    return false;
  }
  
  // Warn about missing optional variables
  if (missingOptionalVars.length > 0) {
    console.warn('Warning: Some optional environment variables are not set:');
    missingOptionalVars.forEach(varName => console.warn(`  - ${varName}`));
    
    if (missingOptionalVars.includes('VITE_SUPABASE_SERVICE_KEY')) {
      console.warn('\nVITE_SUPABASE_SERVICE_KEY is required for database migrations.');
      console.warn('Without it, you cannot run migrations from the command line.');
    }
    
    if (missingOptionalVars.includes('VITE_REDDIT_APP_ID') || 
        missingOptionalVars.includes('VITE_REDDIT_APP_SECRET')) {
      console.warn('\nReddit API credentials are required for posting to Reddit.');
      console.warn('Without them, posting functionality will not work.');
    }
  }
  
  console.log('Environment check completed successfully!');
  return true;
}

// Export the function (for import in other scripts)
export default checkEnvironment;

// If run directly, execute the check
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = checkEnvironment();
  process.exit(success ? 0 : 1);
}