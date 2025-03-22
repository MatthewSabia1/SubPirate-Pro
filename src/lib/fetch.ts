import { supabase } from './supabase';

/**
 * Enhanced fetch utility that automatically includes auth and CSRF tokens
 * for state-changing operations (POST, PUT, DELETE)
 */
export async function secureFetch(
  url: string, 
  options: RequestInit & { csrfToken?: string } = {}
): Promise<Response> {
  // Get the current session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Clone the options to avoid mutating the original
  const fetchOptions: RequestInit = { ...options };
  
  // Initialize headers if not present
  fetchOptions.headers = fetchOptions.headers || {};
  
  // Include credentials for cookies
  fetchOptions.credentials = 'include';
  
  // Add authorization header if we have a session
  if (session?.access_token) {
    (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
  }
  
  // Add CSRF token for state-changing operations
  const method = fetchOptions.method || 'GET';
  if (['POST', 'PUT', 'DELETE'].includes(method.toUpperCase()) && options.csrfToken) {
    (fetchOptions.headers as Record<string, string>)['X-CSRF-Token'] = options.csrfToken;
  }
  
  // Make the request
  return fetch(url, fetchOptions);
}

/**
 * Fetch a new CSRF token from the server
 */
export async function fetchCSRFToken(): Promise<string | null> {
  try {
    // Get the current session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    return null;
  }
} 