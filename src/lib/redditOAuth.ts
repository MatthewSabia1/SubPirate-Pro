/**
 * Reddit OAuth utilities
 * 
 * This file provides utility functions for Reddit OAuth authentication and account management.
 * It centralizes the OAuth functionality to prevent code duplication across components.
 */

/**
 * Initiates the Reddit OAuth flow to connect a new account
 * @param options Optional configuration options
 * @returns void - redirects the user to Reddit's authorization page
 */
export function connectRedditAccount(options?: { customRedirectUrl?: string }) {
  // Generate a random state string for security
  const state = Math.random().toString(36).substring(7);
  
  // Store state in session storage to verify on callback
  sessionStorage.setItem('reddit_oauth_state', state);
  // Clear any account ID that was being reconnected
  sessionStorage.removeItem('reconnect_account_id');

  // Get the client ID from environment variables
  const clientId = import.meta.env.VITE_REDDIT_APP_ID;
  if (!clientId) {
    console.error('Reddit client ID not configured');
    throw new Error('Reddit client ID not configured');
  }

  // Determine the redirect URI
  const redirectUri = options?.customRedirectUrl || 
    `${window.location.origin}/auth/reddit/callback`;

  // Construct the OAuth URL with expanded scopes
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: [
      'identity',
      'read',
      'submit',
      'subscribe',
      'history',
      'mysubreddits',
      'privatemessages',
      'save',
      'vote',
      'edit',
      'flair',
      'report'
    ].join(' ')
  });

  // Redirect to Reddit's OAuth page
  window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
}

/**
 * Reconnects a specific Reddit account using the OAuth flow
 * @param accountId The ID of the account to reconnect
 * @param options Optional configuration options
 * @returns void - redirects the user to Reddit's authorization page
 */
export function reconnectRedditAccount(accountId: string, options?: { customRedirectUrl?: string }) {
  // Save the account ID to reconnect in session storage
  sessionStorage.setItem('reconnect_account_id', accountId);
  
  // Use the standard connect flow
  connectRedditAccount(options);
}

/**
 * Validates an OAuth state parameter against the stored state to prevent CSRF attacks
 * @param state The state parameter received from the OAuth redirect
 * @returns boolean - true if the state is valid, false otherwise
 */
export function validateOAuthState(state: string | null): boolean {
  const storedState = sessionStorage.getItem('reddit_oauth_state');
  return state !== null && storedState !== null && state === storedState;
}

/**
 * Cleans up OAuth related session storage items
 */
export function cleanupOAuthState(): void {
  sessionStorage.removeItem('reddit_oauth_state');
  sessionStorage.removeItem('reconnect_account_id');
}

/**
 * Gets the reconnect account ID from session storage if available
 * @returns string | null - the account ID to reconnect, or null if not set
 */
export function getReconnectAccountId(): string | null {
  return sessionStorage.getItem('reconnect_account_id');
}

/**
 * Extracts and cleans a Reddit avatar URL from a user object
 * @param user Reddit user object containing icon_img and/or snoovatar_img
 * @returns string | null - the cleaned avatar URL or null if not available
 */
export function extractAvatarUrl(user: any): string | null {
  if (!user) return null;
  
  // Try to get the icon_img first, then fallback to snoovatar_img
  const avatarUrl = user.icon_img || user.snoovatar_img;
  
  // Reddit avatar URLs often have query parameters we don't need
  return avatarUrl ? avatarUrl.split('?')[0] : null;
}

/**
 * Gets an avatar URL for a Reddit username
 * This can be used as a fallback when no avatar URL is available
 * @param username Reddit username
 * @returns string - a generated avatar URL based on the username
 */
export function getGeneratedAvatarUrl(username: string): string {
  // Use DiceBear for consistent avatar generation
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username)}&backgroundColor=111111`;
}

/**
 * Gets the best available avatar URL for a Reddit account
 * @param account Account object which may have avatar_url
 * @param username Username to use if account is not provided or avatar_url is not available
 * @returns string - the best available avatar URL
 */
export function getAccountAvatarUrl(account?: { avatar_url?: string | null, username?: string }, username?: string): string {
  // If we have an account with an avatar_url, use that
  if (account?.avatar_url) return account.avatar_url;
  
  // Otherwise generate an avatar based on the username
  const usernameToUse = account?.username || username || 'unknown';
  return getGeneratedAvatarUrl(usernameToUse);
} 