import { redditService, SubredditInfo, SubredditPost, RedditAPIError } from './redditService';
import { supabase } from './supabase';

export type { SubredditInfo, SubredditPost };
export { RedditAPIError };

export function parseSubredditName(input: string): string {
  return redditService.parseSubredditName(input);
}

export function getSubredditIcon(subreddit: { icon_img: string | null; community_icon: string | null; name: string }): string {
  try {
    // Helper function to decode HTML entities in URLs
    const decodeHtmlUrl = (url: string | null): string | null => {
      if (!url) return null;
      // Decode common HTML entities in URLs
      return url.replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");
    };
    
    // Try community icon first
    if (subreddit.community_icon) {
      const decodedIcon = decodeHtmlUrl(subreddit.community_icon);
      const cleanIcon = cleanRedditImageUrl(decodedIcon);
      if (cleanIcon) return cleanIcon;
    }
    
    // Try icon_img next
    if (subreddit.icon_img) {
      const decodedIcon = decodeHtmlUrl(subreddit.icon_img);
      const cleanIcon = cleanRedditImageUrl(decodedIcon);
      if (cleanIcon) return cleanIcon;
    }
  } catch (err) {
    console.error('Error processing subreddit icon:', err);
  }
  
  // Fallback to generated avatar
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(subreddit.name)}&backgroundColor=0f0f0f&radius=12`;
}

export function cleanRedditImageUrl(url: string | null): string | null {
  return redditService.cleanImageUrl(url);
}

export async function getSubredditInfo(subreddit: string): Promise<SubredditInfo> {
  try {
    const cleanSubreddit = parseSubredditName(subreddit);
    
    if (!cleanSubreddit) {
      throw new RedditAPIError('Please enter a valid subreddit name');
    }

    // Directly fetch subreddit info from Reddit API without checking/updating the database
    const info = await redditService.getSubredditInfo(cleanSubreddit);

    return {
      ...info,
      rules: info.rules || [] // Ensure rules array exists
    };
  } catch (error) {
    if (error instanceof RedditAPIError) {
      throw error;
    } else if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit info');
  }
}

export async function getSubredditPosts(
  subreddit: string, 
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit = 100,
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day',
  pagination?: { after?: string, before?: string }
): Promise<SubredditPost[]> {
  const cleanSubreddit = parseSubredditName(subreddit);
  
  if (!cleanSubreddit) {
    throw new RedditAPIError('Please enter a valid subreddit name');
  }

  try {
    // If user requests a large number of posts, use the new getAllSubredditPosts method
    if (limit > 100 && !pagination) {
      return await redditService.getAllSubredditPosts(cleanSubreddit, sort, limit, timeframe);
    }
    
    // Otherwise use the paginated method but extract just the posts for backward compatibility
    const result = await redditService.getSubredditPosts(
      cleanSubreddit, 
      sort, 
      Math.min(limit, 100), // Ensure we don't exceed Reddit's max
      timeframe,
      pagination
    );
    
    return result.posts;
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit posts');
  }
}

/**
 * Advanced function to get paginated subreddit posts with pagination metadata
 * This is preferred for UIs that need to implement pagination controls
 */
export async function getPaginatedSubredditPosts(
  subreddit: string, 
  sort: 'hot' | 'new' | 'top' = 'hot',
  limit = 25,
  timeframe: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all' = 'day',
  pagination?: { after?: string, before?: string }
): Promise<{ posts: SubredditPost[], pagination: { after: string | null, before: string | null, count: number } }> {
  const cleanSubreddit = parseSubredditName(subreddit);
  
  if (!cleanSubreddit) {
    throw new RedditAPIError('Please enter a valid subreddit name');
  }

  try {
    return await redditService.getSubredditPosts(
      cleanSubreddit, 
      sort, 
      limit, 
      timeframe,
      pagination
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to fetch subreddit posts');
  }
}

export async function searchSubreddits(query: string): Promise<SubredditInfo[]> {
  if (!query.trim()) {
    throw new RedditAPIError('Please enter a search query');
  }

  try {
    return await redditService.searchSubreddits(query.trim());
  } catch (error) {
    if (error instanceof Error) {
      throw new RedditAPIError(error.message);
    }
    throw new RedditAPIError('Failed to search subreddits');
  }
}

export function calculateMarketingFriendliness(subreddit: SubredditInfo, posts: SubredditPost[]): number {
  let score = 0;
  const maxScore = 100;

  // Factor 1: Subscriber count (30%)
  const subscriberScore = Math.min(subreddit.subscribers / 1000000, 1) * 30;
  score += subscriberScore;

  // Factor 2: Active users ratio (20%)
  const avgEngagementRatio = posts.reduce((sum, post) => sum + (post.score + post.num_comments) / subreddit.subscribers, 0) / posts.length;
  const activeScore = Math.min(avgEngagementRatio * 10000, 1) * 20;
  score += activeScore;

  // Factor 3: Post engagement (30%)
  const avgEngagement = posts.reduce((sum, post) => sum + post.score + post.num_comments, 0) / posts.length;
  const engagementScore = Math.min(avgEngagement / 1000, 1) * 30;
  score += engagementScore;

  // Factor 4: Content restrictions (20%)
  if (subreddit.over18) {
    score -= 10;
  }

  return Math.max(0, Math.min(score, maxScore));
}

export function cleanImageUrl(url: string | null): string | null {
  return redditService.cleanImageUrl(url);
}