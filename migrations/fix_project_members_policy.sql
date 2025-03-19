-- Fix for RLS policies in project_members and project_subreddits tables
-- This creates security definer functions to properly check membership
-- and modifies the existing policies to use them

-- First, create a function to check if a user is an owner of a project
DROP FUNCTION IF EXISTS public.is_project_owner(UUID);
CREATE OR REPLACE FUNCTION public.is_project_owner(project_id UUID)
RETURNS boolean AS $$
BEGIN
  -- Return true if user owns the project
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = $1 AND user_id = auth.uid() AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user is an editor of a project
DROP FUNCTION IF EXISTS public.is_project_editor(UUID);
CREATE OR REPLACE FUNCTION public.is_project_editor(project_id UUID)
RETURNS boolean AS $$
BEGIN
  -- Return true if user is an owner or editor
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_id = $1 AND user_id = auth.uid() AND role IN ('owner', 'edit')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_project_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_editor TO authenticated;

-- Fix project_members policies
DROP POLICY IF EXISTS "Project members can view their project memberships" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can insert new project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can update project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can delete project members" ON public.project_members;

-- Create new policies with proper conditions
CREATE POLICY "User can view own project memberships" 
ON public.project_members FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Owners can view project memberships" 
ON public.project_members FOR SELECT 
USING (public.is_project_owner(project_id));

CREATE POLICY "Owners can insert project members" 
ON public.project_members FOR INSERT 
WITH CHECK (public.is_project_owner(project_id));

CREATE POLICY "Owners can update project members" 
ON public.project_members FOR UPDATE 
USING (public.is_project_owner(project_id));

CREATE POLICY "Owners can delete project members" 
ON public.project_members FOR DELETE 
USING (public.is_project_owner(project_id));

-- Fix project_subreddits policies
DROP POLICY IF EXISTS "Project members can view their project subreddits" ON public.project_subreddits;
DROP POLICY IF EXISTS "Project owners and editors can insert project subreddits" ON public.project_subreddits;
DROP POLICY IF EXISTS "Project owners and editors can update project subreddits" ON public.project_subreddits;
DROP POLICY IF EXISTS "Project owners and editors can delete project subreddits" ON public.project_subreddits;

-- Create new policies with proper conditions
CREATE POLICY "Members can view project subreddits" 
ON public.project_subreddits FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.project_members 
  WHERE project_id = project_subreddits.project_id AND user_id = auth.uid()
));

CREATE POLICY "Editors can insert project subreddits" 
ON public.project_subreddits FOR INSERT 
WITH CHECK (public.is_project_editor(project_id));

CREATE POLICY "Editors can update project subreddits" 
ON public.project_subreddits FOR UPDATE 
USING (public.is_project_editor(project_id));

CREATE POLICY "Editors can delete project subreddits" 
ON public.project_subreddits FOR DELETE 
USING (public.is_project_editor(project_id));