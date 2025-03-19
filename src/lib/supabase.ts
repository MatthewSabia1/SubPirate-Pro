import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Detect if we're in production
const isProduction = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1');

console.log(`Running in ${isProduction ? 'production' : 'development'} environment`);

// Create Supabase client with specific auth configuration for Google OAuth
export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
    debug: !isProduction, // Only enable debug in development
  },
  global: {
    headers: {
      'x-application-name': 'subpirate',
    },
  },
  realtime: {
    timeout: 30000, // Increase timeout for realtime connections
  }
});

// Debug helper to log current auth state
export function debugAuthState() {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Error getting session:', error);
    } else {
      console.log('Session exists:', !!data.session);
      console.log('User logged in:', !!data.session?.user);
    }
  });
}

// Helper function to extract parameters from a hash string
export function getHashParameters(hash: string) {
  if (!hash) return {};
  
  // Remove the leading # if present
  const hashWithoutPrefix = hash.startsWith('#') ? hash.substring(1) : hash;
  const params = new URLSearchParams(hashWithoutPrefix);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  
  return result;
}

// Export Supabase client as default
export default supabase;