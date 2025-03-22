#!/usr/bin/env node
/**
 * Simple deployment script that just starts the server directly
 * without all the extra checks and PM2 setup
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Create logs directory
const logsDir = path.join(rootDir, 'logs');
if (!fs.existsSync(logsDir)) {
  console.log('Creating logs directory...');
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log('\n=== SubPirate Campaign Scheduler Quick Deployment ===');
console.log('\nStarting webhook server directly...');

try {
  // Set NODE_ENV to production
  process.env.NODE_ENV = 'production';
  
  // Run the server
  console.log('Executing webhook-server.js...');
  execSync('node webhook-server.js', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
} catch (error) {
  console.error('Error running server:', error.message);
  console.log('\nFor production deployment, please:');
  console.log('1. Set up your .env file with all required variables');
  console.log('2. Run the SQL in migrations/production_campaign_setup.sql in the Supabase dashboard');
  console.log('3. Use npm run campaigns:deploy for a proper deployment with PM2');
}