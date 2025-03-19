# Row-Level Security Implementation for SubPirate

This document details the implementation of Row-Level Security (RLS) in SubPirate to ensure proper data isolation between users.

## Overview

Row-Level Security restricts the rows a user can access in a database table based on their identity. We've implemented RLS policies to ensure users can only access:

1. Their own saved subreddits
2. Their own projects
3. Projects they've been invited to as members
4. Their own Reddit accounts and associated data

## Security Definer Functions

To address recursive policy issues and improve security, we've implemented the following security definer functions:

1. `is_project_owner(project_uuid UUID)` - Checks if the current user owns a project
   ```sql
   CREATE OR REPLACE FUNCTION is_project_owner(project_uuid UUID)
   RETURNS BOOLEAN
   SECURITY DEFINER
   AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM projects 
       WHERE id = project_uuid 
       AND user_id = auth.uid()
     );
   END;
   $$ LANGUAGE plpgsql;
   ```

2. `is_project_editor(project_uuid UUID)` - Checks if the current user has editor access
   ```sql
   CREATE OR REPLACE FUNCTION is_project_editor(project_uuid UUID)
   RETURNS BOOLEAN
   SECURITY DEFINER
   AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM project_members 
       WHERE project_id = project_uuid 
       AND user_id = auth.uid() 
       AND role = 'editor'
     );
   END;
   $$ LANGUAGE plpgsql;
   ```

3. `has_project_access(project_uuid UUID)` - Checks if a user has any access to a project
   ```sql
   CREATE OR REPLACE FUNCTION has_project_access(project_uuid UUID)
   RETURNS BOOLEAN
   SECURITY DEFINER
   AS $$
   BEGIN
     RETURN EXISTS (
       SELECT 1 FROM projects 
       WHERE id = project_uuid 
       AND user_id = auth.uid()
     )
     OR EXISTS (
       SELECT 1 FROM project_members 
       WHERE project_id = project_uuid 
       AND user_id = auth.uid()
     );
   END;
   $$ LANGUAGE plpgsql;
   ```

## Compatibility with Existing Database

This implementation builds upon the RLS policies already present in your database. The script:

- Safely checks if RLS is already enabled before enabling it on tables
- Only creates policies if they don't already exist
- Uses conditional logic (DO blocks with IF EXISTS checks) to avoid conflicts
- Preserves existing policies for user_usage_stats, profiles, and other tables

## RLS Policies Implemented

### Saved Subreddits
- Users can only view, insert, update, or delete their own saved subreddits
- The `saved_subreddits_with_icons` view now respects these permissions

### Projects
- Users can view their own projects (where user_id = auth.uid())
- Users can view projects they are members of (via project_members table)
- Users can only insert, update, or delete their own projects

### Project Members
- Project owners can view, add, update, or remove members
- Users can view their own project memberships
- Updated policies use security definer functions to avoid recursion issues

### Project Subreddits
- Users can view subreddits for projects they're members of
- Only project owners and editors can add, update, or remove subreddits from projects
- Fixed policies use security definer functions to efficiently check permissions

### Reddit Accounts
- Users can only view, insert, update, or delete their own Reddit accounts

### Reddit Posts
- Users can only view posts from their own Reddit accounts

## How Application Code Works with RLS

The application code has been verified to work properly with these RLS policies:

1. The application fetches data without explicit user_id filtering since RLS handles this automatically
2. Special views have been created to ensure complex queries respect RLS
3. Error handling has been improved with proper TypeScript interfaces to handle database errors

## Testing RLS Policies

A test script has been provided to verify RLS policies are working correctly:

```sql
-- Example test script
DO $$
DECLARE
  test_user_id UUID := '[test-user-uuid]';
BEGIN
  -- Set session to test user
  EXECUTE format('SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub" = %L', test_user_id);
  
  -- Test project access
  ASSERT (SELECT COUNT(*) FROM projects) = 
         (SELECT COUNT(*) FROM projects WHERE user_id = test_user_id OR 
          id IN (SELECT project_id FROM project_members WHERE user_id = test_user_id)),
  'User should only see their own projects and projects they are members of';
  
  -- More tests...
END $$;
```

To run this test:

1. Log in to the Supabase dashboard
2. Go to the SQL Editor
3. Run the test script, replacing `'[test-user-uuid]'` with a real user ID from your database
4. Verify that users can only see their own data

## Troubleshooting

If you experience issues with data access:

1. Check that all tables have RLS enabled (`ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`)
2. Verify policies are correctly defined for all operations (SELECT, INSERT, UPDATE, DELETE)
3. For complex queries, consider creating views that respect RLS
4. Use the `auth.uid()` function to get the current user's ID in SQL
5. Run the test script to check if RLS is working as expected
6. Check for proper error handling in your application code:

```typescript
try {
  const { data, error } = await supabase.from('projects').select('*');
  if (error) {
    if (isSupabaseError(error) && error.code === 'PGRST301') {
      // Handle RLS policy error specifically
      console.error('Access denied by RLS policy:', error.message);
    } else {
      console.error('Database error:', error);
    }
  }
} catch (err) {
  console.error('Unexpected error:', err);
}
```