import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { validateOAuthState, cleanupOAuthState, getReconnectAccountId } from '../lib/redditOAuth';

export default function RedditOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'auth' | 'network' | 'server' | 'user' | 'unknown'>('unknown');
  const [exchangeAttempted, setExchangeAttempted] = useState(false);
  const callbackRef = useRef<boolean>(false);

  useEffect(() => {
    // Prevent duplicate callback processing
    if (callbackRef.current) {
      return;
    }
    
    const handleCallback = async () => {
      if (exchangeAttempted) {
        return;
      }
      
      callbackRef.current = true;
      setExchangeAttempted(true);

      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const errorParam = searchParams.get('error');
        
        // Check if this is a reconnection attempt for a specific account
        const reconnectAccountId = getReconnectAccountId();
        
        // Handle Reddit-provided errors
        if (errorParam) {
          setErrorType('auth');
          if (errorParam === 'access_denied') {
            throw new Error('You denied permission to access your Reddit account. Please try again and approve the permissions.');
          } else {
            throw new Error(`Reddit OAuth error: ${errorParam}. Please try again.`);
          }
        }

        if (!code) {
          setErrorType('user');
          throw new Error('No authorization code received from Reddit. Please try connecting again.');
        }

        if (!user) {
          setErrorType('auth');
          throw new Error('You must be signed in to connect a Reddit account. Please sign in and try again.');
        }

        // Verify state to prevent CSRF attacks
        if (!validateOAuthState(state)) {
          setErrorType('auth');
          throw new Error('Invalid security token. This could be due to an expired session or a security issue. Please try again.');
        }

        // Use the exact redirect URI format that Reddit redirects to
        const redirectUri = `${window.location.origin}/auth/reddit/callback`;
        
        // Clean the code (remove any URL fragments)
        const cleanCode = code.split('#')[0];

        // Exchange the code for tokens with retries
        let tokens = {
          access_token: '',
          refresh_token: '',
          expires_in: 0,
          scope: ''
        };

        let retryCount = 0;
        const maxRetries = 3;
        const baseDelay = 1000;

        while (retryCount < maxRetries) {
          try {
            console.log('Attempting token exchange with:', {
              clientId: import.meta.env.VITE_REDDIT_APP_ID,
              redirectUri,
              code: cleanCode.slice(0, 5) + '...',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'web:SubPirate:1.0.0'
              }
            });

            // Validate credentials
            if (!import.meta.env.VITE_REDDIT_APP_ID || !import.meta.env.VITE_REDDIT_APP_SECRET) {
              setErrorType('server');
              throw new Error('Reddit client credentials are not configured properly. Please contact support.');
            }

            const authString = btoa(`${import.meta.env.VITE_REDDIT_APP_ID}:${import.meta.env.VITE_REDDIT_APP_SECRET}`);
            
            const params = new URLSearchParams();
            params.append('grant_type', 'authorization_code');
            params.append('code', cleanCode);
            params.append('redirect_uri', redirectUri);

            // Log exact request details (excluding sensitive info)
            console.log('Token exchange request:', {
              url: 'https://www.reddit.com/api/v1/access_token',
              method: 'POST',
              redirect_uri: redirectUri,
              grant_type: 'authorization_code'
            });

            const response = await fetch('https://www.reddit.com/api/v1/access_token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${authString}`,
                'User-Agent': 'web:SubPirate:1.0.0',
                'Accept': 'application/json'
              },
              body: params.toString(),
              mode: 'cors',
              credentials: 'omit'
            });

            const responseText = await response.text();
            
            // Log response details
            console.log('Token exchange response:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: responseText,
              requestUrl: response.url
            });

            if (!response.ok) {
              // Try to parse error response
              let errorMessage = responseText;
              try {
                const errorJson = JSON.parse(responseText);
                // Check if this is a "used authorization code" error
                if (errorJson.error === 'invalid_grant') {
                  console.warn('Authorization code already used');
                  setErrorType('auth');
                  throw new Error('This authorization code has already been used. Please try connecting again.');
                }
                
                if (errorJson.error === 'unsupported_grant_type') {
                  setErrorType('server');
                  throw new Error('Invalid authorization request. Please try connecting again or contact support if the issue persists.');
                }
                
                errorMessage = errorJson.message || errorJson.error || responseText;
              } catch (e) {
                // Keep original error message if parsing fails
              }

              // Don't retry on auth errors
              if (response.status === 401 || response.status === 403) {
                setErrorType('auth');
                throw new Error(`Authentication failed. ${errorMessage}`);
              }
              
              if (response.status === 400) {
                setErrorType('user');
                throw new Error(`Invalid request: ${errorMessage}. Please try connecting again.`);
              }

              // Only retry on network errors or 5xx errors
              if (!response.status || response.status >= 500) {
                setErrorType('network');
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`Retrying after ${delay}ms due to error:`, errorMessage);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                continue;
              }

              throw new Error(`Failed to exchange code for tokens: ${errorMessage}`);
            }

            try {
              const parsed = JSON.parse(responseText);
              if (!parsed.access_token || !parsed.refresh_token) {
                setErrorType('server');
                console.error('Invalid token response:', parsed);
                throw new Error('Invalid token response from Reddit: missing required tokens. Please try again later.');
              }
              tokens = parsed as typeof tokens;
              break; // Success - exit retry loop
            } catch (e) {
              setErrorType('server');
              console.error('Failed to parse token response:', e);
              throw new Error('Invalid JSON response from Reddit. Please try again later.');
            }
          } catch (error) {
            if (retryCount === maxRetries - 1) throw error;
            retryCount++;
          }
        }

        // Get user info from Reddit with retries
        let redditUser;
        retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
              headers: {
                'Authorization': `Bearer ${tokens.access_token}`,
                'User-Agent': 'web:SubPirate:1.0.0'
              }
            });

            if (!userResponse.ok) {
              if (userResponse.status === 429) {
                setErrorType('network');
                const delay = baseDelay * Math.pow(2, retryCount);
                await new Promise(resolve => setTimeout(resolve, delay));
                retryCount++;
                continue;
              }
              
              if (userResponse.status === 401 || userResponse.status === 403) {
                setErrorType('auth');
                throw new Error('Failed to get Reddit user info: Authentication failed. Please try connecting again.');
              }
              
              setErrorType('network');
              throw new Error('Failed to get Reddit user info. Please try again later.');
            }

            redditUser = await userResponse.json();
            
            // Log the full user data for debugging
            console.log('Reddit user data:', {
              ...redditUser,
              access_token: '[REDACTED]',
              refresh_token: '[REDACTED]'
            });

            break;
          } catch (error) {
            if (retryCount === maxRetries - 1) throw error;
            retryCount++;
          }
        }

        // If reconnecting, check if the username matches the account being reconnected
        if (reconnectAccountId) {
          // Get the account data to verify username match
          const { data: existingAccount, error: fetchError } = await supabase
            .from('reddit_accounts')
            .select('username, user_id')
            .eq('id', reconnectAccountId)
            .single();
            
          if (fetchError || !existingAccount) {
            setErrorType('server');
            throw new Error('Could not find the account to reconnect. Please try again or contact support.');
          }
          
          // Make sure account belongs to current user
          if (existingAccount.user_id !== user.id) {
            setErrorType('auth');
            throw new Error('This account cannot be reconnected because it belongs to another user. Please use your own Reddit account.');
          }
          
          // Verify the username matches
          if (existingAccount.username !== redditUser.name) {
            setErrorType('user');
            throw new Error(`Username mismatch. You're trying to reconnect '${existingAccount.username}' but authenticated as '${redditUser.name}'. Please use the correct Reddit account.`);
          }
          
          console.log(`Reconnecting existing account: ${existingAccount.username} (ID: ${reconnectAccountId})`);
          
          // Update the existing account
          const { error: updateError } = await supabase
            .from('reddit_accounts')
            .update({
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              is_active: true,
              last_used_at: new Date().toISOString(),
              refresh_error: null,
              refresh_attempts: 0,
              last_token_refresh: new Date().toISOString(),
              scope: tokens.scope.split(' '),
              // Update profile data in case it changed
              avatar_url: redditUser.icon_img?.split('?')[0] || redditUser.snoovatar_img || null,
              is_gold: redditUser.is_gold || false,
              is_mod: redditUser.is_mod || false,
              verified: redditUser.verified || false,
              has_verified_email: redditUser.has_verified_email || false,
              // Update karma information
              karma_score: (redditUser.link_karma || 0) + (redditUser.comment_karma || 0),
              link_karma: redditUser.link_karma || 0,
              comment_karma: redditUser.comment_karma || 0,
              awardee_karma: redditUser.awardee_karma || 0,
              awarder_karma: redditUser.awarder_karma || 0,
              total_karma: redditUser.total_karma || 0,
              // Update timestamps
              updated_at: new Date().toISOString()
            })
            .eq('id', reconnectAccountId);
            
          if (updateError) {
            setErrorType('server');
            throw updateError;
          }
        } else {
          // Creating a new account or updating an existing one by username
          const { error: dbError } = await supabase
            .from('reddit_accounts')
            .upsert({
              user_id: user.id,
              username: redditUser.name,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expiry: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
              client_id: import.meta.env.VITE_REDDIT_APP_ID,
              client_secret: import.meta.env.VITE_REDDIT_APP_SECRET,
              scope: tokens.scope.split(' '),
              is_active: true,
              last_used_at: new Date().toISOString(),
              // Karma breakdown
              karma_score: (redditUser.link_karma || 0) + (redditUser.comment_karma || 0),
              link_karma: redditUser.link_karma || 0,
              comment_karma: redditUser.comment_karma || 0,
              awardee_karma: redditUser.awardee_karma || 0,
              awarder_karma: redditUser.awarder_karma || 0,
              total_karma: redditUser.total_karma || 0,
              // Profile data
              avatar_url: redditUser.icon_img?.split('?')[0] || redditUser.snoovatar_img || null,
              is_gold: redditUser.is_gold || false,
              is_mod: redditUser.is_mod || false,
              verified: redditUser.verified || false,
              // Account stats
              created_utc: new Date(redditUser.created_utc * 1000).toISOString(),
              has_verified_email: redditUser.has_verified_email || false,
              // Activity tracking
              last_post_check: new Date().toISOString(),
              last_karma_check: new Date().toISOString(),
              posts_today: 0,
              total_posts: 0,
              // Update timestamps
              updated_at: new Date().toISOString(),
              // Token refresh tracking
              refresh_error: null,
              refresh_attempts: 0,
              last_token_refresh: new Date().toISOString(),
              // Rate limiting
              rate_limit_remaining: 60,
              rate_limit_reset: new Date(Date.now() + 60 * 1000).toISOString() // 1 minute from now
            }, {
              onConflict: 'user_id,username'
            });

          if (dbError) {
            setErrorType('server');
            throw dbError;
          }
        }

        // Clean up state from session storage
        cleanupOAuthState();

        // Redirect to accounts page
        navigate('/accounts', { replace: true });
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect Reddit account');
        callbackRef.current = false; // Allow retrying
      }
    };

    handleCallback();
  }, [searchParams, user, navigate, exchangeAttempted]);

  // Helper function to get appropriate error guidance
  const getErrorGuidance = () => {
    switch (errorType) {
      case 'auth':
        return (
          <div>
            <p className="font-medium mb-2">Authentication problems detected:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Make sure you're signing in with the correct Reddit account</li>
              <li>Try clearing your browser cookies and cache</li>
              <li>Check that you've allowed all the requested permissions</li>
              <li>If reconnecting an account, use the same Reddit username</li>
            </ul>
          </div>
        );
      case 'network':
        return (
          <div>
            <p className="font-medium mb-2">Network issues detected:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Check your internet connection</li>
              <li>Reddit servers may be experiencing high load</li>
              <li>Try connecting using a different network or device</li>
              <li>Disable any VPN or proxy servers that might interfere</li>
            </ul>
          </div>
        );
      case 'server':
        return (
          <div>
            <p className="font-medium mb-2">Server issues detected:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>This is likely a temporary issue with our systems</li>
              <li>Wait a few minutes and try again</li>
              <li>If the problem persists, contact support with the error message shown above</li>
              <li>Check our status page for any ongoing service disruptions</li>
            </ul>
          </div>
        );
      case 'user':
        return (
          <div>
            <p className="font-medium mb-2">Issue with your request:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Follow the specific instructions in the error message above</li>
              <li>Make sure you're using the correct Reddit account</li>
              <li>Don't use the browser back button during the connection process</li>
              <li>Ensure you haven't exceeded Reddit's daily API limits</li>
            </ul>
          </div>
        );
      default:
        return (
          <div>
            <p className="font-medium mb-2">Troubleshooting steps:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-300">
              <li>Try connecting again using the button below</li>
              <li>Check your internet connection</li>
              <li>Clear your browser cache and cookies</li>
              <li>If problems persist, contact support with the error details</li>
            </ul>
          </div>
        );
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111111] p-4">
        <div className="bg-[#1A1A1A] border border-red-700/30 p-8 rounded-lg shadow-lg max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-red-800/30 p-3 rounded-full">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Connection Failed</h2>
          </div>
          
          <div className="bg-red-900/20 border border-red-700/20 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm font-medium">{error}</p>
          </div>
          
          <div className="text-gray-400 mb-6 text-sm">{getErrorGuidance()}</div>
          
          <div className="flex flex-col gap-3 mt-8">
            <button
              onClick={() => navigate('/accounts')}
              className="flex items-center justify-center gap-2 w-full bg-[#333333] hover:bg-[#444444] text-white font-medium py-3 px-4 rounded transition-colors"
            >
              <ArrowLeft size={16} />
              Return to Accounts
            </button>
            
            <button
              onClick={() => {
                // Clear session storage to prevent using the same state/code
                cleanupOAuthState();
                
                // Restart the connection process based on error type
                if (errorType === 'auth' || errorType === 'user') {
                  navigate('/accounts');
                } else {
                  window.location.reload();
                }
              }}
              className="w-full bg-red-800 hover:bg-red-700 text-white font-medium py-3 px-4 rounded transition-colors"
            >
              Try Again
            </button>
          </div>
          
          <p className="text-gray-600 text-xs mt-6 text-center">
            Error Type: {errorType} • ID: {Math.random().toString(36).substring(2, 10)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111111] text-white">
      <div className="bg-[#1A1A1A] p-8 rounded-lg shadow-lg max-w-md w-full text-center border border-[#333333]">
        <div className="animate-pulse mb-6">
          <div className="w-16 h-16 bg-[#FF4500] rounded-full mx-auto flex items-center justify-center">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701z"/>
            </svg>
          </div>
        </div>
        
        <h2 className="text-xl font-semibold mb-4">Connecting to Reddit</h2>
        <p className="text-gray-400 mb-2">Authenticating your Reddit account...</p>
        <div className="w-full bg-[#222222] h-2 rounded-full overflow-hidden">
          <div className="bg-[#FF4500] h-2 rounded-full animate-progress"></div>
        </div>
        <p className="text-gray-500 text-xs mt-2">Please wait, this will only take a moment.</p>
      </div>
    </div>
  );
}