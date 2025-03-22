# SubPirate Campaign Scheduler

This is the production-ready Campaign Scheduler service for SubPirate, which automatically posts content to Reddit according to schedule.

## Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up the database
# Run the SQL in migrations/production_campaign_setup.sql in the Supabase dashboard

# Deploy the scheduler
npm run campaigns:deploy
```

## Features

- Schedule posts to Reddit
- Recurring posting
- AI-optimized posting times
- AI title generation
- Media support (text, links, images)
- Analytics tracking
- Campaign management
- Error handling and logging

## Database Setup

The campaign feature requires several database tables. You can set them up by:

1. Going to the Supabase dashboard
2. Opening the SQL Editor
3. Pasting the contents of `migrations/production_campaign_setup.sql`
4. Running the SQL

## Running in Production

For production environments, use:

```bash
npm run campaigns:deploy
```

This script will:
1. Check required environment variables
2. Create necessary directories
3. Deploy using PM2 (installed automatically if needed)

## API Endpoints

- `GET /health` - Check server health
- `GET /api/test` - Verify API is working
- `POST /api/campaigns/process` - Manually trigger the scheduler
- `GET /api/campaigns/scheduled` - View upcoming scheduled posts
- `GET /api/campaigns/stats` - Get campaign metrics (authenticated)

## Environment Variables

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_SUPABASE_SERVICE_KEY` - Supabase service role key
- `VITE_REDDIT_APP_ID` - Reddit application client ID
- `VITE_REDDIT_APP_SECRET` - Reddit application secret
- `NODE_ENV` - Environment (production/development)
- `WEBHOOK_SERVER_PORT` - Port for the server (default: 4242)
- `SENTRY_DSN` - (Optional) Sentry error tracking DSN
- `FRONTEND_URL` - Your frontend URL for CORS

## Monitoring

Monitor the scheduler with:

```bash
# View logs
pm2 logs campaign-scheduler

# Check status
pm2 status

# Monitor resources
pm2 monit
```

## Troubleshooting

If you encounter issues:

1. Check the logs in the `logs/` directory
2. Verify Reddit API credentials are valid
3. Ensure Supabase connection is working
4. Test OAuth token refresh functionality

## Documentation

For more detailed documentation, see:
- `/docs/features/campaigns/README.md` - Feature overview
- `/docs/features/campaigns/auto-posting.md` - Auto-posting details
- `/docs/features/campaigns/deployment-guide.md` - Deployment guide
- `/docs/features/campaigns/implementation-overview.md` - Technical implementation