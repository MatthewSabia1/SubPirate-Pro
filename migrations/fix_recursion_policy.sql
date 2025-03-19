-- Fix for infinite recursion in projects RLS policy
-- This creates a security definer function to check membership
-- and modifies the existing policy to use it

-- First, create a function to check if a user is a member of a project
DROP FUNCTION IF EXISTS public.is_project_member(UUID);
CREATE OR REPLACE FUNCTION public.is_project_member(project_id UUID)
RETURNS boolean AS $$
BEGIN
  -- Return true if user owns the project or is a member
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = $1 AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_project_member TO authenticated;

-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can view projects they are a member of" ON public.projects;

-- Create two separate, clearer policies for projects table

-- 1. Users can view their own projects
CREATE POLICY "Users can view their own projects" 
ON public.projects FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Users can view projects they are members of (using the function)
CREATE POLICY "Users can view projects they are members of" 
ON public.projects FOR SELECT 
USING (public.is_project_member(id));

-- 3. Users can insert their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can insert their own projects'
  ) THEN
    CREATE POLICY "Users can insert their own projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

-- 4. Users can update their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can update their own projects'
  ) THEN
    CREATE POLICY "Users can update their own projects" 
    ON public.projects FOR UPDATE 
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 5. Users can delete their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can delete their own projects'
  ) THEN
    CREATE POLICY "Users can delete their own projects" 
    ON public.projects FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;
END
$$; 