# Campaign Auto-Posting Implementation Overview

This document provides a summary of the implementation for the Campaign auto-posting feature, highlighting the key components and recent improvements for production readiness.

## Core Components

### 1. Scheduler Service (`webhook-server.js`)
- Dedicated Node.js Express server for campaign scheduling
- Runs independently of the main application
- Includes API endpoints for monitoring and manual triggers
- Enhanced with production-ready features:
  - Logging system with daily rotation
  - Health check endpoint
  - CORS and security protections
  - Graceful shutdown handling

### 2. Campaign Scheduler (`scheduler.ts`)
- Core scheduling logic for post execution
- Checks for due posts every minute
- Handles token refresh and authentication
- Manages recurring post scheduling
- Includes robust error handling and logging

### 3. Reddit Posting Service (`reddit.ts`)
- Handles the actual Reddit API interactions
- Supports text, link, and image posts
- AI title generation capability
- AI timing optimization logic
- Error handling for Reddit API responses

### 4. Database Schema (`campaign_activity_tracking.sql`)
- Tables for campaigns, posts, and activity tracking
- Indices for performance optimization
- RLS policies for security
- Analytics views for reporting

## AI Features

### Title Generation
- Uses OpenRouter/LLama AI to generate engaging titles
- Considers:
  - Subreddit context
  - Content type and summary
  - Successful post patterns

### Timing Optimization
- Analyzes subreddit data to determine optimal posting times
- Uses:
  - Activity by hour data
  - Marketing friendliness scores
  - Best time to post recommendations

## Enhancements for Production

### 1. Performance & Reliability
- Concurrency limits for post processing
- Retry mechanisms for failed operations
- Efficient token refresh handling
- Graceful error recovery

### 2. Monitoring & Logging
- Structured logging to files and console
- Activity tracking in database
- Performance metrics (execution time)
- Health check endpoints

### 3. Security & API Design
- Authentication for sensitive endpoints
- Rate limiting for API protection
- CORS configuration
- Request validation

### 4. Error Handling
- Comprehensive error capturing
- Detailed error information in logs and database
- Optional Sentry integration
- User-friendly error responses

## Database Improvements

### New Tables & Columns
- `campaign_activity` table for event tracking
- Additional columns on `campaign_posts`:
  - `processing_started_at` timestamp
  - `execution_time_ms` for performance tracking
  - `last_error` for error information
  - `reddit_permalink` for direct post links
  - `parent_post_id` for tracking recurring relationships

### Analytics View
- `campaign_metrics` view for aggregated statistics
- Includes post counts by status
- Next scheduled post information
- Last posted timestamps

## API Endpoints

The scheduler provides several endpoints:

- `/health` - Server status check
- `/api/test` - API functionality verification
- `/api/campaigns/process` - Manual trigger endpoint
- `/api/campaigns/scheduled` - View upcoming posts
- `/api/campaigns/stats` - Get campaign statistics (authenticated)

## Deployment Considerations

For optimal production deployment:

1. Use a process manager (PM2, systemd)
2. Set up error monitoring with Sentry
3. Configure proper environment variables
4. Use a reverse proxy (nginx, Caddy)
5. Consider containerization for easier deployment
