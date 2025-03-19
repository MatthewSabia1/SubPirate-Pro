import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Function to extract hash parameters
  const getHashParameters = (hash: string) => {
    if (!hash) return {};
    
    // Remove the leading # if present
    const hashWithoutPrefix = hash.startsWith('#') ? hash.substring(1) : hash;
    const params = new URLSearchParams(hashWithoutPrefix);
    const result: Record<string, string> = {};
    
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    
    return result;
  };

  const handleAuthentication = async () => {
    try {
      console.log('AuthCallback: Starting authentication handling');
      console.log('Current URL:', window.location.href.replace(/access_token=([^&]+)/, 'access_token=REDACTED'));
      
      // Check if we already have a session
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (sessionData?.session) {
        console.log('AuthCallback: Session already exists, redirecting to dashboard');
        // Already authenticated, redirect to dashboard
        navigate('/dashboard');
        return;
      }
      
      // Check if we have a hash in the URL
      let hash = window.location.hash;
      console.log('AuthCallback: URL hash present:', !!hash);
      
      // If we don't have a hash in the URL, check if it was stored in sessionStorage
      if (!hash) {
        const storedHash = sessionStorage.getItem('supabase-auth-hash');
        console.log('AuthCallback: Stored hash in sessionStorage:', !!storedHash);
        
        if (storedHash) {
          hash = storedHash;
          // After using the stored hash, remove it
          sessionStorage.removeItem('supabase-auth-hash');
        }
      }
      
      if (hash) {
        console.log('AuthCallback: Processing hash parameters');
        
        // Parse the hash parameters
        const hashParams = getHashParameters(hash);
        console.log('AuthCallback: Hash params keys:', Object.keys(hashParams));
        
        // Check if we have an access token
        if (hashParams.access_token) {
          console.log('AuthCallback: Access token found, setting up session manually');
          
          try {
            // Manually set up the session
            const { data, error } = await supabase.auth.setSession({
              access_token: hashParams.access_token,
              refresh_token: hashParams.refresh_token || '',
            });
            
            if (error) {
              console.error('Error setting session:', error);
              setError('Failed to set up authentication session');
              setLoading(false);
              return;
            }
            
            if (data?.session) {
              console.log('AuthCallback: Session set up successfully, redirecting to dashboard');
              navigate('/dashboard');
              return;
            }
          } catch (sessionError) {
            console.error('Error in manual session setup:', sessionError);
          }
        } else if (hashParams.error_description) {
          console.error('Auth error:', hashParams.error_description);
          setError(hashParams.error_description);
          setLoading(false);
          return;
        }
      }
      
      // If we don't have a session yet, try to get it again after a delay
      if (retries < 5) {
        console.log(`AuthCallback: No session yet, retrying (${retries + 1}/5)...`);
        setTimeout(() => {
          setRetries(prev => prev + 1);
          handleAuthentication();
        }, 1000);
        return;
      }
      
      // If we've tried multiple times and still don't have a session
      console.error('Could not establish authentication after multiple attempts');
      setError('Authentication failed. Please try again.');
      setLoading(false);
    } catch (err) {
      console.error('AuthCallback error:', err);
      setError('An unexpected error occurred during authentication.');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up automatic redirect if authentication takes too long
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('AuthCallback: Authentication timeout reached');
        setLoading(false);
        setError('Authentication is taking longer than expected. Please try again.');
      }
    }, 15000); // 15 seconds timeout
    
    // Handle authentication
    handleAuthentication();
    
    // Clean up timeout
    return () => clearTimeout(timeoutId);
  }, [retries]);
  
  // If we already have a user, redirect to dashboard
  useEffect(() => {
    if (user) {
      console.log('AuthCallback: User already authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-lg p-6 text-center">
        {loading ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Completing Authentication</h1>
            <p className="mb-4">Please wait while we complete the authentication process...</p>
            <LoadingSpinner size={12} />
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Error</h1>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Login
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4">Authentication Complete</h1>
            <p className="mb-4">You are now authenticated! Redirecting to the dashboard...</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
} 