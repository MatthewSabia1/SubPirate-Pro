# Campaigns Feature

Campaigns is an automated Reddit posting feature that allows users to schedule and publish content to Reddit using their connected Reddit accounts. This feature enables strategic posting through manual scheduling, recurring intervals, or AI-optimized timing based on subreddit analysis data.

## Key Features

### Campaign Management
- Create, edit, and manage posting campaigns with custom names and descriptions
- Track campaign status (active/inactive) and performance
- View scheduled posts for each campaign
- Delete campaigns that are no longer needed

### Post Scheduling
- **One-time Scheduling**: Schedule posts for specific dates and times
- **Recurring Scheduling**: Automatically post at regular intervals (e.g., every 24, 48, 72 hours)
- **AI-optimized Timing**: Use SubPirate's subreddit analysis data to determine the best posting times for maximum engagement

### Content Creation
- Support for text, link, and image posts
- Manual title creation or AI-assisted title generation
- Media library for storing and managing images for posts
- Random media selection from library (for campaigns with multiple posts)

### Media Library
- Complete media asset management system with multiple view options (grid, list, table)
- Advanced search and filtering tools for organizing media
- Bulk selection and operations for efficient media management
- Interactive previews with detailed information and quick actions
- Secure image uploads to Supabase storage with progress tracking
- Seamless integration with campaign post creation

For detailed information about the Media Library, see [Media Library Documentation](./campaigns/media-library.md).

## User Flow

1. **Creating a Campaign**
   - Navigate to the Campaigns page
   - Click "Create Campaign"
   - Set a name, description, and schedule type (one-time, recurring, AI-optimized)
   - Activate or deactivate the campaign

2. **Scheduling Posts**
   - From a campaign's detail page, click "Create Post"
   - Select a Reddit account and target subreddit
   - Choose content type (text, link, or image)
   - Set a post title or enable AI title generation
   - Configure scheduling (specific time or AI-optimized)
   - For recurring posts, set the interval

3. **Managing Media**
   - Access the Media Library from the sidebar, Campaigns page, or Campaign detail page
   - Upload images for use in campaigns (JPG, PNG, GIF, WebP up to 5MB)
   - Browse, search, and filter media using different view modes (grid, list, table)
   - Select one or multiple media items for bulk operations
   - View detailed information and manage media through the interactive interface

## Technical Implementation

### Database Schema
- `campaigns` table: Stores campaign details (name, description, schedule type, active status)
  - Fields: id, user_id, name, description, created_at, is_active, schedule_type
  - RLS policies ensure users can only access their own campaigns

- `campaign_posts` table: Stores posts associated with campaigns (content, scheduling, status)
  - Fields: id, campaign_id, reddit_account_id, media_item_id, subreddit_id, title, content_type, content, status, scheduled_for, posted_at, reddit_post_id, interval_hours, use_ai_title, use_ai_timing, created_at
  - Status values: 'scheduled', 'processing', 'posted', 'failed'
  - RLS policies ensure users can only access posts in their campaigns

- `media_items` table: Stores uploaded media metadata (filename, URL, file size, type)
  - Fields: id, user_id, filename, storage_path, media_type, file_size, uploaded_at, url
  - RLS policies ensure users can only access their own media

### Core Services

#### CampaignAPI (`src/features/campaigns/lib/api.ts`)
- Provides CRUD operations for campaigns, posts, and media items
- Handles Supabase database interactions with proper error handling
- Automatically sets user_id on all records to enforce RLS policies
- Functions include:
  - `getCampaigns()`: Get all campaigns for the current user
  - `getCampaignById(id)`: Get campaign details with all associated posts
  - `createCampaign(campaign)`: Create a new campaign with proper user_id
  - `updateCampaign(id, updates)`: Update campaign details
  - `deleteCampaign(id)`: Delete a campaign and all its posts
  - `getCampaignPosts(campaignId)`: Get all posts for a campaign
  - `createCampaignPost(post)`: Schedule a new post
  - `updateCampaignPost(id, updates)`: Update post details
  - `deleteCampaignPost(id)`: Delete a scheduled post
  - `getMediaItems()`: Get all media items for the current user
  - `uploadMedia(file)`: Upload a media file to Supabase storage
  - `deleteMedia(id)`: Delete a media item and its file from storage
  - `bulkDeleteMedia(ids)`: Delete multiple media items at once

#### CampaignScheduler (`src/features/campaigns/services/scheduler.ts`)
- Background service that checks for scheduled posts and executes them
- Runs on a Node.js webhook server that checks for posts to execute every minute
- Handles recurring post creation for interval-based campaigns
- Updates post status (scheduled → processing → posted/failed)
- Key methods:
  - `startScheduler()`: Initializes the scheduler to run every minute
  - `checkScheduledPosts()`: Looks for posts due to be published
  - `executePost(post)`: Processes a post and submits it to Reddit
  - `scheduleNextRecurringPost(post)`: Creates the next post in a recurring sequence
- Handles Reddit OAuth token refresh automatically

#### RedditPostingService (`src/features/campaigns/services/reddit.ts`)
- Handles the actual posting to Reddit using OAuth tokens
- Supports text, link, and image post types
- Maps content types to Reddit API parameters
- Handles token refresh for Reddit authentication
- Key methods:
  - `submitPost(post, accountDetails, subredditName)`: Posts to Reddit using the appropriate content type
  - `mapContentTypeToRedditKind(contentType)`: Maps our content types to Reddit API kinds
  - `sendToRedditApi(params, accessToken)`: Handles the actual API request to Reddit
  - `getOptimalPostingTime(subredditId)`: Determines best time to post (AI placeholder)
  - `generateAiTitle(subredditId, contentSummary)`: Generates optimized titles (AI placeholder)

#### MediaLibraryService
- Enhanced media management service with advanced features
- Provides filtering, sorting, and search capabilities
- Handles bulk operations for multiple media items
- Manages view state and selection mode
- Ensures proper error handling and user feedback
- Features automatic bucket creation and policy setup

### Webhook Server (`webhook-server.js`)
- Express.js server that runs the campaign scheduler
- Provides API endpoints for manual trigger and testing
- Handles graceful shutdown for production environments
- Implements environment variable checks and management
- Key endpoints:
  - `GET /api/test`: Test endpoint to verify server is running
  - `POST /api/campaigns/process`: Manually trigger campaign processing

### User Interface Components
- `CampaignsPage`: Main dashboard with campaign statistics and listing
- `CampaignList`: Grid or list view of all campaigns
- `CampaignDetail`: Individual campaign view with posts and scheduling
- `CreateCampaignModal`: Form to create new campaigns
- `PostList`: List of scheduled and posted content
- `CreatePostModal`: Form to schedule new posts (text, link, image)
- `MediaLibrary`: Enhanced interface for browsing and managing media with multiple views
  - `GridView`: Visual thumbnail grid for media browsing
  - `ListView`: Compact list format with essential details
  - `TableView`: Detailed tabular view with all properties
  - `FilterPanel`: Advanced filtering and sorting options
  - `MediaPreviewModal`: Detailed media viewer with actions

## Security Considerations

- Reddit API tokens are securely stored in the database
- Token refresh mechanism automatically updates expired tokens
- Row-level security policies ensure users can only access their own campaigns, posts, and media:
  - All tables have proper RLS policies for SELECT, INSERT, UPDATE, DELETE
  - Each operation verifies the user has proper ownership before allowing access
  - Campaign posts are linked to campaigns, which are linked to users
- Input validation for all user-provided content
- Media uploads are restricted to safe image types
- Storage bucket has proper permissions for authenticated users
- Error handling provides limited information to prevent security leaks

## Running the Scheduler

The campaign scheduler runs as a separate Node.js process that executes scheduled posts. To run it:

1. Ensure the database migration has been applied: `/migrations/campaigns_feature.sql`
2. Set up the 'campaign-media' storage bucket in Supabase (see [Storage Setup](./campaigns/storage-setup.md))
3. Set the required environment variables:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
   - `VITE_REDDIT_APP_ID`: Your Reddit OAuth app client ID
   - `VITE_REDDIT_APP_SECRET`: Your Reddit OAuth app client secret
4. Run the scheduler in development mode:
   ```
   npm run dev:campaigns
   ```
5. For production, run the scheduler as a standalone process:
   ```
   npm run campaigns:scheduler
   ```

The scheduler can also be manually triggered via an API endpoint:
```
POST http://localhost:4242/api/campaigns/process
```

For detailed setup instructions, see the [Scheduler Setup Guide](./campaigns/scheduler-setup.md).

## Storage Setup

The Campaigns feature requires a Supabase storage bucket for media uploads:

1. A bucket named `campaign-media` is created automatically on first use by the media upload service
2. If you encounter storage access issues, see [Storage Setup Guide](./campaigns/storage-setup.md)
3. The storage bucket must have appropriate RLS policies for authenticated users
4. Media uploads are limited to images (JPG, PNG, GIF, WebP) up to 5MB in size

For detailed information about the Media Library interface and features, see [Media Library Documentation](./campaigns/media-library.md).

## Error Handling

The Campaigns feature implements comprehensive error handling:

1. **Database Errors**:
   - RLS policy violations are detected and provide specific error messages
   - Missing tables or schema issues are reported with actionable instructions
   - Connection issues are handled gracefully

2. **Storage Errors**:
   - Automatic bucket creation with fallback error handling
   - File upload failures are reported with detailed error messages
   - Storage permission issues are detected and reported

3. **Reddit API Errors**:
   - Authentication failures are handled with detailed logging
   - Rate limiting and other API errors are properly reported
   - Token refresh failures trigger specific error handling

4. **Scheduler Errors**:
   - Post execution failures are logged and marked in the database
   - Individual post failures don't stop the entire scheduler
   - System-level errors are caught and logged

## Feature Access Tiers

| Tier | Campaigns | Posts/Month | AI Optimization | Media Storage |
|------|-----------|-------------|----------------|---------------|
| Free | 0 | 0 | No | 0 MB |
| Starter | 1 | 20 | No | 100 MB |
| Creator | 3 | 100 | No | 500 MB |
| Pro | 10 | 500 | Yes | 1 GB |
| Agency | Unlimited | Unlimited | Yes | 5 GB |

## API Structure

The feature uses a layered architecture:

1. **Database Layer**: SQL migrations and Supabase tables
2. **API Layer**: TypeScript functions for CRUD operations
3. **Service Layer**: Business logic for Reddit posting and scheduling
4. **UI Layer**: React components for user interaction

## Integration with Reddit API

The Reddit API integration includes:

1. **Authentication**:
   - OAuth 2.0 flow for user authorization
   - Automatic token refresh mechanism
   - Secure token storage

2. **Post Types**:
   - Text posts (self posts)
   - Link posts with URLs
   - Image posts with media uploads

3. **API Mapping**:
   - Content types mapped to Reddit API parameters
   - Form data properly formatted for Reddit's requirements
   - Response handling with proper error detection

## Testing Guidelines

To test the campaigns feature:

1. **Prerequisites**:
   - Valid Reddit API credentials (Client ID and Secret)
   - At least one connected Reddit account with proper OAuth scope
   - Supabase project with campaigns_feature.sql migration applied
   - Storage bucket created and configured

2. **Test Cases**:
   - Campaign creation and management
   - Post scheduling with different content types
   - Media upload and management
   - Recurring post scheduling
   - Token refresh mechanism
   - Error handling and recovery

3. **Test Steps**:
   - Create a test campaign
   - Upload test media
   - Schedule posts with different content types
   - Verify posts appear on Reddit at scheduled times
   - Test recurring post feature with short intervals
   - Verify token refresh works with expired tokens

## Related Documentation

For more detailed information on specific aspects of the Campaigns feature, see:

- [Storage Setup Guide](./campaigns/storage-setup.md) - Instructions for configuring Supabase storage
- [Scheduler Setup Guide](./campaigns/scheduler-setup.md) - Guide to running and monitoring the scheduler
- [AI Features Guide](./campaigns/ai-features.md) - Implementation details for AI-powered features

## Future Enhancements

1. **Campaign Templates**: Save and reuse campaign configurations
2. **Advanced Analytics**: Detailed performance tracking for posts
3. **A/B Testing**: Test different post titles and content
4. **Auto-content Generation**: AI-generated post content based on subreddit analysis
5. **Real AI Integration**: Replace placeholder AI functions with actual AI services
6. **Bulk Scheduling**: Schedule multiple posts at once
7. **Enhanced Media Management**: Tags, categories, and search for media items
8. **Failure Recovery**: Automatic retry mechanism for failed posts
9. **Advanced Timing**: Day-of-week and time-of-day optimization
10. **Calendar View**: Visual calendar interface for scheduled posts