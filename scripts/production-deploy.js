#!/usr/bin/env node
/**
 * Production deployment script for the Campaign scheduler
 * This script will:
 * 1. Check for required environment variables
 * 2. Create necessary directories
 * 3. Set up logging
 * 4. Start the scheduler process with PM2
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn('No .env file found, using environment variables from system');
  dotenv.config();
}

// Required environment variables
const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_SERVICE_KEY',
  'VITE_REDDIT_APP_ID',
  'VITE_REDDIT_APP_SECRET'
];

// Optional environment variables with defaults
const envDefaults = {
  'NODE_ENV': 'production',
  'WEBHOOK_SERVER_PORT': '4242'
};

console.log('\n=== SubPirate Campaign Scheduler Deployment ===\n');

// Check for required environment variables
const missingVars = requiredVars.filter(varName => !process.env[varName]);

// Special check for the service role key which might be hardcoded in webhook-server.js
if (missingVars.includes('VITE_SUPABASE_SERVICE_KEY')) {
  // Check if it's hardcoded in webhook-server.js
  try {
    const webhookServerContent = fs.readFileSync(path.join(rootDir, 'webhook-server.js'), 'utf8');
    if (webhookServerContent.includes('serviceRoleKey =') && 
        webhookServerContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
      console.log('✅ Found hardcoded service role key in webhook-server.js');
      // Remove this from missing vars
      const index = missingVars.indexOf('VITE_SUPABASE_SERVICE_KEY');
      if (index > -1) {
        missingVars.splice(index, 1);
      }
    }
  } catch (error) {
    console.warn('Warning: Could not check webhook-server.js for hardcoded service role key');
  }
}

if (missingVars.length > 0) {
  console.error('Error: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

// Create logs directory
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('Creating logs directory...');
  fs.mkdirSync(logsDir, { recursive: true });
}

// Set default environment variables if not provided
Object.entries(envDefaults).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
    console.log(`Using default for ${key}: ${value}`);
  }
});

// Check if PM2 is installed
let pmInstalled = false;
try {
  execSync('pm2 --version', { stdio: 'ignore' });
  pmInstalled = true;
} catch (error) {
  console.log('PM2 not found. Installing...');
  try {
    execSync('npm install -g pm2', { stdio: 'inherit' });
    pmInstalled = true;
  } catch (installError) {
    console.error('Failed to install PM2:', installError.message);
    console.log('Please install PM2 manually: npm install -g pm2');
  }
}

// Deploy with PM2
if (pmInstalled) {
  console.log('\nDeploying campaign scheduler with PM2...');
  
  try {
    // Check if the process is already running
    const list = execSync('pm2 list').toString();
    const isRunning = list.includes('campaign-scheduler');
    
    if (isRunning) {
      console.log('Stopping existing process...');
      execSync('pm2 stop campaign-scheduler', { stdio: 'inherit' });
      execSync('pm2 delete campaign-scheduler', { stdio: 'inherit' });
    }
    
    // Start with PM2
    console.log('Starting campaign scheduler...');
    execSync(
      'pm2 start webhook-server.js --name="campaign-scheduler" --env production --time', 
      { stdio: 'inherit' }
    );
    
    // Save PM2 configuration
    execSync('pm2 save', { stdio: 'inherit' });
    
    console.log('\n✅ Campaign scheduler deployed successfully!');
    console.log('\nTo monitor the process:');
    console.log('  pm2 logs campaign-scheduler');
    console.log('  pm2 monit');
  } catch (error) {
    console.error('Deployment error:', error.message);
    process.exit(1);
  }
} else {
  console.log('\nStarting campaign scheduler without PM2...');
  console.log('Note: For production, it is recommended to use PM2 or another process manager.');
  console.log('To start manually: NODE_ENV=production node webhook-server.js');
}

// Final instructions
console.log('\n=== Next Steps ===');
console.log('1. Verify the scheduler is running:');
console.log('   curl http://localhost:4242/health');
console.log('2. Check the API is working:');
console.log('   curl http://localhost:4242/api/test');
console.log('3. Test scheduled posts:');
console.log('   curl http://localhost:4242/api/campaigns/scheduled');
console.log('\nFor more information, see:');
console.log('  /docs/features/campaigns/deployment-guide.md');