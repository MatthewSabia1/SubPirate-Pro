import { SubredditPost } from './redditService';

interface CachedPosts {
  recent: SubredditPost[];
  top: SubredditPost[];
  timestamp: number;
}

interface PostCache {
  [accountId: string]: CachedPosts;
}

// Cache expiration time (15 minutes)
const CACHE_EXPIRY_MS = 15 * 60 * 1000;

// LocalStorage key
const STORAGE_KEY = 'subpirate_post_cache';

// Initialize cache from localStorage or create empty cache
let cache: PostCache = {};

// Load cache from localStorage on initialization
try {
  const storedCache = localStorage.getItem(STORAGE_KEY);
  if (storedCache) {
    cache = JSON.parse(storedCache);
    
    // Clean up any expired cache entries on load
    const now = Date.now();
    Object.keys(cache).forEach(accountId => {
      if (now - cache[accountId].timestamp > CACHE_EXPIRY_MS) {
        delete cache[accountId];
      }
    });
    
    // Update localStorage with cleaned cache
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  }
} catch (error) {
  console.error('Error loading post cache from localStorage:', error);
  // If there's an error, just use an empty cache
  cache = {};
}

/**
 * Get cached posts for an account if they exist and are not expired
 */
export function getCachedPosts(accountId: string): { recent: SubredditPost[]; top: SubredditPost[] } | null {
  const cachedData = cache[accountId];
  
  // Return null if no cache exists or it's expired
  if (!cachedData || (Date.now() - cachedData.timestamp > CACHE_EXPIRY_MS)) {
    return null;
  }
  
  return {
    recent: cachedData.recent,
    top: cachedData.top
  };
}

/**
 * Store posts in cache for an account
 */
export function cachePosts(accountId: string, posts: { recent: SubredditPost[]; top: SubredditPost[] }): void {
  cache[accountId] = {
    recent: posts.recent,
    top: posts.top,
    timestamp: Date.now()
  };
  
  // Persist to localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error saving post cache to localStorage:', error);
  }
}

/**
 * Clear cache for an account or all accounts
 */
export function clearCache(accountId?: string): void {
  if (accountId) {
    delete cache[accountId];
  } else {
    cache = {};
  }
  
  // Update localStorage
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error updating post cache in localStorage:', error);
  }
}

/**
 * Check if cache exists and is not expired for an account
 */
export function hasFreshCache(accountId: string): boolean {
  const cachedData = cache[accountId];
  return !!cachedData && (Date.now() - cachedData.timestamp <= CACHE_EXPIRY_MS);
}

/**
 * Get cache age in human-readable format
 */
export function getCacheAge(accountId: string): string {
  const cachedData = cache[accountId];
  
  if (!cachedData) {
    return 'No cache';
  }
  
  const ageMs = Date.now() - cachedData.timestamp;
  
  if (ageMs < 60000) {
    return `${Math.floor(ageMs / 1000)}s ago`;
  } else if (ageMs < 3600000) {
    return `${Math.floor(ageMs / 60000)}m ago`;
  } else {
    return `${Math.floor(ageMs / 3600000)}h ago`;
  }
} 