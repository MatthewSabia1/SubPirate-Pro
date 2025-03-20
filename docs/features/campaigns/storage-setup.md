# Campaign Media Storage Setup

This document provides instructions for setting up and troubleshooting the Supabase Storage bucket for the Campaigns feature's media uploads.

## Media Library Integration

The Media Library provides a user-friendly interface for managing files stored in the Supabase bucket. For detailed information about the Media Library's features and usage, see the [Media Library Documentation](./media-library.md).

Key features that rely on proper storage setup include:
- Multiple view modes (grid, list, table) for browsing media assets
- Bulk selection and operations for managing multiple files at once
- File filtering and sorting capabilities
- Interactive previews and quick actions

## Automatic Bucket Setup

The application attempts to create and configure the required storage bucket automatically when the first media upload occurs. This process includes:

1. Checking if the 'campaign-media' bucket exists
2. Creating the bucket if it doesn't exist
3. Setting the bucket to public
4. Attempting to create necessary storage RLS policies

While this automatic setup works in many cases, you may need to perform manual configuration if:
- Your Supabase project has restricted permissions
- The automatic policy creation fails
- You encounter permission errors during media uploads

## Manual Bucket Creation

If you need to set up the bucket manually:

1. Log in to your Supabase dashboard
2. Go to Storage → Buckets
3. Click "Create Bucket"
4. Set bucket name to `campaign-media`
5. Check "Public bucket" to allow public access to files
6. Under "Advanced Options" set:
   - File size limit: 5 MB (5242880 bytes)
   - Allowed MIME types: `image/jpeg,image/png,image/gif,image/webp`

## Storage RLS Policies

You must set appropriate RLS (Row-Level Security) policies for the storage bucket to allow authenticated users to upload and manage their media files. Here are the required policies:

1. For file uploads (INSERT):
```sql
CREATE POLICY "Authenticated users can upload" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'campaign-media');
```

2. For file updates (UPDATE):
```sql
CREATE POLICY "Authenticated users can update own media" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (bucket_id = 'campaign-media' AND owner = auth.uid());
```

3. For file viewing (SELECT):
```sql
CREATE POLICY "Media is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'campaign-media');
```

4. For file deletion (DELETE):
```sql
CREATE POLICY "Authenticated users can delete own media" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (bucket_id = 'campaign-media' AND owner = auth.uid());
```

To apply these policies, go to your Supabase dashboard:
1. Go to Storage → Policies
2. Select the 'campaign-media' bucket
3. Click "Add Policy" for each of the policy types above
4. Copy and paste the corresponding SQL statement
5. Click "Review" and then "Save Policy"

## Database Integration

The media upload process involves two key components:

1. **File Storage**: Uploading the actual file to Supabase Storage
2. **Database Record**: Creating a record in the `media_items` table

Both operations must succeed for the media upload to be considered successful. The application handles this by:

1. Uploading the file to storage first
2. Creating the database record with the file's metadata and URL
3. If the database record creation fails, the uploaded file is deleted from storage

## Bulk Operations

The Media Library allows selecting and managing multiple files at once, which requires special handling:

1. **Bulk Deletion**:
   - Deletes multiple files from storage in sequence
   - Removes corresponding database records
   - Handles failures for individual items without affecting others
   - Provides progress feedback during the operation

2. **Bulk Selection**:
   - Allows selecting multiple files using checkboxes
   - Maintains selection state across filter changes
   - Provides select all/deselect all functionality

To support these operations, the storage bucket must have proper DELETE policies for authenticated users, and the database must support transaction handling for multiple operations.

## Troubleshooting Media Uploads

If you encounter issues with media uploads, check the following:

1. **Bucket Existence and Configuration**:
   - Ensure the `campaign-media` bucket exists
   - Verify that the bucket is set to public (if your files need to be publicly accessible)
   - Check that appropriate RLS policies are in place

2. **Database Table and Policies**:
   - Verify that the `media_items` table is created correctly
   - Check that the RLS policies on the table allow authenticated users to insert records
   - Ensure the user_id field is being set correctly in the application code

3. **Authentication**:
   - Verify that your user is properly authenticated when uploading
   - Check that the authentication token has not expired

4. **File Validation**:
   - Ensure the file being uploaded is of an allowed type (JPG, PNG, GIF, WebP)
   - Verify the file size is under the 5MB limit

### Common Error Messages

- **"Bucket not found"**: The `campaign-media` bucket doesn't exist. Create it manually using the steps above.
- **"new row violates row-level security policy"**: RLS policy preventing database insert. Check that user_id is being set correctly.
- **"Unauthorized"**: User doesn't have permission to upload to the bucket. Check RLS policies.
- **"Entity too large"**: File exceeds size limit. Ensure file is under 5MB.
- **"Cannot read property 'id' of null"**: User authentication issue. Ensure user is logged in.

## Debugging Storage Issues

If you need to debug storage issues:

1. **Check Browser Network Tab**:
   - Open browser devtools (F12) and go to the Network tab
   - Attempt the upload and look for failed requests
   - Examine the response for error details

2. **Check Browser Console**:
   - Look for error messages in the console log
   - The application logs detailed information about storage operations

3. **Check Supabase Logs**:
   - Go to your Supabase dashboard
   - Navigate to Database → API → Logs
   - Filter logs by 'storage' to see storage-related operations

4. **Check Storage Explorer**:
   - Go to Storage → Buckets → campaign-media
   - Browse files to see if they're being uploaded correctly
   - Check file permissions using the interface

## Storage Structure

Media files are stored with the following structure:

- Bucket: `campaign-media`
- Path: `media/{uuid}.{extension}`

File paths are generated using a UUID to ensure uniqueness, and the original file extension is preserved.

## Using Media Files in Campaigns

To use media from the Media Library in campaign posts:

1. When creating a post, select "Image" as the content type
2. The Media Library selection interface will appear
3. Browse, search, or filter to find the desired media
4. Select the media item to include in your post
5. The media's URL will be automatically included in the post content

When publishing to Reddit, the system will:
1. Use the public URL of the selected media
2. Ensure the media is accessible to Reddit's servers
3. Format the post appropriately for image submission

## Security Best Practices

1. **Always set user_id**: Always include the authenticated user's ID when creating media records
2. **Validate file types**: Only allow approved image formats
3. **Limit file sizes**: Keep uploads under the 5MB limit
4. **Use unique filenames**: Always generate unique filenames to prevent collisions
5. **Clean up orphaned files**: Delete files from storage if database record creation fails
6. **Handle bulk operations safely**: Implement safeguards for bulk deletion operations

## Testing Media Uploads

To effectively test the media upload functionality:

1. **Image Types**: Test all supported image formats (JPG, PNG, GIF, WebP)
2. **File Sizes**: Test files at various sizes, including files near the 5MB limit
3. **Image Properties**: Test various dimensions and color depths
4. **Error Handling**: Deliberately test with invalid files to verify error handling
5. **Storage URL Consistency**: Verify URLs work consistently across environments
6. **Bulk Operations**: Test selecting and managing multiple files at once

## Maintenance and Monitoring

Regular maintenance tasks for the media storage system:

1. **Storage Cleanup**: Periodically remove orphaned files not linked to media_items
2. **Space Monitoring**: Monitor total storage usage as media accumulates
3. **Access Logs**: Review storage access logs for unusual patterns
4. **Purge Old Files**: Set up policies for removing old, unused media
5. **Backup**: Ensure your storage backup policies include the media bucket
6. **Quota Management**: Track usage against tier limits and notify users approaching their quota