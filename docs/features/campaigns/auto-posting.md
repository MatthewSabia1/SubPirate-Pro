# Auto-Posting Feature

The auto-posting feature is the core of SubPirate's campaign management system. It allows for scheduled, recurring, and AI-optimized posts to Reddit.

## Overview

Auto-posting works through a dedicated scheduler service that runs independently of the main application. This service monitors the database for scheduled posts, handles the actual posting to Reddit, and manages recurring post scheduling.

## Setup

1. Make sure your Reddit application has the necessary permissions:
   - `submit` scope for posting content
   - `read` scope for reading subreddit information

2. Connect at least one Reddit account in the application:
   - OAuth authentication is required
   - Account must have sufficient karma to post in target subreddits

3. Start the scheduler service:
   ```bash
   npm run campaigns:run
   ```

## Features

### One-Time Posting

Schedule posts for specific dates and times:

1. Create a campaign with `schedule_type: 'one-time'`
2. Create posts within the campaign specifying:
   - Subreddit
   - Reddit account
   - Content (text, link, or image)
   - Title
   - Scheduled time

### Recurring Posting

Automatically repeat posts at regular intervals:

1. Create a campaign with `schedule_type: 'recurring'`
2. Specify the interval in hours for each post
3. The system will automatically create new post entries after successful posting

### AI-Optimized Posting

Let AI determine the best time to post:

1. Create a campaign with `schedule_type: 'ai-optimized'`
2. Enable `use_ai_timing` on your posts
3. The system will analyze subreddit data to determine optimal posting times

### AI Title Generation

Automatically generate engaging titles:

1. Enable `use_ai_title` on your posts
2. The AI will generate titles based on:
   - Subreddit analysis
   - Content type and summary
   - Popular post patterns

## How It Works

### Scheduler Process

1. Checks the database every minute for due posts
2. Updates post status to 'processing'
3. Refreshes OAuth tokens if needed
4. Submits post to Reddit using the account's credentials
5. Updates post status to 'posted' or 'failed'
6. For recurring posts, schedules the next occurrence

### Error Handling

The system includes robust error handling:

1. Token refresh failures are logged and posts are marked as failed
2. Reddit API errors are captured with detailed information
3. All errors are logged to both console and log files
4. Failed posts can be retried manually

### Monitoring

The scheduler provides:

1. Real-time logs in the console
2. Daily log files in the `logs/` directory
3. API endpoints for checking scheduler status
4. Campaign activity tracking in the database

## API Usage

### Manually Trigger Processing

```bash
curl -X POST http://localhost:4242/api/campaigns/process
```

### Check Upcoming Scheduled Posts

```bash
curl http://localhost:4242/api/campaigns/scheduled
```

### Health Check

```bash
curl http://localhost:4242/health
```

## Reddit API Considerations

1. **Rate Limits**: The scheduler respects Reddit's rate limits
2. **Token Refresh**: OAuth tokens are automatically refreshed
3. **User-Agent**: Custom user-agent follows Reddit's guidelines
4. **Error Handling**: Specific handling for common Reddit API errors

## Tips for Successful Auto-Posting

1. Ensure Reddit accounts have sufficient karma for target subreddits
2. Test with friendly subreddits first
3. Start with text posts before trying link/image posts
4. Monitor campaign analytics to refine your strategy
5. Use AI timing optimization for maximum engagement
