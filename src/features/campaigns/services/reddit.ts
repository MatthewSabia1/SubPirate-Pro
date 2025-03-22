import { CampaignPost, ContentType } from '../types';
import { supabase } from '../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { redditService, RedditPostParams, RedditPostResponse } from '../../../lib/redditService';

export class RedditPostingService {
  // Post to Reddit using a user's connected Reddit account
  static async submitPost(
    post: CampaignPost, 
    accountDetails: {
      username: string;
      accessToken: string;
    },
    subredditName: string
  ): Promise<RedditPostResponse> {
    try {
      // Prepare the post parameters based on content type
      const postParams: RedditPostParams = {
        subreddit: subredditName,
        title: post.title,
        kind: this.mapContentTypeToRedditKind(post.content_type)
      };

      // Set the appropriate content based on the type
      if (post.content_type === 'text') {
        postParams.text = post.content;
      } else if (post.content_type === 'link') {
        postParams.url = post.content;
      } else if (post.content_type === 'image') {
        // For image posts, the content field may contain caption text
        postParams.text = post.content; // Optional caption
        
        // Use media_item URL if available, otherwise fall back to content as URL
        if (post.media_item && typeof post.media_item === 'object' && post.media_item.url) {
          postParams.mediaUrl = post.media_item.url;
        } else if (post.content && post.content.startsWith('http')) {
          postParams.mediaUrl = post.content;
        } else {
          console.error('Image post missing valid URL', post);
          throw new Error('Image post is missing a valid media URL');
        }
      }

      // Use the consolidated redditService for submission
      const result = await redditService.submitPost(postParams, accountDetails.accessToken);
      return result;
    } catch (error) {
      console.error('Error submitting post to Reddit:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Map our content type to Reddit API's post kind
  private static mapContentTypeToRedditKind(contentType: ContentType): 'link' | 'self' | 'image' {
    switch (contentType) {
      case 'text':
        return 'self';
      case 'link':
        return 'link';
      case 'image':
        return 'image';
      default:
        return 'self';
    }
  }

  // Use Subreddit analysis data to determine optimal posting time
  static async getOptimalPostingTime(subredditId: string): Promise<Date> {
    try {
      // Fetch subreddit analysis data
      const { data: analysis, error } = await supabase
        .from('subreddit_analysis')
        .select('*')
        .eq('subreddit_id', subredditId)
        .single();
      
      if (error || !analysis) {
        console.warn('Subreddit analysis not found, using fallback scheduling');
        return this.getFallbackPostTime();
      }
      
      // If we have activity_by_hour data, use it
      if (analysis.activity_by_hour) {
        // Find hour with highest activity
        const hours = Object.entries(analysis.activity_by_hour)
          .map(([hour, activity]) => ({ hour: parseInt(hour), activity: activity as number }))
          .sort((a, b) => b.activity - a.activity);
        
        if (hours.length > 0) {
          // Get the optimal hour (highest activity)
          const optimalHour = hours[0].hour;
          
          // Calculate the next occurrence of this hour
          const optimalTime = new Date();
          // If the hour has already passed today, schedule for tomorrow
          if (optimalTime.getHours() >= optimalHour) {
            optimalTime.setDate(optimalTime.getDate() + 1);
          }
          optimalTime.setHours(optimalHour, 0, 0, 0);
          
          console.log(`Optimal posting time determined: ${optimalTime.toISOString()} (hour with highest activity: ${optimalHour})`);
          return optimalTime;
        }
      }
      
      // If analysis has best_time_to_post data
      if (analysis.postingLimits?.bestTimeToPost && analysis.postingLimits.bestTimeToPost.length > 0) {
        // Try to extract time from text like "10 AM", "between 8 PM and 10 PM", etc.
        const bestTimeText = analysis.postingLimits.bestTimeToPost[0];
        const timeMatches = bestTimeText.match(/\b(\d{1,2})(?:\s*)(am|pm)\b/gi);
        
        if (timeMatches && timeMatches.length > 0) {
          // Take the first time mentioned
          const timeStr = timeMatches[0].trim();
          const hourMatch = timeStr.match(/\d{1,2}/);
          const periodMatch = timeStr.match(/(am|pm)/i);
          
          if (hourMatch && periodMatch) {
            let hour = parseInt(hourMatch[0]);
            const period = periodMatch[0].toLowerCase();
            
            // Convert to 24-hour format
            if (period === 'pm' && hour < 12) {
              hour += 12;
            } else if (period === 'am' && hour === 12) {
              hour = 0;
            }
            
            // Set the optimal time for tomorrow at that hour
            const optimalTime = new Date();
            
            // If the hour has already passed today, schedule for tomorrow
            if (optimalTime.getHours() >= hour) {
              optimalTime.setDate(optimalTime.getDate() + 1);
            }
            
            optimalTime.setHours(hour, 0, 0, 0);
            console.log(`Optimal posting time from analysis text: ${optimalTime.toISOString()} (extracted from "${bestTimeText}")`);
            return optimalTime;
          }
        }
      }
      
      // If we have market friendliness score, use specific time based on it
      if (analysis.marketingFriendliness && analysis.marketingFriendliness.score) {
        // Higher marketing friendliness = schedule sooner to get more engagement
        const score = analysis.marketingFriendliness.score;
        // For high-scoring friendly subreddits, post sooner (12-24h)
        // For medium-scoring, post in 24-36h
        // For low-scoring, post in 36-48h window
        const hoursToAdd = score > 70 ? 12 : (score > 40 ? 24 : 36);
        
        const optimalTime = new Date();
        optimalTime.setHours(optimalTime.getHours() + hoursToAdd);
        console.log(`Optimal posting time based on marketing score: ${optimalTime.toISOString()} (score: ${score})`);
        return optimalTime;
      }
      
      // Fall back to default time
      return this.getFallbackPostTime();
    } catch (error) {
      console.error('Error determining optimal posting time:', error);
      return this.getFallbackPostTime();
    }
  }
  
  // Default fallback posting time
  private static getFallbackPostTime(): Date {
    // Schedule for tomorrow at 9 AM (common good posting time)
    const defaultTime = new Date();
    defaultTime.setDate(defaultTime.getDate() + 1);
    defaultTime.setHours(9, 0, 0, 0);
    console.log(`Using fallback posting time: ${defaultTime.toISOString()}`);
    return defaultTime;
  }

  // Generate AI title based on subreddit analysis
  static async generateAiTitle(subredditId: string, contentSummary: string, contentType: ContentType = 'text'): Promise<string> {
    try {
      // Get subreddit information
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      const { data: subredditData, error: subredditError } = await supabase
        .from('subreddits')
        .select('*')
        .eq('id', subredditId)
        .single();
      
      if (subredditError || !subredditData) {
        console.error('Error fetching subreddit data:', subredditError);
        return this.getFallbackTitle(contentSummary);
      }
      
      const subreddit = subredditData;
      
      // Look for existing title templates
      let titleTemplates: string[] = [];
      let topics: string[] = [];
      
      // If the subreddit has analysis data, try to extract title templates
      if (subreddit.analysis_data) {
        const analysis = subreddit.analysis_data;
        
        // Extract title templates if available
        if (analysis.titleTemplates?.patterns) {
          titleTemplates = analysis.titleTemplates.patterns;
        }
        
        // Extract topics if available
        if (analysis.contentStrategy?.topics) {
          topics = analysis.contentStrategy.topics;
        }
      }
      
      // Use the server endpoint instead of direct API access
      try {
        const response = await fetch('/api/openrouter/generate-title', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subredditName: subreddit.name,
            contentSummary,
            subredditDescription: subreddit.description
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error generating title: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // Return the generated title
        if (result.title) {
          return result.title;
        }
        
        // If no title returned or error, fall back to basic generation
        return this.generateBasicTitle(subreddit.name, contentSummary, titleTemplates);
      } catch (error) {
        console.warn('Error generating AI title:', error);
        return this.generateBasicTitle(subreddit.name, contentSummary, titleTemplates);
      }
    } catch (error) {
      console.error('Error in generateAiTitle:', error);
      return this.getFallbackTitle(contentSummary);
    }
  }
  
  // Generate a basic title using templates if available
  private static generateBasicTitle(subredditName: string, contentSummary: string, templates: string[] = []): string {
    // If we have templates, use the first one as a model
    if (templates.length > 0) {
      // Get the first template
      const template = templates[0];
      
      // Replace placeholders with actual content
      return template
        .replace(/\{subreddit\}/g, subredditName)
        .replace(/\{content\}/g, contentSummary.slice(0, 50))
        .replace(/\{question\}/g, `What do you think about ${contentSummary.slice(0, 30)}?`);
    }
    
    // Fall back to default title format based on content type
    return this.getFallbackTitle(contentSummary);
  }
  
  // Get a default title when all else fails
  private static getFallbackTitle(contentSummary: string): string {
    // If content summary is short enough, use it directly
    if (contentSummary.length <= 80) {
      return contentSummary;
    }
    
    // Otherwise, truncate with ellipsis
    return contentSummary.slice(0, 77) + '...';
  }
}