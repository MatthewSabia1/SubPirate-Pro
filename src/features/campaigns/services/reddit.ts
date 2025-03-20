import { CampaignPost, ContentType } from '../types';

// Interface for posting to Reddit
interface RedditPostParams {
  subreddit: string;
  title: string; 
  kind: 'link' | 'self' | 'image';
  text?: string;
  url?: string;
  mediaUrl?: string;
}

interface RedditPostResponse {
  success: boolean;
  postId?: string;
  permalink?: string;
  error?: string;
}

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

      const result = await this.sendToRedditApi(postParams, accountDetails.accessToken);
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

  // Send the actual request to Reddit API
  private static async sendToRedditApi(
    params: RedditPostParams,
    accessToken: string
  ): Promise<RedditPostResponse> {
    try {
      let url = 'https://oauth.reddit.com/api/submit';
      let body: any = {
        sr: params.subreddit,
        title: params.title,
        api_type: 'json',
        resubmit: true
      };

      // Add type-specific parameters
      if (params.kind === 'image') {
        if (!params.mediaUrl) {
          throw new Error('Missing media URL for image post');
        }
        
        body.kind = 'image';
        body.url = params.mediaUrl;
        
        // Optional text/caption
        if (params.text) {
          body.text = params.text;
        }
        
        // For debugging
        console.log('Image post body:', { subreddit: params.subreddit, title: params.title, imageUrl: params.mediaUrl });
      } else if (params.kind === 'link') {
        if (!params.url) {
          throw new Error('Missing URL for link post');
        }
        
        body.kind = 'link';
        body.url = params.url;
        
        // For debugging
        console.log('Link post body:', { subreddit: params.subreddit, title: params.title, url: params.url });
      } else { // text post
        body.kind = 'self';
        body.text = params.text || '';
        
        // For debugging
        console.log('Text post body:', { subreddit: params.subreddit, title: params.title });
      }

      // Convert body to form data format that Reddit API expects
      const formData = new URLSearchParams();
      Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      console.log('Making Reddit API request to:', url);
      console.log('Request headers:', {
        'Authorization': 'Bearer [REDACTED]',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SubPirate/1.0.0'
      });
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SubPirate/1.0.0'
        },
        body: formData.toString()
      });

      // Always try to get the response text for better debugging
      const responseText = await response.text();
      console.log('Reddit API response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });

      if (!response.ok) {
        // Try to parse JSON error if possible
        let errorDetail = responseText;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.json?.errors?.length > 0) {
            errorDetail = errorJson.json.errors.map((e: any[]) => e.join(': ')).join(', ');
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

  // Use Subreddit analysis data to determine optimal posting time
  static async getOptimalPostingTime(subredditId: string): Promise<Date> {
    try {
      // This would use your subreddit analysis data to determine the best time to post
      // For now, return a time 24 hours from now as a placeholder
      const optimalTime = new Date();
      optimalTime.setHours(optimalTime.getHours() + 24);
      return optimalTime;
    } catch (error) {
      console.error('Error determining optimal posting time:', error);
      // Default to 24 hours from now
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 24);
      return defaultTime;
    }
  }

  // Generate AI title based on subreddit analysis
  static async generateAiTitle(subredditId: string, contentSummary: string): Promise<string> {
    try {
      // This would connect to an AI service to generate a title
      // For now, return a placeholder
      return `[AI Generated] Post about ${contentSummary}`;
    } catch (error) {
      console.error('Error generating AI title:', error);
      return `Post about ${contentSummary}`; // Fallback
    }
  }
}