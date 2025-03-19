# SubPirate Documentation

Welcome to the SubPirate documentation. This documentation provides a comprehensive overview of the SubPirate application, its features, technical architecture, and implementation details.

## Table of Contents

- [Feature Documentation](#feature-documentation)
- [Technical Architecture](#technical-architecture)
- [UI Component Guide](#ui-component-guide)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)

## System Overview

```
┌───────────────────────────────────────────────────────────────────┐
│                        SubPirate Platform                         │
└───────────────────────────┬───────────────────────────────────────┘
                            │
            ┌───────────────┼───────────────────┐
            │               │                   │
┌───────────▼──────┐ ┌──────▼─────────┐ ┌──────▼──────────┐
│                  │ │                │ │                 │
│  Frontend App    │ │  Backend APIs  │ │ External APIs   │
│  (React + Vite)  │ │  & Services    │ │ (Reddit, AI)    │
│                  │ │                │ │                 │
└──────┬─────┬─────┘ └───────┬────────┘ └────────┬────────┘
       │     │               │                   │
┌──────▼─┐ ┌─▼──────┐ ┌──────▼──────┐    ┌──────▼────────┐
│        │ │        │ │             │    │               │
│ Pages  │ │ Comps  │ │  Database   │    │ Data Sources  │
│        │ │        │ │             │    │               │
└────────┘ └────────┘ └─────────────┘    └───────────────┘
```

## Recent Production Enhancements

SubPirate has been prepared for production with the following critical enhancements:

- **Standardized UI Components**: Consistent button styling, error messages, and success messages
- **Performance Optimization**: Code splitting and bundle size reduction (main bundle from >1MB to ~344KB)
- **Enhanced Error Handling**: Proper TypeScript interfaces and type guards for safer error handling
- **Improved Database Security**: Row-Level Security (RLS) with security definer functions
- **Form Validation**: Standardized validation utility functions for consistent data validation

## Feature Documentation

Detailed documentation for each feature of SubPirate:

- [**Features Overview**](./features/README.md) - Introduction to all features
- [**Subreddit Analysis**](./features/subreddit-analysis.md) - AI-powered subreddit analysis
- [**Project Management**](./features/project-management.md) - Creating and managing marketing projects
- [**Feature Access**](./features/feature-access.md) - Feature management (all features currently available)
- [**Authentication**](./features/authentication.md) - Supabase authentication and session management
- [**Reddit Integration**](./features/reddit-integration.md) - Reddit API and OAuth implementation
- [**Analytics Dashboard**](./features/analytics-dashboard.md) - Data visualization and metrics
- [**Heatmap Feature**](./features/heatmap.md) - Activity visualization across time periods

## Technical Architecture

- [**Technical Architecture**](./technical-architecture.md) - System design and component relationships
- [**API Documentation**](./api-documentation.md) - API endpoints and integration details
- [**UI Component Guide**](./ui-component-guide.md) - Standardized UI components and usage
- [**RLS Documentation**](../RLS_DOCUMENTATION.md) - Database security implementation

## Database Schema

SubPirate uses Supabase (PostgreSQL) for data storage with the following main entities:

### Database Entity Relationship Diagram

```
┌───────────────┐      ┌────────────────┐      ┌────────────────┐
│               │      │                │      │                │
│   profiles    │◄────►│reddit_accounts │      │   subreddits   │
│ (users)       │      │                │      │                │
└───┬───────────┘      └────────────────┘      └───┬────────────┘
    │                                              │
    │                                              │
    │                                              │
    │                  ┌────────────────┐          │
    │                  │                │          │
    ├─────────────────►│    projects    │◄─────────┤
    │                  │                │          │
    │                  └───┬────────────┘          │
    │                      │                       │
    │                      │                       │
    │                      │                       │
┌───▼──────────┐   ┌──────▼───────────┐    ┌──────▼──────────┐
│              │   │                  │    │                 │
│feature_usage │   │  project_members │    │project_subreddits│
│              │   │                  │    │                 │
└──────────────┘   └──────────────────┘    └─────────────────┘
```

### Key Entities and Table Descriptions

- **Users & Authentication**
  - `profiles` - User profile information
  - `reddit_accounts` - Connected Reddit accounts

- **Content**
  - `subreddits` - Analyzed subreddit data
  - `saved_subreddits` - User-saved subreddits

- **Projects**
  - `projects` - Marketing campaign projects
  - `project_members` - Project collaborators
  - `project_subreddits` - Subreddits within projects

- **Features**
  - `product_features` - Features available to users
  - `feature_usage` - Tracking usage of limited features

- **Analytics**
  - Various analytics tables for tracking metrics

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Reddit Developer account (for API access)
- OpenRouter API key (for AI analysis)

### Development Setup

1. Clone the repository:
   ```
   git clone https://github.com/your-org/subpirate.git
   cd subpirate
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_REDDIT_APP_ID=your_reddit_client_id
   VITE_REDDIT_APP_SECRET=your_reddit_client_secret
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. For backend server, run:
   ```
   npm run server
   ```

### Building for Production

```bash
# Run type checking and build
npm run build

# Preview production build
npm run preview
```

## Deployment

SubPirate is deployed on Vercel:

1. Connect your GitHub repository to Vercel
2. Set up environment variables
3. Deploy

## Contributing

When contributing to SubPirate:

1. Follow the established code style
2. Add tests for new features
3. Ensure all tests pass with `npm run test`
4. Update documentation for any changes
5. Properly handle errors using type-safe interfaces
6. Follow the UI Component Guide for consistent styling

## Support

For questions or issues, please contact the development team or refer to the internal knowledge base.