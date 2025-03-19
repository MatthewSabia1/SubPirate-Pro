# SubPirate Technical Architecture

This document outlines the technical architecture of the SubPirate application, covering its frontend, backend, database, and integration components.

## System Overview

SubPirate is a web application built with:
- React (frontend framework)
- TypeScript (type-safe programming)
- Supabase (database and backend services and authentication)
- Tailwind CSS (UI styling)

## Architecture Diagrams

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Frontend                                 │
│  ┌─────────────┐  ┌─────────────────┐  ┌───────────────────────────┐│
│  │ React UI    │  │ State Management│  │ Feature-specific          ││
│  │ Components  │  │ (Context API)   │  │ Components                ││
│  └─────────────┘  └─────────────────┘  └───────────────────────────┘│
└───────────┬────────────────┬─────────────────────┬─────────────────┘
            │                │                     │
┌───────────▼────┐  ┌────────▼──────┐    ┌─────────▼─────────┐
│  Supabase API  │  │  Reddit API   │    │  AI/Analysis      │
│  Integration   │  │  Integration  │    │  Service          │
└───────────┬────┘  └────────┬──────┘    └─────────┬─────────┘
            │                │                     │
┌───────────▼────────────────▼─────────────────────▼─────────────────┐
│                        External Services                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐         │
│  │   Supabase   │  │  Reddit API  │  │   AI Services     │         │
│  │ DB & Auth    │  │   & OAuth    │  │  (OpenRouter)     │         │
│  └──────────────┘  └──────────────┘  └───────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Container                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Context Providers                         │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐   │  │
│  │  │ AuthProvider│  │FeatureAccess    │  │RedditAccount │   │  │
│  │  │             │  │Provider         │  │Provider      │   │  │
│  │  └─────────────┘  └─────────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Router & Routes                         │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐   │  │
│  │  │ Landing     │  │Dashboard &      │  │Authentication│   │  │
│  │  │ Page        │  │Feature Pages    │  │Pages         │   │  │
│  │  └─────────────┘  └─────────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                  Shared Components                         │  │
│  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────┐   │  │
│  │  │ FeatureGate │  │UI Components    │  │Analysis      │   │  │
│  │  │             │  │(Cards, Buttons) │  │Components    │   │  │
│  │  └─────────────┘  └─────────────────┘  └──────────────┘   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ User          │ -> │ React UI      │ -> │ Context API   │
│ Interaction   │    │ Components    │    │ State         │
└───────┬───────┘    └───────────────┘    └───────┬───────┘
        │                                         │
        v                                         v
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ API Services  │ <- │ Custom Hooks  │ <- │ Effect Hooks  │
│ Client-side   │    │ (Data Access) │    │ (Data Fetch)  │
└───────┬───────┘    └───────────────┘    └───────────────┘
        │
        v
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ External APIs │ -> │ Backend       │ -> │ Supabase      │
│ (Reddit, AI)  │    │ Processing    │    │ Database      │
└───────────────┘    └───────────────┘    └───────────────┘
```

## Frontend Architecture

### React Component Structure

The application follows a component-based architecture:
- **Pages**: Top-level route components (e.g., Dashboard, Projects)
- **Components**: Reusable UI elements
- **Contexts**: Global state providers
- **Hooks**: Custom React hooks for shared logic

### State Management

- **React Context API**: For global app state
  - `AuthContext`: Authentication state
  - `FeatureAccessContext`: Subscription features
  - `RedditAccountContext`: Connected Reddit accounts

- **React Query**: For data fetching, caching, and synchronization
  - API call management
  - Stale data revalidation
  - Optimistic updates

### Routing

React Router provides client-side routing:
- Path-based routes
- Nested routes
- Protected routes with authentication
- Dynamic parameters

## Backend Architecture

### Supabase Integration

Supabase provides:
- PostgreSQL database
- RESTful API endpoints
- Row-Level Security policies
- Real-time subscriptions (when needed)
- Storage for images and assets

### API Services

1. **Reddit API Service**:
   - OAuth authentication
   - Subreddit data fetching
   - Rate limiting and caching
   - Error handling

2. **Feature Access System**:
   - Feature-based access control
   - Free access to all features (Stripe removed)
   - Extensible system for future subscription tiers

3. **Authentication Flow**:
   - Supabase for user authentication
   - JWT token management
   - Session handling
   - Email/password and social login

## Database Architecture

### Supabase Schema

The database is organized into several key tables:

1. **User-related tables**:
   - `profiles`: User profile information
   - `reddit_accounts`: Connected Reddit accounts
   
2. **Feature Access tables**:
   - `product_features`: Features available to users
   - `feature_usage`: Tracking usage of limited features
   
3. **Content-related tables**:
   - `subreddits`: Analyzed subreddit data
   - `saved_subreddits`: User-saved subreddits
   
4. **Project Management tables**:
   - `projects`: User projects
   - `project_members`: Collaborators on projects
   - `project_subreddits`: Subreddits in projects

### Row-Level Security

Supabase RLS policies protect data:
- User-specific data is only accessible to the owner
- Shared resources are accessible to authorized collaborators
- Public data has appropriate read-only policies

## Integration Architecture

### Reddit API Integration

- OAuth 2.0 flow for user authentication
- API client with rate limiting
- Account rotation for high-volume usage
- Advanced image handling system with proxying
- HTML entity decoding for Reddit image URLs
- Multi-tier fallback system for Reddit media
- Caching layer for performance

### Feature Access System

- Feature-based access control
- All features currently available (no payment required)
- Prepared for future implementation of paid tiers

### AI Integration

- API client for AI services
- Prompt engineering for different analysis types
- Response processing and transformation
- Error handling and fallbacks

## Deployment Architecture

- Vite for frontend bundling
- Vercel for hosting and serverless functions
- Supabase for database and backend services
- GitHub integration for CI/CD

## Security Architecture

- JWTs for authentication
- HTTPS for all communications
- Environment variables for secrets
- Row-Level Security for data access control
- Input validation and sanitization
- API rate limiting

## Performance Considerations

- Code splitting for faster load times
- Web Workers for intensive operations
- Caching for API responses
- Optimized database queries
- Lazy loading of components
- Memoization for expensive calculations

## Error Handling Strategy

- Global error boundaries
- Consistent error patterns
- Graceful degradation
- Fallback UIs
- Error logging and monitoring
- Retry mechanisms for transient failures

## Future Architecture Considerations

- Microservices for specific features
- Enhanced AI capabilities
- Mobile application support
- Advanced analytics processing
- Real-time collaboration features
- Internationalization support