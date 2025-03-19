# Subreddit Analysis Feature

The Subreddit Analysis feature provides AI-powered insights into subreddits to help marketers understand how to effectively engage with Reddit communities.

## Overview

This feature analyzes a subreddit and generates:
- Marketing friendliness score
- Content strategy recommendations
- Posting requirements and restrictions
- Optimal posting times
- Title templates
- In-depth rule analysis with marketing impact assessments

## Architecture

### Components

- **SubredditAnalysis (Page)**: `/src/pages/SubredditAnalysis.tsx`
  - Main container component for subreddit analysis view
  - Handles analysis process and state management
  
- **Analysis Worker**: `/src/lib/analysisWorker.ts`
  - Web worker for running analysis in a separate thread
  - Manages API requests to AI services

- **Shared Worker**: `/src/lib/analysisSharedWorker.ts`
  - Coordinates analysis tasks across multiple browser tabs

### Services

- **Reddit API**: `/src/lib/redditApi.ts`
  - Handles Reddit API communication
  - Fetches subreddit information, rules, and posts
  - Includes rate limiting and caching mechanisms

- **Analysis Service**: `/src/lib/analysis.ts`
  - Core business logic for transforming Reddit data
  - Prepares prompts for AI analysis
  - Processes AI responses into structured data

- **OpenRouter Service**: `/src/features/subreddit-analysis/services/openrouter.ts`
  - Integration with OpenRouter API for AI processing

## Database Schema

The analysis results are stored in the `subreddits` table:

```sql
subreddits {
  id: string (primary key)
  name: string
  subscriber_count: number
  active_users: number
  marketing_friendly_score: number
  posting_requirements: Json
  posting_frequency: Json
  allowed_content: string[]
  best_practices: string[]
  rules_summary: string
  title_template: string
  last_analyzed_at: string (timestamp)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}
```

User can save subreddits through the `saved_subreddits` table:

```sql
saved_subreddits {
  id: string (primary key)
  user_id: string (foreign key to auth.users)
  subreddit_id: string (foreign key to subreddits)
  last_post_at: string (timestamp, nullable)
  created_at: string (timestamp)
}
```

## API Flow

1. **Initial Request**: User enters a subreddit name
2. **Reddit Data Fetching**:
   - Fetch subreddit info using `/r/{subreddit}/about.json`
   - Fetch subreddit rules using `/r/{subreddit}/about/rules.json`
   - Fetch recent posts using `/r/{subreddit}/{sort}.json?limit=100`

3. **Analysis Process**:
   - Basic analysis is run on the frontend in a Web Worker
   - Data is processed and transformed into structured analysis
   - Results are shown progressively as they become available

4. **Data Storage**:
   - Analysis results are cached in localStorage
   - Results are also stored in the database for future reference
   - User can save subreddits for easy access later

## Feature Gating

The Subreddit Analysis feature has usage limits based on subscription tier:

```typescript
// From src/lib/subscription/features.ts
export const TIER_LIMITS: Record<SubscriptionTier, { [key: string]: number }> = {
  free: {
    subreddit_analysis_per_month: 3,
  },
  starter: {
    subreddit_analysis_per_month: 10,
  },
  creator: {
    subreddit_analysis_per_month: 50,
  },
  pro: {
    subreddit_analysis_per_month: Infinity,
  },
  agency: {
    subreddit_analysis_per_month: Infinity,
  },
}
```

## AI Prompt Engineering

The analysis uses carefully crafted prompts to generate insights from subreddit data. The prompts include:

1. **Basic Analysis Prompt**: Analyzes subreddit rules and metadata for marketing friendliness
2. **Content Strategy Prompt**: Generates recommended content types and approaches
3. **Posting Limits Prompt**: Determines optimal posting times and frequency
4. **Title Analysis Prompt**: Creates effective title templates based on successful posts

## Error Handling

- Network errors during Reddit API requests
- Rate limiting protection
- Handling of private, banned, or quarantined subreddits
- Graceful fallbacks for AI service disruptions

## Future Enhancements

- Historical analysis comparison
- Competitive analysis between similar subreddits
- Content calendar integration
- AI-powered post drafting assistance