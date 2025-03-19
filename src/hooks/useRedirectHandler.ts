import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Hook to handle hash fragment redirect issues
 * This handles cases where the user lands on the root URL with a hash fragment
 * after Google OAuth authentication
 */
export function useRedirectHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // Only run this on the root path
    if (window.location.pathname !== '/') return;

    // Check for hash fragments that might be auth related
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('id_token'))) {
      console.log('Detected authentication hash on root URL, redirecting to proper handler');
      
      // First check if we already have a valid session
      const checkSession = async () => {
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            console.log('Valid session detected, redirecting to dashboard');
            navigate('/dashboard', { replace: true });
            return;
          }
          
          // No valid session, but we have auth parameters in the URL
          // Redirect to auth callback to handle them properly
          console.log('Redirecting to auth callback to handle tokens');
          navigate('/auth/callback' + hash, { replace: true });
        } catch (err) {
          console.error('Error handling redirect:', err);
          // In case of error, redirect to callback which has error handling
          navigate('/auth/callback', { replace: true });
        }
      };
      
      checkSession();
    }
  }, [navigate]);
} 