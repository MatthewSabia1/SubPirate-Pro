# Campaign Auto-Posting Deployment Guide

This document provides step-by-step instructions for deploying the Campaign auto-posting feature to production.

## Prerequisites

Before deployment, ensure you have:

1. Supabase project with service role key
2. Reddit API credentials (Client ID and Secret)
3. Node.js server environment (v18+ recommended)
4. (Optional) Sentry DSN for error tracking

## Deployment Steps

### 1. Environment Setup

Create a `.env` file with the required variables:

```bash
# Supabase credentials
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_KEY=your_supabase_service_key

# Reddit API credentials
VITE_REDDIT_APP_ID=your_reddit_client_id
VITE_REDDIT_APP_SECRET=your_reddit_client_secret

# Optional monitoring
SENTRY_DSN=your_sentry_dsn

# Server configuration
NODE_ENV=production
WEBHOOK_SERVER_PORT=4242
```

### 2. Database Migration

Run the database migrations to set up the required tables:

```bash
# Verify environment
npm run campaigns:check-env

# Run database setup
npm run campaigns:migrate
```

If the migration fails, you can manually run the SQL statements in the Supabase dashboard:

1. Go to the SQL Editor in your Supabase dashboard
2. Paste the contents of `migrations/campaign_activity_tracking.sql`
3. Execute the SQL

### 3. Start the Scheduler

For development testing:

```bash
npm run campaigns:run
```

For production (using PM2):

```bash
# Install PM2 if not already installed
npm install -g pm2

# Start the scheduler as a managed service
pm2 start webhook-server.js --name "campaign-scheduler"

# Save the PM2 configuration
pm2 save

# Set up to start on system boot
pm2 startup
```

### 4. Verify Deployment

1. Check the scheduler is running:

```bash
curl http://localhost:4242/health
```

2. View upcoming scheduled posts:

```bash
curl http://localhost:4242/api/campaigns/scheduled
```

3. Manually trigger the scheduler:

```bash
curl -X POST http://localhost:4242/api/campaigns/process
```

### 5. Monitoring Setup

For optimal monitoring:

1. Configure log rotation:

```bash
# Install logrotate if not already available
# Create logrotate configuration
sudo nano /etc/logrotate.d/subpirate-campaigns

# Add the following configuration
/path/to/your/app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
}
```

2. Set up Sentry for error tracking (if SENTRY_DSN is configured)

3. Consider setting up basic monitoring with cron:

```bash
# Check every 5 minutes that the service is running
*/5 * * * * curl -s http://localhost:4242/health > /dev/null || systemctl restart campaign-scheduler
```

### 6. Production Hardening

For enhanced security:

1. Move service role key to a secure environment variable or secret manager
2. Set up a reverse proxy (nginx/Apache) with HTTPS
3. Implement proper firewall rules to restrict direct access to the service
4. Use a non-root user to run the service

## Troubleshooting

If you encounter issues:

1. Check the logs in the `logs/` directory
2. Verify Reddit API credentials are valid
3. Ensure Supabase connection is working
4. Test OAuth token refresh functionality

## Maintenance

Regular maintenance tasks:

1. Monitor log files for errors
2. Check for Reddit API changes
3. Update dependencies regularly
4. Back up the database periodically