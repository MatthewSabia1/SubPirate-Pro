# Campaigns Feature Setup

This document provides step-by-step instructions for setting up the Campaigns feature in your SubPirate development environment.

## Database Setup

The Campaigns feature requires several new database tables and storage buckets to be set up in your Supabase project.

### Run Database Migrations

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor section
3. Execute the SQL from the `migrations/campaigns_feature.sql` file

You can either:
- Copy and paste the migration content into the SQL Editor
- Upload and run the SQL file

The migration will create the following tables:
- `campaigns` - Stores campaign information
- `campaign_posts` - Stores scheduled post information
- `media_items` - Stores metadata for uploaded media

### Create Storage Bucket

1. In your Supabase dashboard, go to the Storage section
2. Create a new bucket called `campaign-media`
3. Set the following bucket policies:

#### Public Read Access
```sql
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-media');
```

#### User-specific Insert Access
```sql
CREATE POLICY "User Insert Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-media' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);
```

#### User-specific Update & Delete Access
```sql
CREATE POLICY "User Update Delete Access"
ON storage.objects FOR UPDATE, DELETE
USING (
  bucket_id = 'campaign-media' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);
```

## Feature Access Configuration

The Campaigns feature is access-controlled based on subscription tiers. Ensure your feature access controls are set up correctly:

1. Basic tier users have no access to campaign features
2. Starter tier users can create 1 campaign with up to 20 posts/month
3. Creator tier users can create 3 campaigns with up to 100 posts/month
4. Pro tier users can create 10 campaigns with up to 500 posts/month and AI optimization
5. Agency tier users have unlimited access to all campaign features

## Verify Setup

After completing the setup, you can verify that everything is working correctly:

1. Navigate to the Campaigns page
2. You should see the campaign dashboard with no error messages
3. Try creating a new campaign
4. Try uploading a test image to the Media Library

If you encounter any issues, check the browser console for specific error messages.

## Troubleshooting

### Common Issues

#### 404 Not Found Errors
- Make sure you've run the database migration script correctly
- Check that the table names match what's expected in the code

#### Storage Bucket Errors
- Verify that the `campaign-media` bucket exists
- Check that the bucket policies are set correctly

#### Media Upload Issues
- Check your browser console for specific error messages
- Verify that your Supabase storage is configured correctly