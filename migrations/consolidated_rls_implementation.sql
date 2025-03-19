-- CONSOLIDATED RLS IMPLEMENTATION
-- This script enhances data isolation in SubPirate by implementing Row-Level Security on all tables

-- First, check and enable RLS on tables that don't already have it
DO $$
BEGIN
  -- These tables might not have RLS enabled yet
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'saved_subreddits' AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.saved_subreddits ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'project_members' AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.project_members ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'project_subreddits' AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.project_subreddits ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'reddit_posts' AND rowsecurity = true
  ) THEN
    ALTER TABLE IF EXISTS public.reddit_posts ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Create policies for saved_subreddits (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_subreddits' AND policyname = 'Users can view their own saved subreddits'
  ) THEN
    CREATE POLICY "Users can view their own saved subreddits" 
    ON public.saved_subreddits FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_subreddits' AND policyname = 'Users can insert their own saved subreddits'
  ) THEN
    CREATE POLICY "Users can insert their own saved subreddits" 
    ON public.saved_subreddits FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_subreddits' AND policyname = 'Users can update their own saved subreddits'
  ) THEN
    CREATE POLICY "Users can update their own saved subreddits" 
    ON public.saved_subreddits FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'saved_subreddits' AND policyname = 'Users can delete their own saved subreddits'
  ) THEN
    CREATE POLICY "Users can delete their own saved subreddits" 
    ON public.saved_subreddits FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Add additional project policy for viewing projects as a member (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can view projects they are a member of'
  ) THEN
    CREATE POLICY "Users can view projects they are a member of" 
    ON public.projects FOR SELECT 
    USING (
      auth.uid() IN (
        SELECT user_id FROM public.project_members WHERE project_id = id
      )
    );
  END IF;
END
$$;

-- Create policies for project_members (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Project members can view their project memberships'
  ) THEN
    CREATE POLICY "Project members can view their project memberships" 
    ON public.project_members FOR SELECT 
    USING (
      auth.uid() = user_id OR 
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role = 'owner'
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Project owners can insert new project members'
  ) THEN
    CREATE POLICY "Project owners can insert new project members" 
    ON public.project_members FOR INSERT 
    WITH CHECK (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role = 'owner'
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Project owners can update project members'
  ) THEN
    CREATE POLICY "Project owners can update project members" 
    ON public.project_members FOR UPDATE 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role = 'owner'
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Project owners can delete project members'
  ) THEN
    CREATE POLICY "Project owners can delete project members" 
    ON public.project_members FOR DELETE 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role = 'owner'
      )
    );
  END IF;
END
$$;

-- Create policies for project_subreddits (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_subreddits' AND policyname = 'Project members can view their project subreddits'
  ) THEN
    CREATE POLICY "Project members can view their project subreddits" 
    ON public.project_subreddits FOR SELECT 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_subreddits' AND policyname = 'Project owners and editors can insert project subreddits'
  ) THEN
    CREATE POLICY "Project owners and editors can insert project subreddits" 
    ON public.project_subreddits FOR INSERT 
    WITH CHECK (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role IN ('owner', 'edit')
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_subreddits' AND policyname = 'Project owners and editors can update project subreddits'
  ) THEN
    CREATE POLICY "Project owners and editors can update project subreddits" 
    ON public.project_subreddits FOR UPDATE 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role IN ('owner', 'edit')
      )
    );
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_subreddits' AND policyname = 'Project owners and editors can delete project subreddits'
  ) THEN
    CREATE POLICY "Project owners and editors can delete project subreddits" 
    ON public.project_subreddits FOR DELETE 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.project_members 
        WHERE project_id = project_id AND role IN ('owner', 'edit')
      )
    );
  END IF;
END
$$;

-- Create policies for reddit_posts (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'reddit_posts' AND policyname = 'Users can view reddit posts from their accounts'
  ) THEN
    CREATE POLICY "Users can view reddit posts from their accounts" 
    ON public.reddit_posts FOR SELECT 
    USING (
      auth.uid() IN (
        SELECT user_id 
        FROM public.reddit_accounts 
        WHERE id = reddit_account_id
      )
    );
  END IF;
END
$$;

-- Create helper functions for project access
-- Function to check if a user has access to a project
DROP FUNCTION IF EXISTS public.user_has_project_access(UUID);
CREATE OR REPLACE FUNCTION public.user_has_project_access(project_uuid UUID)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects WHERE id = project_uuid AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members WHERE project_id = project_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a user's role in a project
DROP FUNCTION IF EXISTS public.get_project_role(UUID);
CREATE OR REPLACE FUNCTION public.get_project_role(project_uuid UUID)
RETURNS text AS $$
DECLARE
  role_name text;
BEGIN
  -- Check if user is owner
  SELECT 'owner' INTO role_name 
  FROM public.projects 
  WHERE id = project_uuid AND user_id = auth.uid();
  
  -- If not owner, check if member
  IF role_name IS NULL THEN
    SELECT role::text INTO role_name 
    FROM public.project_members 
    WHERE project_id = project_uuid AND user_id = auth.uid();
  END IF;
  
  RETURN role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all projects a user has access to
DROP FUNCTION IF EXISTS public.get_accessible_projects();
CREATE OR REPLACE FUNCTION public.get_accessible_projects()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM public.projects WHERE user_id = auth.uid()
    UNION
    SELECT project_id FROM public.project_members WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for these functions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_project_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_project_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_projects TO authenticated;

-- Create a view for saved subreddits that respects RLS
CREATE OR REPLACE VIEW public.saved_subreddits_with_icons_rls AS
SELECT 
  ss.id,
  ss.user_id,
  ss.subreddit_id,
  ss.created_at,
  ss.last_post_at,
  s.name,
  s.subscriber_count,
  s.active_users,
  s.marketing_friendly_score,
  s.allowed_content,
  s.icon_img,
  s.community_icon,
  s.analysis_data
FROM 
  saved_subreddits ss
JOIN 
  subreddits s ON ss.subreddit_id = s.id
WHERE 
  ss.user_id = auth.uid();

-- Drop the old view if it exists and rename the new one
DO $$
BEGIN
  DROP VIEW IF EXISTS public.saved_subreddits_with_icons;
  ALTER VIEW IF EXISTS public.saved_subreddits_with_icons_rls RENAME TO saved_subreddits_with_icons;
EXCEPTION
  WHEN undefined_object THEN
    -- If the view doesn't exist, just create it directly
    CREATE OR REPLACE VIEW public.saved_subreddits_with_icons AS
    SELECT 
      ss.id,
      ss.user_id,
      ss.subreddit_id,
      ss.created_at,
      ss.last_post_at,
      s.name,
      s.subscriber_count,
      s.active_users,
      s.marketing_friendly_score,
      s.allowed_content,
      s.icon_img,
      s.community_icon,
      s.analysis_data
    FROM 
      saved_subreddits ss
    JOIN 
      subreddits s ON ss.subreddit_id = s.id
    WHERE 
      ss.user_id = auth.uid();
END
$$; 