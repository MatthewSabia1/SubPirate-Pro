# Campaign Scheduler Setup Guide

This document provides instructions for setting up and running the campaign scheduler service, which is responsible for executing scheduled Reddit posts.

## Overview

The campaign scheduler is a Node.js service that:
1. Runs as a separate process from the main application
2. Checks for scheduled posts every minute
3. Executes posts when their scheduled time arrives
4. Handles Reddit API authentication and posting
5. Creates new recurring posts as needed

## Prerequisites

Before running the scheduler, ensure you have:

1. Applied the campaigns database migration (`/migrations/campaigns_feature.sql`)
2. Set up the campaign media storage bucket (see [Storage Setup](./storage-setup.md))
3. Configured Reddit API credentials in your environment variables

## Required Environment Variables

The scheduler requires the following environment variables:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_REDDIT_APP_ID=your-reddit-client-id
VITE_REDDIT_APP_SECRET=your-reddit-client-secret
```

You can set these in a `.env` file in the project root, or configure them in your deployment environment.

### Reddit API Credentials

To obtain Reddit API credentials:

1. Go to https://www.reddit.com/prefs/apps and click "create app" or "create another app"
2. Fill in the required fields:
   - Name: "SubPirate" (or your preferred name)
   - App type: "web app"
   - Description: "Automated posting app for Reddit"
   - About URL: Your website URL
   - Redirect URI: `https://your-domain.com/reddit-oauth-callback` (or http://localhost:5173/reddit-oauth-callback for development)
3. Click "Create app"
4. The "client ID" is the string under the app name
5. The "client secret" is listed as "secret"

These credentials will be used to refresh tokens for connected Reddit accounts.

## Running the Scheduler

### Development Mode

For local development, you can run the scheduler alongside the main Vite development server:

```bash
npm run dev:campaigns
```

This command uses `concurrently` to run both the Vite dev server and the campaign scheduler in the same terminal window.

### Production Mode

For production environments, run the scheduler as a standalone process:

```bash
npm run campaigns:scheduler
```

This command starts only the webhook server with the campaign scheduler active.

### Manual Triggering

You can manually trigger the scheduler to check for posts immediately via an HTTP endpoint:

```
POST http://localhost:4242/api/campaigns/process
```

This is useful for testing or if you need to force execution outside the normal schedule.

## Webhook Server Configuration

The scheduler runs on the webhook server (`webhook-server.js`), which:

1. Listens on port 4242 (configurable)
2. Provides endpoints for the scheduler and other webhooks
3. Handles graceful shutdown for clean process termination

### Server Endpoints

- `GET /api/test`: Test endpoint that returns a status message
- `POST /api/campaigns/process`: Manually trigger the scheduler
- `POST /api/stripe/webhook`: Endpoint for Stripe webhooks (simplified)

## Scheduler Implementation

The scheduler is implemented in two main files:

1. **webhook-server.js**: Express server that starts the scheduler
2. **src/features/campaigns/services/scheduler.ts**: Core scheduler implementation

### Key Components

- **CampaignScheduler.startScheduler()**: Initializes the scheduler and sets up the interval
- **CampaignScheduler.checkScheduledPosts()**: Queries for posts that need to be executed
- **CampaignScheduler.executePost()**: Processes a single post, including token refresh and Reddit submission
- **CampaignScheduler.scheduleNextRecurringPost()**: Creates the next occurrence for recurring posts
- **RedditPostingService**: Handles the actual Reddit API integration

## Monitoring and Logs

The scheduler outputs detailed logs to the console, including:

- Startup information
- Scheduled post execution attempts
- Reddit API responses (with sensitive information redacted)
- Error details for troubleshooting
- Token refresh operations

Monitor these logs to ensure the scheduler is functioning properly.

## Error Handling

The scheduler implements robust error handling:

1. Each post execution is isolated, so failures don't affect other posts
2. Failed posts are marked in the database with status='failed'
3. Reddit API errors are caught and logged with detailed information
4. Token refresh failures are handled gracefully
5. The scheduler continues running even if individual posts fail

## Graceful Shutdown

The scheduler implements graceful shutdown to ensure clean process termination:

1. Listens for SIGTERM and SIGINT signals
2. Clears the scheduler interval to prevent new checks
3. Closes the Express server properly
4. Sets a 5-second timeout for forced shutdown if needed

This ensures the scheduler can be safely stopped and restarted without leaving orphaned processes.

## Scaling Considerations

For high-volume deployments:

1. **Separate Process**: The scheduler should run as a separate process from the web application
2. **Multiple Instances**: For high volumes, consider running multiple instances with sharding
3. **Database Load**: Monitor Supabase database performance if processing many posts
4. **Reddit Rate Limits**: Be aware of Reddit's rate limits (post frequency, API calls)
5. **Token Management**: Ensure proper handling of multiple Reddit account tokens

## Troubleshooting

If you encounter issues with the scheduler:

1. **Check Logs**: Review the console output for error messages
2. **Verify Environment Variables**: Ensure all required variables are set correctly
3. **Check Database Connection**: Verify the Supabase connection is working
4. **Test Reddit Credentials**: Verify your Reddit OAuth credentials work correctly
5. **Check Post Status**: Query the database to see if posts are being marked as processing/posted/failed

### Common Issues

- **Token Refresh Failures**: Often due to invalid or expired Reddit refresh tokens
- **Database Connection Issues**: Check Supabase URL and key
- **Permission Errors**: Check RLS policies on campaign_posts table
- **Scheduling Issues**: Verify the scheduled_for times in the database (timezone issues)
- **Redis "unable to connect"**: Known issue with some Supabase projects, usually can be ignored

## Testing With Real Reddit Accounts

To effectively test the campaigns feature with real Reddit accounts:

1. **Connect a Reddit Account**:
   - Use the Reddit connect feature in the application
   - Grant the necessary permissions during the OAuth flow
   - Verify the account appears in your connected accounts list

2. **Create a Test Subreddit**:
   - Create a private subreddit on Reddit for testing purposes
   - Make sure your connected account has posting permissions
   - Use this subreddit for initial test posts to avoid spam concerns

3. **Test Progression**:
   - Start with simple text posts to verify basic functionality
   - Test link posts next to ensure URL handling works
   - Finally test image posts with uploaded media

4. **Check Reddit's API Usage Policy**:
   - Review https://www.redditinc.com/policies/data-api-terms
   - Ensure your usage complies with their terms
   - Be aware of rate limits (posts per day, API calls)

5. **Testing OAuth Refresh**:
   - After posting several times, check if token refresh is working
   - You can verify this in the scheduler logs

Remember to follow Reddit's content policy and avoid creating spam during testing.