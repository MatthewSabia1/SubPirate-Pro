# Campaign Management Feature

The Campaign Management feature allows users to create, schedule, and automate posts to Reddit. This document provides an overview of the feature, setup instructions, and usage guidelines.

## Key Features

- **Campaign Creation**: Create and manage multiple campaigns
- **Post Scheduling**: Schedule one-time or recurring posts
- **AI-Optimized Posting**: Use AI to determine the best time to post
- **AI Title Generation**: Generate engaging titles optimized for specific subreddits
- **Media Library**: Upload and manage media for posts
- **Tagging System**: Organize media with customizable tags
- **Analytics**: Track post performance and engagement

## Production Setup

### 1. Database Setup

Run the following command to set up the necessary database extensions and tables:

```bash
npm run campaigns:setup
```

This will:
1. Set up database extensions and functions (`campaigns:db-setup`)
2. Create the campaign_activity table for tracking (`campaigns:migrate`)
3. Add missing columns to the campaign_posts table
4. Set up proper indices and RLS policies
5. Start the campaign scheduler service (`campaigns:run`)

If you only need to run the migrations without starting the scheduler:

```bash
npm run campaigns:db-setup && npm run campaigns:migrate
```

### 2. Running the Scheduler

#### Development Mode

```bash
npm run dev:campaigns
```

This runs both the Vite dev server and the campaign scheduler.

#### Production Mode

```bash
npm run campaigns:run
```

Or use a process manager like PM2:

```bash
pm2 start webhook-server.js --name "campaign-scheduler"
```

### 3. Environment Variables

Make sure the following environment variables are set:

```
# Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key (for migrations)

# Reddit API (required for posting)
VITE_REDDIT_APP_ID=your_reddit_client_id
VITE_REDDIT_APP_SECRET=your_reddit_client_secret

# Optional Sentry Error Tracking
SENTRY_DSN=your_sentry_dsn

# Server Configuration
NODE_ENV=production
WEBHOOK_SERVER_PORT=4242
```

## Scheduler Architecture

The campaign scheduler runs as a separate Node.js process and:

1. Checks for scheduled posts every minute
2. Processes posts due for execution
3. Handles OAuth token refreshing
4. Manages recurring post scheduling
5. Updates post status and logs activity

All operations are logged both to console and to daily log files in the `logs/` directory.

## AI Features

The campaign feature includes two AI-powered capabilities:

1. **AI Title Generation**: Automatically generates engaging titles for posts based on:
   - Subreddit analysis data
   - Content type and summary
   - Popular topics and patterns in the subreddit

2. **AI Timing Optimization**: Determines the optimal time to post based on:
   - Subreddit activity analysis
   - Historical engagement data
   - Marketing friendliness scores

Both features can be toggled on/off at the individual post level.

## API Endpoints

The scheduler includes the following API endpoints:

- **GET /health**: Server health check
- **GET /api/test**: API status check
- **POST /api/campaigns/process**: Manually trigger scheduler
- **GET /api/campaigns/scheduled**: View upcoming scheduled posts
- **GET /api/campaigns/stats**: Get campaign statistics (authenticated)

## Analytics

Campaign performance analytics are available through:

1. **campaign_activity table**: Records all campaign events
2. **campaign_metrics view**: Provides aggregated statistics
3. **campaign_posts**: Individual post execution details

## Troubleshooting

### Common Issues

1. **Posts not executing**: Check Reddit credentials and token refresh
2. **AI feature errors**: Check logs for specific error messages
3. **Database errors**: Ensure migrations have been run

### Logs

Check the logs in the `logs/` directory for detailed error information:

```bash
tail -f logs/access-YYYY-MM-DD.log
```

### Manual Triggers

You can manually trigger the scheduler through the API:

```bash
curl -X POST http://localhost:4242/api/campaigns/process
```

## Security Considerations

The scheduler implements:

- Rate limiting
- CORS protection
- Helmet security headers
- Authentication for sensitive endpoints
- Proper error handling

## Production Monitoring

For production deployments:

1. Set up Sentry error tracking using SENTRY_DSN
2. Monitor server resources (RAM, CPU)
3. Set up alerts for scheduler failures
4. Regularly check logs for warning patterns

## Database Structure

Key tables:

- **campaigns**: Campaign definitions
- **campaign_posts**: Individual post records
- **campaign_activity**: Activity tracking
- **media_items**: Stored media files
- **media_tags**: Organization tags

## Contributing

When making changes to the campaign feature:

1. Run tests with `npm run test:campaigns`
2. Follow existing code patterns
3. Ensure RLS policies are maintained
4. Document API changes
