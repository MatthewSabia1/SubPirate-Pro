import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import DOMPurify from 'dompurify';

// Core interfaces
export interface RedditAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SubredditInfo {
  name: string;
  title: string;
  subscribers: number;
  active_users: number;
  description: string;
  created_utc: number;
  over18: boolean;
  icon_img: string | null;
  community_icon: string | null;
  rules: Array<{
    title: string;
    description: string;
  }>;
}

export interface SubredditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  created_utc: number;
  score: number;
  num_comments: number;
  url: string;
  selftext: string;
  thumbnail: string | null;
  preview_url: string | null;
  post_karma?: number;
}

export interface SubredditFrequency {
  name: string;
  count: number;
  subscribers: number;
  active_users: number;
  icon_img: string | null;
  community_icon: string | null;
  lastPosts: SubredditPost[];
}

export interface RedditUserInfo {
  avatar_url: string | null;
  name: string;
  created_utc: number;
  total_karma: number;
}

// Types for posting functionality
export type ContentType = 'text' | 'link' | 'image';

export interface RedditPostParams {
  subreddit: string;
  title: string; 
  kind: 'link' | 'self' | 'image';
  text?: string;
  url?: string;
  mediaUrl?: string;
}

export interface RedditPostResponse {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

export interface RedditMediaItem {
  url: string;
  type: string;
  filename?: string;
}

export class RedditAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public endpoint?: string
  ) {
    super(message);
    this.name = 'RedditAPIError';
  }
}

export class RedditService {
  // Configuration properties
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private accountId: string | null = null;
  private readonly USER_AGENT = 'SubPirate/1.0.0'; // Consistent app-specific user agent
  private readonly CLIENT_ID = import.meta.env.VITE_REDDIT_APP_ID;
  private readonly CLIENT_SECRET = import.meta.env.VITE_REDDIT_APP_SECRET;
  private readonly TOKEN_ENDPOINT = 'https://www.reddit.com/api/v1/access_token';
  private readonly RATE_LIMIT = 60; // Reddit's rate limit per minute
  private readonly USAGE_WINDOW = 60 * 1000; // 1 minute in milliseconds
  private accountUsage: Map<string, { count: number, lastReset: number }> = new Map();
  
  // Caching system
  private subredditCache: Map<string, { 
    data: any;
    timestamp: number;
    expiresIn: number;
  }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // Account rotation protection
  private isRotatingAccount = false;
  private accountRotationQueue: Promise<void> = Promise.resolve();

  // Cache methods
  private getCachedData(key: string): any | null {
    const cached = this.subredditCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.expiresIn) {
      this.subredditCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedData(key: string, data: any, expiresIn: number = this.CACHE_TTL): void {
    this.subredditCache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn
    });
  }

  // Account selection and rotation methods
  private async selectBestAccount(): Promise<string | null> {
    try {
      // Get all active accounts
      const { data: accounts, error } = await supabase
        .from('reddit_accounts')
        .select('id, last_used_at, token_expiry')
        .eq('is_active', true)
        .order('last_used_at', { ascending: true });

      if (error || !accounts?.length) return null;

      // Get recent API usage for all accounts
      const now = new Date();
      const { data: usage } = await supabase
        .from('reddit_api_usage')
        .select('reddit_account_id, requests_count')
        .gte('window_start', new Date(now.getTime() - this.USAGE_WINDOW).toISOString());

      // Create a map of account usage
      const usageMap = new Map(usage?.map(u => [u.reddit_account_id, u.requests_count]) || []);

      // Find the account with the lowest recent usage
      let bestAccount = accounts[0];
      let lowestUsage = usageMap.get(accounts[0].id) || 0;

      for (const account of accounts) {
        const accountUsage = usageMap.get(account.id) || 0;
        if (accountUsage < lowestUsage) {
          bestAccount = account;
          lowestUsage = accountUsage;
        }
      }

      // Immediately update last_used_at to prevent this account from being selected again too soon
      if (bestAccount) {
        await supabase
          .from('reddit_accounts')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', bestAccount.id);
      }

      return bestAccount.id;
    } catch (error) {
      console.error('Error selecting best account:', error);
      return null;
    }
  }

  private async rotateAccount(): Promise<void> {
    // If already rotating, queue this rotation to happen after current one finishes
    if (this.isRotatingAccount) {
      await this.accountRotationQueue;
      return;
    }

    // Set lock and create a new promise for the queue
    this.isRotatingAccount = true;
    let resolver: () => void;
    this.accountRotationQueue = new Promise<void>(resolve => {
      resolver = resolve;
    });

    try {
      const bestAccountId = await this.selectBestAccount();
      if (bestAccountId && bestAccountId !== this.accountId) {
        await this.setAccountAuth(bestAccountId);
      }
    } finally {
      // Release the lock and resolve the promise
      this.isRotatingAccount = false;
      resolver!();
    }
  }

  // Authentication and token methods
  private async ensureAuth(): Promise<void> {
    // If no account is selected or token is expired, try to rotate
    if (!this.accessToken || Date.now() >= this.expiresAt) {
      if (!this.accountId) {
        await this.rotateAccount();
      }
      
      if (this.refreshToken) {
        await this.refreshAccessToken();
      } else {
        // Fall back to public API if no accounts available
        this.accessToken = 'public';
        this.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      }
    }

    // Check if current account is rate limited
    if (this.accountId) {
      const usage = this.accountUsage.get(this.accountId);
      const now = Date.now();
      
      if (usage) {
        // Reset count if window has passed
        if (now - usage.lastReset >= this.USAGE_WINDOW) {
          this.accountUsage.set(this.accountId, { count: 0, lastReset: now });
        }
        // Rotate account if near rate limit
        else if (usage.count >= this.RATE_LIMIT * 0.8) { // 80% of rate limit
          await this.rotateAccount();
        }
      } else {
        this.accountUsage.set(this.accountId, { count: 0, lastReset: now });
      }
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken || !this.accountId) {
      throw new RedditAPIError('No refresh token available');
    }

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new RedditAPIError('Reddit client credentials are not configured properly. Check VITE_REDDIT_APP_ID and VITE_REDDIT_APP_SECRET.');
    }

    try {
      const authString = btoa(`${this.CLIENT_ID}:${this.CLIENT_SECRET}`);
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken
      });

      const response = await fetch(this.TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.USER_AGENT
        },
        body: params.toString()
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new RedditAPIError(`Failed to refresh token: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (!data.access_token) {
        throw new RedditAPIError('Invalid response when refreshing token');
      }

      this.accessToken = data.access_token;
      // Calculate expiration time with a 60-second margin for safety
      this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;

      // Update token in DB
      await supabase
        .from('reddit_accounts')
        .update({
          access_token: data.access_token,
          token_expiry: new Date(this.expiresAt).toISOString()
        })
        .eq('id', this.accountId);
        
    } catch (error) {
      // If token refresh fails, clear the tokens and log the error
      this.accessToken = null;
      this.expiresAt = 0;
      
      console.error('Failed to refresh Reddit token:', error);
      
      // Throw a more specific error
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to refresh token');
    }
  }

  public async setAccountAuth(accountId: string): Promise<void> {
    try {
      const { data: account, error } = await supabase
        .from('reddit_accounts')
        .select('username, access_token, refresh_token, token_expiry')
        .eq('id', accountId)
        .single();

      if (error || !account) {
        throw new RedditAPIError('Failed to get account credentials');
      }

      this.accountId = accountId;
      this.accessToken = account.access_token;
      this.refreshToken = account.refresh_token;
      this.expiresAt = new Date(account.token_expiry).getTime();

      // Verify credentials with Reddit if needed
      await this.verifyCredentials();
      
    } catch (error) {
      console.error('Error setting account auth:', error);
      
      // Reset state on failure
      this.accountId = null;
      this.accessToken = null;
      this.refreshToken = null;
      this.expiresAt = 0;
      
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to authenticate with Reddit account');
    }
  }

  private async trackApiUsage(endpoint: string): Promise<void> {
    if (!this.accountId) return;

    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (now.getTime() % this.USAGE_WINDOW));

      // Update in-memory tracking
      const usage = this.accountUsage.get(this.accountId);
      if (usage) {
        if (now.getTime() - usage.lastReset >= this.USAGE_WINDOW) {
          this.accountUsage.set(this.accountId, { count: 1, lastReset: now.getTime() });
        } else {
          usage.count += 1;
        }
      } else {
        this.accountUsage.set(this.accountId, { count: 1, lastReset: now.getTime() });
      }

      // Update database tracking
      const { data } = await supabase
        .from('reddit_api_usage')
        .select('id, requests_count')
        .eq('reddit_account_id', this.accountId)
        .eq('window_start', windowStart.toISOString())
        .maybeSingle();

      if (data) {
        await supabase
          .from('reddit_api_usage')
          .update({ 
            requests_count: data.requests_count + 1,
            last_request: now.toISOString(),
            endpoint
          })
          .eq('id', data.id);
      } else {
        await supabase
          .from('reddit_api_usage')
          .insert({
            reddit_account_id: this.accountId,
            window_start: windowStart.toISOString(),
            requests_count: 1,
            last_request: now.toISOString(),
            endpoint
          });
      }
    } catch (error) {
      console.error('Error tracking API usage:', error);
      // Non-critical operation, don't throw
    }
  }

  private async verifyCredentials(): Promise<void> {
    if (!this.accessToken || !this.accountId) {
      throw new RedditAPIError('Account not properly authenticated');
    }

    if (!this.CLIENT_ID || !this.CLIENT_SECRET) {
      throw new RedditAPIError('Reddit client credentials are not configured properly. Check VITE_REDDIT_APP_ID and VITE_REDDIT_APP_SECRET.');
    }

    try {
      // Make a test request to verify the token works
      const response = await fetch('https://oauth.reddit.com/api/v1/me', {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'User-Agent': this.USER_AGENT
        }
      });

      if (!response.ok) {
        throw new RedditAPIError('Failed to verify account credentials');
      }

      const data = await response.json();

      // Verify that the app credentials match
      if (data.client_id && data.client_id !== this.CLIENT_ID) {
        throw new RedditAPIError('Account credentials do not match current app credentials');
      }
    } catch (error) {
      console.error('Error verifying Reddit credentials:', error);
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to verify account with Reddit');
    }
  }

  // Core API request method
  private async request(endpoint: string, options: RequestInit = {}, useOAuth: boolean = true): Promise<any> {
    try {
      // Ensure we have authentication
      if (useOAuth) {
        await this.ensureAuth();
      }

      const isFullUrl = endpoint.startsWith('http');
      const baseUrl = useOAuth && this.accessToken !== 'public' 
        ? 'https://oauth.reddit.com' 
        : 'https://www.reddit.com';
      
      const url = isFullUrl ? endpoint : `${baseUrl}${endpoint}`;

      // Set up headers
      const headers = new Headers(options.headers);
      
      // Set authorization header if using OAuth
      if (useOAuth && this.accessToken && this.accessToken !== 'public') {
        headers.set('Authorization', `Bearer ${this.accessToken}`);
      }
      
      // Always set a user agent
      headers.set('User-Agent', this.USER_AGENT);

      console.log('Making Reddit API request:', {
        url: url.replace(/\/\w+\.json/, '/[REDACTED].json'), // Redact potential sensitive paths
        method: options.method || 'GET',
        authenticated: useOAuth && this.accessToken !== 'public'
      });

      // Track API usage for OAuth requests
      if (useOAuth && this.accountId) {
        await this.trackApiUsage(endpoint);
      }

      // Make the request
      const response = await fetch(url, {
        ...options,
        headers
      });

      // Handle the response
      return await this.handleResponse(response, endpoint);
    } catch (error) {
      console.error('Reddit API request failed:', error);
      if (error instanceof RedditAPIError) {
        throw error;
      }
      throw new RedditAPIError('Failed to connect to Reddit. Please check your internet connection.');
    }
  }

  // Helper to parse and sanitize username
  public parseUsername(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const cleaned = input.trim();
    if (!cleaned) {
      return '';
    }

    // Handle 'u/username' format
    if (cleaned.startsWith('u/')) {
      return cleaned.slice(2).toLowerCase();
    }

    // Handle 'username' format
    return cleaned.toLowerCase();
  }

  // Function to parse subreddit names consistently
  public parseSubredditName(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const cleaned = input.trim();
    if (!cleaned) {
      return '';
    }

    const urlMatch = cleaned.match(/(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([^/?#]+)/i);
    if (urlMatch) {
      return urlMatch[1].replace(/^r\//, '').toLowerCase();
    }

    const withoutPrefix = cleaned.replace(/^\/?(r\/)?/i, '').split(/[/?#]/)[0];
    return withoutPrefix.toLowerCase();
  }

  // Response handling with proper error management
  private async handleResponse(response: Response, endpoint: string) {
    // Try to get the response text for better error messages
    const responseText = await response.text();

    // Log useful information about the response
    console.log('Reddit API response:', {
      status: response.status,
      statusText: response.statusText,
      endpoint,
      success: response.ok
    });

    // Handle specific Reddit API error status codes
    if (!response.ok) {
      // Parse error JSON if possible
      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        // If parsing fails, keep the text as is
      }

      // Special error handling for specific status codes
      if (response.status === 403) {
        if (endpoint.includes('/about.json') && endpoint.includes('/r/')) {
          // Subreddit access errors
          const subredditName = endpoint.match(/\/r\/([^/]+)/)?.[1] || 'unknown';
          
          if (responseText.includes('quarantine')) {
            throw new RedditAPIError('This subreddit is quarantined', 403, endpoint);
          } else if (responseText.includes('private')) {
            throw new RedditAPIError('This subreddit is private', 403, endpoint);
          } else if (responseText.includes('banned')) {
            throw new RedditAPIError('This subreddit has been banned', 403, endpoint);
          }
          throw new RedditAPIError('Access denied', 403, endpoint);
        }
        
        // Auth-related errors
        if (errorData.error === 'invalid_token' || errorData.error === 'unauthorized') {
          throw new RedditAPIError(
            'Your Reddit session has expired. Please reconnect your account.',
            403, 
            endpoint
          );
        }
      }
      
      // Generic error with parsed message if available
      throw new RedditAPIError(
        error.message || `Reddit API error (${response.status})`,
        response.status,
        endpoint
      );
    }

    // Parse successful response as JSON
    try {
      return JSON.parse(responseText);
    } catch (e) {
      // If we can't parse JSON but got an OK status, 
      // return the raw text (rare, but possible)
      return { text: responseText };
    }
  }

  // Implement retry logic with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let attempt = 0;
    
    while (true) {
      try {
        return await operation();
      } catch (error) {
        attempt++;
        
        if (error instanceof RedditAPIError && error.status === 429) {
          console.warn(`Rate limited by Reddit API. Attempt ${attempt} of ${maxRetries}.`);
        } else if (attempt >= maxRetries) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`Retrying after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Utility functions for content handling
  private decodeHtmlEntities(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  // Clean up markdown formatting
  private cleanMarkdown(text: string): string {
    if (!text) return '';
    
    // Remove markdown formatting
    return text
      // Remove headers
      .replace(/#{1,6}\s+/g, '')
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove links, keeping the text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
      // Remove blockquotes
      .replace(/^\s*>+\s*/gm, '')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove horizontal rules
      .replace(/^(\*|\-|_){3,}\s*$/gm, '')
      // Remove excessive newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // Clean Reddit image URLs
  public cleanImageUrl(url: string | null): string | null {
    if (!url) return null;
    
    // Handle special URL cases and invalid URLs 
    if (url === 'self' || url === 'default' || url === 'none' || url === 'null') {
      return null;
    }
    
    // For nsfw or spoiler thumbnails, generate a placeholder image instead of returning null
    if (url === 'nsfw') {
      return `https://api.dicebear.com/7.x/shapes/svg?seed=nsfw&backgroundColor=A40000&radius=12`;
    }
    
    if (url === 'spoiler') {
      return `https://api.dicebear.com/7.x/shapes/svg?seed=spoiler&backgroundColor=512DA8&radius=12`;
    }
    
    // Handle URLs with query parameters
    if (url.includes('?')) {
      try {
        const urlObj = new URL(url);
        // For Reddit CDN URLs, keep all original parameters
        if (urlObj.hostname.includes('redd.it') || 
            urlObj.hostname.includes('reddit.com') || 
            urlObj.hostname.includes('redditstatic.com')) {
          return url; // Return the original URL to preserve all Reddit's parameters
        }
        
        // For non-Reddit URLs, strip query params
        return `${urlObj.origin}${urlObj.pathname}`;
      } catch (err) {
        console.error('Failed to parse image URL:', err);
        return url; // Return original URL if parsing fails
      }
    }
    
    return url;
  }

  // Public API methods
  async getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
    const cleanSubreddit = this.parseSubredditName(subreddit);
    if (!cleanSubreddit) {
      throw new RedditAPIError('Invalid subreddit name', 400, 'subreddit/about');
    }

    // Check cache first
    const cacheKey = `subreddit:${cleanSubreddit}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return {
        ...cached,
        rules: cached.rules || [] // Ensure rules array exists
      };
    }

    // Function to safely retry the API call
    const fetchInfo = async () => {
      try {
        const endpoint = `/r/${cleanSubreddit}/about.json`;
        const response = await this.request(endpoint);
        
        if (!response?.data) {
          throw new RedditAPIError('Subreddit not found', 404, endpoint);
        }

        // Extract and normalize subreddit info
        const data = response.data;
        
        // Get rules in a separate call if needed
        let rules: any[] = [];
        try {
          const rulesResponse = await this.request(`/r/${cleanSubreddit}/about/rules.json`);
          if (rulesResponse && rulesResponse.rules) {
            rules = rulesResponse.rules.map((rule: any) => ({
              title: rule.short_name,
              description: rule.description
            }));
          }
        } catch (ruleError) {
          console.warn(`Could not fetch rules for r/${cleanSubreddit}:`, ruleError);
          // Continue without rules rather than failing the whole request
        }
        
        // Create the normalized subreddit info object
        const subredditInfo: SubredditInfo = {
          name: data.display_name,
          title: data.title,
          subscribers: data.subscribers || 0,
          active_users: data.active_user_count || 0,
          description: data.public_description || data.description || '',
          created_utc: data.created_utc,
          over18: data.over18 || false,
          icon_img: this.cleanImageUrl(this.decodeHtmlEntities(data.icon_img)),
          community_icon: this.cleanImageUrl(this.decodeHtmlEntities(data.community_icon)),
          rules
        };

        // Cache the result
        this.setCachedData(cacheKey, subredditInfo);

        return subredditInfo;
        
      } catch (error) {
        console.error(`Error fetching subreddit ${cleanSubreddit}:`, error);
        
        if (error instanceof RedditAPIError) throw error;
        throw new RedditAPIError('Failed to get subreddit information', 0, 'about');
      }
    };

    // Execute with retry logic
    return await this.retryWithBackoff(() => fetchInfo());
  }

  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    limit: number = 25,
    timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day'
  ): Promise<SubredditPost[]> {
    const cleanSubreddit = this.parseSubredditName(subreddit);
    if (!cleanSubreddit) {
      throw new RedditAPIError('Invalid subreddit name', 400, 'subreddit/posts');
    }

    // Limit to reasonable values
    const safeLimit = Math.min(Math.max(1, limit), 100);
    
    // Function to fetch posts with pagination
    const fetchPosts = async (): Promise<SubredditPost[]> => {
      try {
        let endpoint = `/r/${cleanSubreddit}/${sort}.json?limit=${safeLimit}`;
        
        // Add time parameter for 'top' sort
        if (sort === 'top') {
          endpoint += `&t=${timeframe}`;
        }

        const response = await this.request(endpoint);
        
        if (!response?.data?.children) {
          throw new RedditAPIError('Invalid response from Reddit API', 0, 'posts');
        }

        return this.normalizeRedditPosts(response.data.children);
      } catch (error) {
        console.error(`Error fetching posts for r/${cleanSubreddit}:`, error);
        
        if (error instanceof RedditAPIError) throw error;
        throw new RedditAPIError('Failed to get subreddit posts', 0, 'posts');
      }
    };

    // Execute with retry logic
    return await this.retryWithBackoff(() => fetchPosts());
  }

  async searchSubreddits(query: string): Promise<SubredditInfo[]> {
    if (!query.trim()) {
      throw new RedditAPIError('Empty search query', 400, 'subreddit/search');
    }

    try {
      const cleanQuery = query.trim();
      const endpoint = `/subreddits/search.json?q=${encodeURIComponent(cleanQuery)}&limit=10`;
      
      const response = await this.request(endpoint);
      
      if (!response?.data?.children) {
        throw new RedditAPIError('Invalid response from Reddit API', 0, 'search');
      }
      
      return response.data.children
        .filter((child: any) => child.data)
        .map((child: any) => {
          const data = child.data;
          return {
            name: data.display_name,
            title: data.title,
            subscribers: data.subscribers || 0,
            active_users: data.active_user_count || 0,
            description: data.public_description || data.description || '',
            created_utc: data.created_utc,
            over18: data.over18 || false,
            icon_img: this.cleanImageUrl(this.decodeHtmlEntities(data.icon_img)),
            community_icon: this.cleanImageUrl(this.decodeHtmlEntities(data.community_icon)),
            rules: []
          };
        });
    } catch (error) {
      console.error('Error searching subreddits:', error);
      
      if (error instanceof RedditAPIError) throw error;
      throw new RedditAPIError('Failed to search subreddits', 0, 'search');
    }
  }

  async getUserPosts(username: string, sort: 'new' | 'top' = 'new'): Promise<SubredditPost[]> {
    // Clean up username
    const cleanUsername = this.parseUsername(username);
    if (!cleanUsername) {
      throw new RedditAPIError('Invalid username format', 400, 'user/about');
    }

    // First verify the user exists and get their posts
    try {
      const userInfoResponse = await this.request(`/user/${cleanUsername}/about.json`, {}, true);
      if (!userInfoResponse?.data) {
        throw new RedditAPIError(`User ${cleanUsername} not found`, 404, 'user/about');
      }

      // Get user's posts
      const endpoint = `/user/${cleanUsername}/submitted?limit=25&sort=${sort}${sort === 'top' ? '&t=all' : ''}`;
      const response = await this.request(endpoint, {}, true);

      if (!response?.data?.children) {
        throw new RedditAPIError(`No posts found for user ${cleanUsername}`, 404, endpoint);
      }

      // Cache user info for future use
      this.setCachedData(`user:${cleanUsername}`, userInfoResponse.data);

      return this.normalizeRedditPosts(response.data.children);
    } catch (error) {
      // Handle specific Reddit API errors
      if (error instanceof RedditAPIError) {
        if (error.status === 403) {
          throw new RedditAPIError(`User ${cleanUsername} is private or suspended`, 403, 'user/about');
        }
        if (error.status === 404) {
          throw new RedditAPIError(`User ${cleanUsername} not found`, 404, 'user/about');
        }
        // Let other RedditAPIError instances propagate as-is
        throw error;
      }
      
      // For network or other unexpected errors, wrap with meaningful context
      throw new RedditAPIError(
        `Failed to fetch posts for user ${cleanUsername}`,
        500,
        'user/posts'
      );
    }
  }

  async getUserInfo(username: string): Promise<RedditUserInfo | null> {
    try {
      const cleanUsername = this.parseUsername(username);
      if (!cleanUsername) return null;

      // Check cache first
      const cacheKey = `user:${cleanUsername}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) {
        return {
          avatar_url: this.cleanImageUrl(cached.icon_img || cached.snoovatar_img),
          name: cached.name,
          created_utc: cached.created_utc,
          total_karma: (cached.link_karma || 0) + (cached.comment_karma || 0)
        };
      }

      // Fetch from Reddit if not cached
      const response = await this.request(`/user/${cleanUsername}/about.json`);
      if (!response?.data) return null;

      const data = response.data;
      
      // Cache the user data
      this.setCachedData(cacheKey, data);
      
      return {
        avatar_url: this.cleanImageUrl(data.icon_img || data.snoovatar_img),
        name: data.name,
        created_utc: data.created_utc,
        total_karma: (data.link_karma || 0) + (data.comment_karma || 0)
      };
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  private normalizeRedditPosts(children: any[]): SubredditPost[] {
    return children
      .filter((child: any) => child.data && !child.data.stickied)
      .map((child: any) => {
        // Get the best preview image
        let preview_url = null;
        if (child.data.preview?.images?.[0]) {
          const image = child.data.preview.images[0];
          // Try to get a medium-sized preview if available
          const mediumPreview = image.resolutions?.find((r: any) => r.width >= 320 && r.width <= 640);
          
          // Get the URL and decode HTML entities - Reddit returns HTML-encoded URLs
          let imageUrl = mediumPreview?.url || image.source?.url || null;
          if (imageUrl) {
            imageUrl = this.decodeHtmlEntities(imageUrl);
          }
          
          preview_url = this.cleanImageUrl(imageUrl);
        }

        // Clean and validate thumbnail
        // First decode any HTML entities in the thumbnail URL
        let thumbnailUrl = child.data.thumbnail ? this.decodeHtmlEntities(child.data.thumbnail) : null;
        let thumbnail = this.cleanImageUrl(thumbnailUrl);
        
        // Filter out special thumbnail values that should be null
        if (thumbnail && ['self', 'default'].includes(thumbnail)) {
          thumbnail = null;
        }
        
        // For NSFW or spoiler posts without thumbnails but with previews, use the preview as thumbnail
        if (!thumbnail && preview_url && child.data.over_18) {
          thumbnail = preview_url;
        }
        
        // If we have a post URL that's an image, use it as fallback
        if (!thumbnail && !preview_url && child.data.url) {
          const postUrl = this.decodeHtmlEntities(child.data.url);
          if (postUrl.match(/\.(jpe?g|png|gif|webp)$/i)) {
            thumbnail = postUrl;
          }
        }

        return {
          id: child.data.id,
          title: this.decodeHtmlEntities(child.data.title),
          author: child.data.author,
          subreddit: child.data.subreddit,
          created_utc: child.data.created_utc,
          score: child.data.score,
          num_comments: child.data.num_comments,
          url: child.data.url,
          selftext: this.decodeHtmlEntities(child.data.selftext || ''),
          thumbnail,
          preview_url,
          post_karma: child.data.author_karma || 0
        };
      });
  }

  // Reddit post submission functionality
  async submitPost(
    params: RedditPostParams,
    accessToken: string
  ): Promise<RedditPostResponse> {
    try {
      // Sanitize the parameters
      const sanitizedParams = {
        subreddit: this.sanitizeString(params.subreddit),
        title: this.sanitizeString(params.title),
        kind: params.kind,
        text: params.text ? this.sanitizeString(params.text) : undefined,
        url: params.url ? this.sanitizeUrl(params.url) : undefined,
        mediaUrl: params.mediaUrl ? this.sanitizeUrl(params.mediaUrl) : undefined
      };

      let url = 'https://oauth.reddit.com/api/submit';
      let body: any = {
        sr: sanitizedParams.subreddit,
        title: sanitizedParams.title,
        api_type: 'json',
        resubmit: true
      };

      // Add type-specific parameters
      if (sanitizedParams.kind === 'image') {
        if (!sanitizedParams.mediaUrl) {
          throw new Error('Missing media URL for image post');
        }
        
        body.kind = 'link'; // Use link for image posts
        body.url = sanitizedParams.mediaUrl;
        
        // Optional text/caption
        if (sanitizedParams.text) {
          body.text = sanitizedParams.text;
        }
      } else if (sanitizedParams.kind === 'link') {
        if (!sanitizedParams.url) {
          throw new Error('Missing URL for link post');
        }
        
        body.kind = 'link';
        body.url = sanitizedParams.url;
      } else { // text post
        body.kind = 'self';
        body.text = sanitizedParams.text || '';
      }

      // Convert body to form data format that Reddit API expects
      const formData = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.USER_AGENT
        },
        body: formData.toString()
      });

      // Always try to get the response text for better debugging
      const responseText = await response.text();

      if (!response.ok) {
        // Try to parse JSON error if possible
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.json?.errors?.length > 0) {
            errorDetail = errorJson.json.errors.map((e: any[]) => e.join(': ')).join(', ');
          } else if (errorJson.message) {
            errorDetail = errorJson.message;
          } else if (errorJson.error) {
            errorDetail = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
          }
        } catch (e) {
          // If we can't parse as JSON, just use the text
        }
        
        throw new Error(`Reddit API error (${response.status}): ${errorDetail}`);
      }

      // Parse the response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse Reddit API response: ${e.message}`);
      }
      
      // Reddit returns different response formats depending on the request
      let postId, permalink;
      
      if (data.json?.data?.id) {
        // Response for json api_type
        postId = data.json.data.id;
        permalink = data.json.data.permalink;
      } else if (data.id || data.name) {
        // Direct response
        postId = data.id || data.name;
        permalink = data.permalink;
      } else {
        console.warn('Unexpected Reddit API response format:', data);
        // Try to find any ID-like field
        const possibleIds = Object.entries(data)
          .filter(([key]) => key.includes('id') || key.includes('name'))
          .map(([_, value]) => value);
        
        postId = possibleIds.length > 0 ? possibleIds[0] : 'unknown';
      }
      
      return {
        success: true,
        postId,
        permalink
      };
    } catch (error) {
      console.error('Error posting to Reddit API:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Content sanitization for posting
  private sanitizeString(input: string): string {
    if (!input) return '';
    
    // First use DOMPurify to remove any HTML/script content
    const purified = typeof window !== 'undefined' 
      ? DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }) // Strip all HTML tags
      : input.replace(/<[^>]*>?/gm, ''); // Simple tag removal for server-side
      
    // Then escape special characters that could be used for other injection techniques
    return purified
      .replace(/[\\<>*_~`]/g, '') // Remove markdown special characters
      .trim();
  }
  
  private sanitizeUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Parse URL to validate and normalize
      const parsed = new URL(url);
      
      // Allow only http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        console.warn(`Blocked potentially unsafe URL protocol: ${parsed.protocol}`);
        return '';
      }
      
      // Return normalized URL string
      return parsed.toString();
    } catch (error) {
      console.error('Invalid URL detected and blocked:', url);
      return '';
    }
  }

  // Analysis functions
  async analyzePostFrequency(posts: SubredditPost[]): Promise<SubredditFrequency[]> {
    // Create a map to track frequency and details for each subreddit
    const subredditMap = new Map<string, {
      count: number;
      name: string;
      posts: SubredditPost[];
    }>();

    // Count occurrences of each subreddit
    for (const post of posts) {
      const name = post.subreddit.toLowerCase();
      
      if (!subredditMap.has(name)) {
        subredditMap.set(name, {
          count: 1,
          name: post.subreddit,
          posts: [post]
        });
      } else {
        const data = subredditMap.get(name)!;
        data.count += 1;
        
        // Collect up to 3 posts per subreddit for details
        if (data.posts.length < 3) {
          data.posts.push(post);
        }
      }
    }

    // Convert to array and sort by frequency
    const sortedEntries = [...subredditMap.entries()]
      .sort((a, b) => b[1].count - a[1].count);

    // Fetch additional details for the most frequent subreddits (top 10)
    const topSubreddits = sortedEntries.slice(0, 10);
    
    // Fetch details for each top subreddit
    const subredditFrequencies: SubredditFrequency[] = [];
    
    for (const [name, data] of topSubreddits) {
      try {
        // Try to get subreddit details
        const subredditInfo = await this.getSubredditInfo(name);
        
        subredditFrequencies.push({
          name: subredditInfo.name,
          count: data.count,
          subscribers: subredditInfo.subscribers,
          active_users: subredditInfo.active_users,
          icon_img: subredditInfo.icon_img,
          community_icon: subredditInfo.community_icon,
          lastPosts: data.posts
        });
      } catch (error) {
        // If we can't get details, still include basic info
        console.error(`Error getting details for r/${name}:`, error);
        
        subredditFrequencies.push({
          name: data.name,
          count: data.count,
          subscribers: 0,
          active_users: 0,
          icon_img: null,
          community_icon: null,
          lastPosts: data.posts
        });
      }
    }
    
    return subredditFrequencies;
  }
}

// Create and export a singleton instance
export const redditService = new RedditService(); 