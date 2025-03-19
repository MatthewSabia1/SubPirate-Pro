# SubPirate API Documentation

This document outlines the API endpoints, data models, and integration points for the SubPirate application.

## API Overview

SubPirate uses a combination of:
- Supabase database API
- Custom API routes
- External APIs (Reddit, OpenRouter)

### API Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Application                          │
└───────────────┬─────────────────────────┬───────────────────────────┘
                │                         │
    ┌───────────▼───────────┐   ┌─────────▼───────────┐
    │                       │   │                     │
    │  Supabase Client API  │   │  Custom API Routes  │
    │                       │   │                     │
    └───────────┬───────────┘   └─────────┬───────────┘
                │                         │
┌───────────────▼─────────────────────────▼───────────────────────────┐
│                                                                     │
│                         Backend Services                            │
│                                                                     │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐    │
│  │                 │   │                 │   │                 │    │
│  │  Supabase DB    │   │   Reddit API    │   │  OpenRouter AI  │    │
│  │  & Auth Service │   │                 │   │                 │    │
│  │                 │   │                 │   │                 │    │
│  └─────────────────┘   └─────────────────┘   └─────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Supabase Data API

### Authentication

Required for all authenticated requests:

```typescript
// Get user session
const { data: { session } } = await supabase.auth.getSession();

// Sign in with email and password
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// Sign up with email and password
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
});
```

### Key Endpoints

#### User Profiles

```typescript
// Get current user profile
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update user profile
await supabase
  .from('profiles')
  .update({
    display_name: newName,
    updated_at: new Date().toISOString(),
  })
  .eq('id', userId);
```

#### Projects

```typescript
// Get all user projects
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });

// Get single project with subreddits
const { data: project } = await supabase
  .from('projects')
  .select(`
    *,
    project_subreddits(
      *,
      subreddits(*)
    )
  `)
  .eq('id', projectId)
  .single();

// Create new project
const { data: newProject } = await supabase
  .from('projects')
  .insert({
    user_id: userId,
    name: projectName,
    description: projectDescription,
  })
  .select()
  .single();
```

#### Subreddits

```typescript
// Get analyzed subreddit by name
const { data: subreddit } = await supabase
  .from('subreddits')
  .select('*')
  .eq('name', subredditName)
  .maybeSingle();

// Save a subreddit
await supabase
  .from('saved_subreddits')
  .upsert({
    subreddit_id: subredditId,
    user_id: userId,
  });

// Get user's saved subreddits
const { data: savedSubreddits } = await supabase
  .from('saved_subreddits')
  .select(`
    *,
    subreddits(*)
  `)
  .eq('user_id', userId);
```

#### Feature Access

```typescript
// Get available features for user (currently all features are accessible)
import { FEATURE_KEYS, getTierFeatures } from '../lib/subscription/features';

// All users currently have access to all features
const features = getTierFeatures('pro');

// Check if user has access to a specific feature
const hasAccess = features.includes(FEATURE_KEYS.ANALYZE_SUBREDDIT);
```

## Custom API Routes

### General API Handlers

The application uses various API routes for different functionality.

**Example Implementation**:
```typescript
// Example API endpoint for feature access
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const featureKey = searchParams.get('feature');
  
  try {
    // All features are currently available to all users
    return NextResponse.json({ 
      hasAccess: true,
      featureKey 
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'API request failed' },
      { status: 400 }
    );
  }
}
```

### Reddit Authentication

**Endpoint**: `/api/reddit/token`

**Method**: POST

**Purpose**: Exchange authorization code for Reddit access tokens

**Request Body**:
```json
{
  "code": "reddit_authorization_code"
}
```

**Response**:
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600
}
```

### Subreddit Analysis

**Endpoint**: `/api/analysis/subreddit`

**Method**: POST

**Purpose**: Trigger AI analysis of a subreddit

**Request Body**:
```json
{
  "subreddit": "subreddit_name",
  "depth": "full | basic"
}
```

**Response**:
```json
{
  "id": "analysis_job_id",
  "status": "processing | complete | failed",
  "result": { /* Analysis data if complete */ }
}
```

## External API Integrations

### Reddit API

The application uses the Reddit API for fetching subreddit data:

**Base URL**: `https://oauth.reddit.com` (authenticated) or `https://www.reddit.com` (public)

**Key Endpoints**:
- `/r/{subreddit}/about.json`: Subreddit metadata
- `/r/{subreddit}/about/rules.json`: Subreddit rules
- `/r/{subreddit}/{sort}.json`: Subreddit posts
- `/api/info?sr_name={subreddits}`: Batch subreddit info

**Authentication**:
- OAuth 2.0 with authorization code flow
- Bearer token in `Authorization` header

**Rate Limits**:
- 60 requests per minute per authenticated user
- 600 requests per 10 minutes for OAuth apps

### Feature Access System

The application now uses a simplified feature access system:

**Key Components**:
- Feature definitions in code
- All features available to all users
- Infrastructure in place for future subscription tiers

**Authentication**:
- No special authentication needed for features
- Standard Supabase authentication for user identity

### OpenRouter API (AI)

Used for AI-powered analysis:

**Endpoint**: `https://openrouter.ai/api/v1/chat/completions`

**Authentication**: API key in `Authorization` header

**Request**:
```json
{
  "model": "openai/gpt-4-turbo-preview",
  "messages": [
    { "role": "system", "content": "Analysis prompt" },
    { "role": "user", "content": "Subreddit data to analyze" }
  ]
}
```

**Response**:
```json
{
  "choices": [
    {
      "message": {
        "content": "AI analysis result"
      }
    }
  ]
}
```

## Data Models

### Data Model Relationship Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                        Database Models                             │
└──┬────────────────────┬────────────────────────┬──────────────────┘
   │                    │                        │
┌──▼────────┐     ┌─────▼──────┐          ┌──────▼─────┐
│           │     │            │          │            │
│ Profile   │     │ Project    │          │ Subreddit  │
│           │     │            │          │            │
└──┬────────┘     └─────┬──────┘          └──────┬─────┘
   │                    │                        │
   │                    │                        │
┌──▼────────┐     ┌─────▼──────┐          ┌──────▼─────┐
│           │     │            │          │            │
│ Reddit    │     │ Project    │          │ Feature    │
│ Account   │     │ Member     │          │ Access     │
│           │     │            │          │            │
└───────────┘     └────────────┘          └────────────┘
```

### User Profile

```typescript
interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  full_name: string | null;
}
```

### Subreddit

```typescript
interface Subreddit {
  id: string;
  name: string;
  subscriber_count: number;
  active_users: number;
  marketing_friendly_score: number;
  posting_requirements: {
    restrictions: string[];
    bestTimes: string[];
  };
  posting_frequency: {
    frequency: string;
    recommendedTypes: string[];
  };
  allowed_content: string[];
  best_practices: string[];
  rules_summary: string | null;
  title_template: string | null;
  last_analyzed_at: string;
  created_at: string;
  updated_at: string;
}
```

### Project

```typescript
interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  project_subreddits?: {
    id: string;
    project_id: string;
    subreddit_id: string;
    subreddits?: Subreddit;
  }[];
}
```

### Feature Access

```typescript
// Feature Key Definitions
export type FeatureKey = string;

export const FEATURE_KEYS = {
  ANALYZE_SUBREDDIT: 'analyze_subreddit',
  ANALYZE_UNLIMITED: 'analyze_unlimited',
  CREATE_PROJECT: 'create_project',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_DATA: 'export_data',
  TEAM_COLLABORATION: 'team_collaboration',
  CUSTOM_TRACKING: 'custom_tracking',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_ACCOUNT: 'dedicated_account',
};

// Subscription tier types (for future implementation)
export type SubscriptionTier = 'starter' | 'creator' | 'pro' | 'agency' | 'free';

// Feature access helper
interface FeatureAccessChecker {
  hasAccess: (featureKey: FeatureKey) => boolean;
  tier: string;
  checkUsageLimit: (metric: string, currentUsage: number) => boolean;
}
```

## Error Handling

All API responses include proper error handling:

```typescript
try {
  // API operation
} catch (error) {
  console.error('API error:', error);
  
  return {
    error: {
      message: error.message || 'An unexpected error occurred',
      status: error.status || 500,
      code: error.code
    }
  };
}
```

## Security Considerations

- All API routes verify authentication
- Row-Level Security enforces data access rules
- Sensitive operations include additional verification
- Rate limiting prevents abuse
- Input validation prevents injection attacks

## Feature-Specific APIs

Refer to the individual feature documentation for detailed API endpoints related to specific features:

- [Subreddit Analysis](./features/subreddit-analysis.md#api-flow)
- [Project Management](./features/project-management.md#data-flow)
- [Reddit Integration](./features/reddit-integration.md#reddit-api-integration)

Note: The subscription system has been removed and replaced with a simplified feature access system that grants all users access to all features.