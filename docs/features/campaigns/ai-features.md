# AI Features for Campaigns

This document provides guidance on implementing the artificial intelligence features for the Campaigns system, including AI-optimized posting times and AI-generated post titles.

## Overview

The Campaigns feature includes two primary AI-powered capabilities:

1. **AI-optimized Timing**: Automatically determine the best time to post content to a subreddit
2. **AI Title Generation**: Automatically generate engaging titles for posts based on content and subreddit analysis

Currently, these features have placeholder implementations that should be replaced with actual AI integrations. This guide provides details on implementing these features using real AI services.

## Current State

The current implementation uses placeholder functions in `src/features/campaigns/services/reddit.ts`:

1. **getOptimalPostingTime()**: Always returns a time 24 hours in the future
2. **generateAiTitle()**: Returns a simple templated title with "[AI Generated]" prefix

These methods need to be enhanced with real AI functionality to provide value to users.

## Implementing AI-optimized Timing

### Data Requirements

To determine optimal posting times, you'll need:

1. **Historical Engagement Data**:
   - Posts per hour of day for each subreddit
   - Engagement metrics (upvotes, comments) by time of day
   - Active user count by time of day

2. **Subreddit Analysis Data**:
   - SubPirate already collects subreddit analysis data
   - This can be leveraged to identify patterns

### Implementation Approach

Replace the placeholder implementation with:

```typescript
static async getOptimalPostingTime(subredditId: string): Promise<Date> {
  try {
    // 1. Fetch subreddit analysis data
    const { data: analysis, error } = await supabase
      .from('subreddit_analysis')
      .select('*')
      .eq('subreddit_id', subredditId)
      .single();
    
    if (error || !analysis) {
      console.warn('Subreddit analysis not found, using fallback scheduling');
      return this.getFallbackPostTime();
    }
    
    // 2. If we have activity_by_hour data, use it
    if (analysis.activity_by_hour) {
      // Find hour with highest activity
      const hours = Object.entries(analysis.activity_by_hour)
        .map(([hour, activity]) => ({ hour: parseInt(hour), activity }))
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
        
        return optimalTime;
      }
    }
    
    // 3. Fall back to ML-based prediction if we have enough data
    if (analysis.post_count >= 50) {
      return this.predictOptimalTimeWithML(analysis);
    }
    
    // 4. Default fallback
    return this.getFallbackPostTime();
  } catch (error) {
    console.error('Error determining optimal posting time:', error);
    return this.getFallbackPostTime();
  }
}

// Fallback method for when AI timing isn't possible
private static getFallbackPostTime(): Date {
  const defaultTime = new Date();
  // Schedule for tomorrow at 9 AM (common good posting time)
  defaultTime.setDate(defaultTime.getDate() + 1);
  defaultTime.setHours(9, 0, 0, 0);
  return defaultTime;
}

// Advanced ML prediction with external AI service
private static async predictOptimalTimeWithML(analysis: any): Promise<Date> {
  // This would connect to an external AI service
  // Example: OpenAI, Claude, or a custom ML model
  
  // For now, return a reasonable time based on data
  const defaultTime = new Date();
  defaultTime.setDate(defaultTime.getDate() + 1);
  defaultTime.setHours(12, 0, 0, 0); // Noon tomorrow
  return defaultTime;
}
```

### Integration with External AI Services

For advanced timing prediction, you can integrate with:

1. **OpenAI API**:
   - Use GPT models to analyze patterns and predict optimal times
   - Requires formatting subreddit data as prompt context

2. **Custom ML Model**:
   - Train a model on historical Reddit data
   - Deploy as an API endpoint or serverless function
   - Call from the scheduler service

## Implementing AI Title Generation

### Data Requirements

To generate effective titles, you'll need:

1. **Content Information**:
   - For link posts: URL content, meta description, page title
   - For image posts: Image content, any caption text
   - For text posts: The post content

2. **Subreddit Context**:
   - Subreddit rules and formatting conventions
   - Common title patterns in the subreddit
   - Popular keywords and phrases

### Implementation Approach

Replace the placeholder implementation with:

```typescript
static async generateAiTitle(subredditId: string, contentSummary: string, contentType: ContentType): Promise<string> {
  try {
    // 1. Fetch subreddit info
    const { data: subreddit, error } = await supabase
      .from('subreddits')
      .select('name, description')
      .eq('id', subredditId)
      .single();
    
    if (error || !subreddit) {
      console.warn('Subreddit not found, using simple title generation');
      return `Post about ${contentSummary}`;
    }
    
    // 2. Get AI service credentials
    const API_KEY = process.env.OPENAI_API_KEY || 
                   (typeof import.meta !== 'undefined' ? import.meta.env?.OPENAI_API_KEY : undefined);
    
    if (!API_KEY) {
      console.warn('OpenAI API key not found, using fallback title generation');
      return `${subreddit.name} - ${contentSummary}`;
    }
    
    // 3. Connect to OpenAI (or other AI service)
    try {
      const openai = new OpenAI({ apiKey: API_KEY });
      
      // 4. Create an effective prompt
      const prompt = `
        Generate an engaging Reddit post title for r/${subreddit.name}.
        
        Subreddit description: ${subreddit.description || 'Not available'}
        Content type: ${contentType} post
        Content summary: ${contentSummary}
        
        Create a title that:
        - Follows typical r/${subreddit.name} formatting conventions
        - Is attention-grabbing but not clickbait
        - Is concise (under 100 characters)
        - Does not use all-caps or excessive punctuation
        - Does not include phrases like "title says it all" or "interesting title"
        
        Return only the title text with no quotation marks or additional commentary.
      `;
      
      // 5. Make API call
      const response = await openai.completions.create({
        model: "gpt-3.5-turbo-instruct",
        prompt,
        max_tokens: 50,
        temperature: 0.7
      });
      
      // 6. Extract and clean the title
      let generatedTitle = response.choices[0].text.trim();
      
      // Remove quotation marks if present
      if ((generatedTitle.startsWith('"') && generatedTitle.endsWith('"')) ||
          (generatedTitle.startsWith("'") && generatedTitle.endsWith("'"))) {
        generatedTitle = generatedTitle.substring(1, generatedTitle.length - 1);
      }
      
      return generatedTitle;
    } catch (aiError) {
      console.error('AI title generation error:', aiError);
      // Fallback to simple generation
      return `${subreddit.name} - ${contentSummary}`;
    }
  } catch (error) {
    console.error('Error generating AI title:', error);
    return `Post about ${contentSummary}`; // Fallback
  }
}
```

### Integration with AI Providers

There are several AI services you can use:

1. **OpenAI (GPT)**:
   - Good for title generation with minimal setup
   - Can understand context and subreddit-specific patterns
   - Requires API key and proper rate limit handling

2. **Claude (Anthropic)**:
   - Alternative to OpenAI with strong natural language capabilities
   - Can generate nuanced, context-aware titles
   - Requires separate API credentials

3. **Custom Fine-tuned Model**:
   - Train on successful Reddit posts to learn what works
   - Can be specialized for specific communities or content types
   - Requires more technical setup but may produce better results

## Feature Access and Tier Limitations

The AI features should be restricted to higher-tier subscriptions:

1. **Feature Gates**:
   - Only Pro and Agency tier users should have access to AI features
   - Use the existing FeatureAccess system to enforce this

2. **Implementation**:
   - Check feature access before using AI functions
   - Provide clear feedback when AI features aren't available
   - Offer appropriate fallbacks for lower-tier users

## Testing AI Features

To test the AI features:

1. **Timing Optimization Testing**:
   - Compare AI-recommended times with actual high-engagement periods
   - A/B test posting at AI-recommended times vs. random times
   - Track engagement metrics for posts with AI timing

2. **Title Generation Testing**:
   - Compare engagement of AI-generated titles vs. manual titles
   - Run sentiment analysis on user responses to different title styles
   - Evaluate the diversity and creativity of generated titles

## Implementation Roadmap

1. **Phase 1**: Replace placeholders with real AI integrations
   - Implement basic API connections to OpenAI or similar service
   - Set up proper environment variables and API keys
   - Add basic error handling and fallbacks

2. **Phase 2**: Enhance with subreddit-specific learning
   - Build a feedback loop for successful titles and times
   - Incorporate subreddit-specific patterns and rules
   - Implement A/B testing framework

3. **Phase 3**: Advanced optimization
   - Develop custom ML models for timing optimization
   - Implement content-aware title generation
   - Add personalization based on user history and preferences

## AI Privacy and Ethics Considerations

When implementing AI features:

1. **Data Privacy**:
   - Don't send personally identifiable information to AI services
   - Be transparent about what data is used for AI features
   - Allow users to opt out of AI data collection

2. **Content Policies**:
   - Ensure AI-generated content complies with Reddit's policies
   - Implement content filtering to prevent inappropriate suggestions
   - Provide clear attribution for AI-generated content

3. **Rate Limiting**:
   - Implement thoughtful rate limiting for AI API calls
   - Cache results where appropriate to reduce API usage
   - Gracefully handle service outages or quota limits