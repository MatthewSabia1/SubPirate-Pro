# Reddit Integration

The Reddit Integration feature allows users to connect their Reddit accounts, interact with the Reddit API, and analyze Reddit data.

## Overview

This feature provides:
- Reddit OAuth authentication
- Fetching subreddit information and posts
- Enhanced image handling and proxying
- Rate-limiting and error handling for the Reddit API
- Caching mechanisms for API responses
- Account rotation for high-volume API usage

## Architecture

### Components

- **RedditAccounts Page**: `/src/pages/RedditAccounts.tsx`
  - Lists connected Reddit accounts
  - Allows adding new accounts

- **RedditOAuthCallback**: `/src/pages/RedditOAuthCallback.tsx`
  - Handles OAuth callback from Reddit
  - Processes authentication tokens

- **RedditConnectModal**: `/src/components/RedditConnectModal.tsx`
  - UI for initiating Reddit account connection

- **RedditImage Component**: `/src/components/RedditImage.tsx`
  - Handles Reddit image loading and CORS issues
  - Implements fallback mechanisms
  - Processes encoded Reddit image URLs
  - Custom NSFW/spoiler content handling

- **RedditAccountContext**: `/src/contexts/RedditAccountContext.tsx`
  - Provides connected account information to the app
  - Manages account switching and status

### Services

- **Reddit API Client**: `/src/lib/redditApi.ts`
  - Core class for interacting with Reddit's API
  - Handles authentication, rate limits, and caching
  - Provides methods for fetching subreddit data

- **Reddit API Types**: `/src/lib/reddit.ts`
  - Type definitions for Reddit API responses
  - Utility functions for Reddit data

- **Reddit Sync**: `/src/lib/redditSync.ts`
  - Synchronizes saved posts and other user data

### Database Schema

```sql
reddit_accounts {
  id: string (primary key)
  user_id: string (foreign key to profiles)
  username: string
  access_token: string
  refresh_token: string
  token_expiry: string (timestamp)
  client_id: string
  client_secret: string
  is_active: boolean
  last_used_at: string (timestamp)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}

reddit_api_usage {
  id: string (primary key)
  reddit_account_id: string (foreign key to reddit_accounts)
  endpoint: string
  endpoint_hash: string
  requests_count: number
  window_start: string (timestamp)
  reset_at: string (timestamp)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}

saved_posts {
  id: string (primary key)
  user_id: string (foreign key to profiles)
  reddit_post_id: string
  subreddit: string
  title: string
  author: string
  url: string
  thumbnail: string
  created_at: string (timestamp)
}
```

## Reddit API Integration

### Authentication Flow

1. User initiates Reddit connection:
   - Clicks "Connect Reddit Account" button
   - Frontend redirects to Reddit OAuth URL

2. Reddit OAuth authorization:
   - User authorizes the application on Reddit
   - Reddit redirects back with authorization code

3. Token exchange:
   ```typescript
   // Send code to server to exchange for tokens
   const response = await fetch('/api/reddit/token', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ code })
   });
   
   const { access_token, refresh_token, expires_in } = await response.json();
   ```

4. Store tokens in database:
   ```typescript
   await supabase.from('reddit_accounts').insert({
     user_id: auth.user.id,
     username: redditUsername,
     access_token,
     refresh_token,
     token_expiry: new Date(Date.now() + expires_in * 1000),
     client_id: process.env.REDDIT_CLIENT_ID,
     is_active: true,
   });
   ```

### API Request Flow

1. Initialize the Reddit API client:
   ```typescript
   const redditApi = new RedditAPI();
   ```

2. Before each request, ensure valid authentication:
   ```typescript
   private async ensureAuth(): Promise<void> {
     if (!this.accessToken || Date.now() >= this.expiresAt) {
       if (this.refreshToken) {
         await this.refreshAccessToken();
       } else {
         // Fall back to public API
         this.accessToken = 'public';
         this.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
       }
     }
   }
   ```

3. Make the API request with proper headers and error handling:
   ```typescript
   private async request(endpoint: string, options: RequestInit = {}, useOAuth: boolean = true) {
     await this.ensureAuth();
     
     const headers = new Headers(options.headers);
     headers.set('User-Agent', this.USER_AGENT);
     
     if (useOAuth && this.accessToken) {
       headers.set('Authorization', `Bearer ${this.accessToken}`);
     }
     
     // Make request and handle errors...
   }
   ```

4. Track API usage for rate limiting:
   ```typescript
   private async trackApiUsage(endpoint: string): Promise<void> {
     if (!this.accountId) return;
     
     // Update usage in database...
     await supabase.from('reddit_api_usage').upsert({...});
   }
   ```

## Rate Limiting Strategy

The system implements advanced rate limiting:

1. **Account Rotation**: Multiple Reddit accounts can be used to increase total available requests
   ```typescript
   private async rotateAccount(): Promise<void> {
     const bestAccountId = await this.selectBestAccount();
     if (bestAccountId && bestAccountId !== this.accountId) {
       await this.setAccountAuth(bestAccountId);
     }
   }
   ```

2. **Usage Tracking**: API request counts are tracked per account
   ```typescript
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
     }
   }
   ```

3. **Exponential Backoff**: Retry failed requests with increasing delays
   ```typescript
   private async retryWithBackoff<T>(
     operation: () => Promise<T>,
     maxRetries: number = 3,
     baseDelay: number = 1000
   ): Promise<T> {
     // Implementation with exponential backoff...
   }
   ```

## Caching Implementation

The Reddit API client implements caching to reduce API calls:

```typescript
private subredditCache: Map<string, { 
  data: any;
  timestamp: number;
  expiresIn: number;
}> = new Map();

private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

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
```

## Image Handling System

Reddit images present unique challenges including CORS restrictions, HTML-encoded URLs, and special placeholders for NSFW content. The application implements a robust image handling system:

### RedditImage Component

The core of the image handling system is the `RedditImage` component:

```tsx
<RedditImage 
  src={postImageUrl}
  alt={postTitle}
  fallbackSrc={fallbackImageUrl}
  className="image-class"
/>
```

Key features:
- CORS handling via image proxy
- Multi-tier fallback system
- Special handling for NSFW/spoiler content
- HTML entity decoding
- Advanced error recovery

### URL Processing Pipeline

Images pass through a processing pipeline:

```typescript
// Process the image URL to handle Reddit URLs
const processImageUrl = (url: string) => {
  // Handle special values from Reddit
  if (url === 'nsfw') {
    return `https://api.dicebear.com/7.x/shapes/svg?seed=nsfw&backgroundColor=A40000&radius=12`;
  }
  
  // Decode HTML entities in the URL
  const decodedUrl = url
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  // Remove backslashes from JSON encoding
  const cleanUrl = decodedUrl.replace(/\\/g, '');
  
  // Use a proxy for Reddit images to avoid CORS issues
  if (isRedditUrl) {
    const encodedUrl = encodeURIComponent(cleanUrl);
    return `https://images.weserv.nl/?url=${encodedUrl}&n=-1&output=webp&fit=inside&maxage=24h`;
  }
  
  return cleanUrl;
};
```

### Fallback System

The component implements a multi-tier fallback system:

```typescript
// Determine which image source to use
let imageSrc = '';

if (!error) {
  // Try the primary image first
  imageSrc = isValidUrl(src) ? processImageUrl(src) : '';
} else if (!fallbackError && fallbackSrc && isValidUrl(fallbackSrc)) {
  // If primary fails, try the fallback
  imageSrc = processImageUrl(fallbackSrc);
} else {
  // If both fail, use the guaranteed placeholder
  imageSrc = generatePlaceholder();
}
```

### NSFW Content Handling

Special handling for sensitive content:

```typescript
// For nsfw thumbnails, generate a placeholder image
if (url === 'nsfw') {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=nsfw&backgroundColor=A40000&radius=12`;
}

// For spoiler thumbnails, generate a placeholder image
if (url === 'spoiler') {
  return `https://api.dicebear.com/7.x/shapes/svg?seed=spoiler&backgroundColor=512DA8&radius=12`;
}

// For NSFW posts without thumbnails but with previews
if (!thumbnail && preview_url && post.over_18) {
  thumbnail = preview_url;
}
```

### HTML Entity Decoding

Reddit returns HTML-encoded URLs which need proper decoding:

```typescript
const decodeHtmlEntities = (encodedString: string): string => {
  if (!encodedString) return '';
  
  // First use the textarea trick
  const textarea = document.createElement('textarea');
  textarea.innerHTML = encodedString;
  let decoded = textarea.value;
  
  // Then additionally handle Reddit's specific encoding patterns
  decoded = decoded
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, '\\')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  
  return decoded;
};
```

## Error Handling

The Reddit API client handles various error scenarios:

1. **Network Errors**: Retries with backoff strategy
2. **Authentication Errors**: Refreshes tokens or rotates accounts
3. **Rate Limiting**: Implements account rotation and request queuing
4. **Specific Reddit Errors**:
   - Quarantined subreddits
   - Private subreddits
   - Banned subreddits
   - Missing resources

## Batch Operations

For efficient API usage, batch operations are supported:

```typescript
private async batchFetchSubreddits(subreddits: string[]): Promise<Record<string, any>> {
  // Fetch multiple subreddits in a single request
  const subredditNames = subreddits.join(',');
  const data = await this.safeRequest(`/api/info?sr_name=${subredditNames}`);
  
  // Process results...
}
```

## Future Enhancements

- Full OAuth scope support for posting to Reddit
- Enhanced user profile insights
- Scheduled posting capabilities
- Comment monitoring and engagement tracking
- Historical data analysis for community trends