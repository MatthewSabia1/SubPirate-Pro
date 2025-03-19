-- Fix for ambiguous column and dependencies
-- Using CASCADE to handle policy dependencies properly

-- Drop the function WITH CASCADE to also drop dependent policies
DROP FUNCTION IF EXISTS public.is_project_member(UUID) CASCADE;

-- Recreate with a clearer parameter name to avoid ambiguity
CREATE OR REPLACE FUNCTION public.is_project_member(project_uuid UUID)
RETURNS boolean AS $$
BEGIN
  -- Use explicit parameter reference to avoid ambiguity
  RETURN EXISTS (
    SELECT 1 FROM public.project_members 
    WHERE project_members.project_id = project_uuid AND project_members.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure execute permission is granted
GRANT EXECUTE ON FUNCTION public.is_project_member TO authenticated;

-- Recreate the policies that were dropped due to CASCADE

-- 1. First make sure users can view their own projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can view their own projects'
  ) THEN
    CREATE POLICY "Users can view their own projects" 
    ON public.projects FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- 2. Recreate the policy for viewing projects as a member
CREATE POLICY "Users can view projects they are members of" 
ON public.projects FOR SELECT 
USING (public.is_project_member(id)); 