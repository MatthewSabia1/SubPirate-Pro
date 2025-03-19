-- Fix for ambiguous column reference in the is_project_member function

-- Drop the previous function 
DROP FUNCTION IF EXISTS public.is_project_member(UUID);

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

-- No need to recreate policies, just refresh the function 