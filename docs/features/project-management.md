# Project Management Feature

The Project Management feature allows users to organize analyzed subreddits into projects for better marketing campaign management.

## Overview

Projects provide a way to:
- Group related subreddits together
- Track marketing efforts across multiple communities
- Collaborate with team members (on higher tiers)
- Share project insights with clients

## Architecture

### Components

- **Projects Page**: `/src/pages/Projects.tsx`
  - Lists all user projects
  - Provides project creation and management

- **ProjectView Page**: `/src/pages/ProjectView.tsx`
  - Detailed view of a single project
  - Shows all subreddits in the project
  - Displays aggregated project metrics

- **Project Modals**:
  - `CreateProjectModal.tsx`: For creating new projects
  - `ProjectSettingsModal.tsx`: For editing project details
  - `ShareProjectModal.tsx`: For sharing projects with others
  - `AddToProjectModal.tsx`: For adding subreddits to projects

- **ProjectSubreddits Component**: `src/components/ProjectSubreddits.tsx`
  - Displays subreddits in a project
  - Allows managing subreddits within the project

### Database Schema

```sql
projects {
  id: string (primary key)
  user_id: string (foreign key to profiles)
  name: string
  description: string (nullable)
  image_url: string (nullable)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}

project_members {
  id: string (primary key)
  project_id: string (foreign key to projects)
  user_id: string (foreign key to profiles)
  role: 'read' | 'edit' | 'owner' (enum)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}

project_subreddits {
  id: string (primary key)
  project_id: string (foreign key to projects)
  subreddit_id: string (foreign key to subreddits)
  created_at: string (timestamp)
}

subreddits {
  id: string (primary key)
  name: string
  subscriber_count: number
  active_users: number
  marketing_friendly_score: number
  posting_requirements: Json
  posting_frequency: Json
  allowed_content: string[]
  best_practices: string[]
  rules_summary: string (nullable)
  title_template: string (nullable)
  last_analyzed_at: string (timestamp)
  created_at: string (timestamp)
  updated_at: string (timestamp)
}
```

## Database Functions

```sql
-- Function to get a user's role in a project
get_project_role(project_uuid: string): 'read' | 'edit' | 'owner'
```

## Row-Level Security Policies

Projects are protected by Row-Level Security (RLS) policies that ensure users can only access projects they own or are members of:

```sql
-- Allow users to see their own projects
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

-- Allow project members to view projects they are members of
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );
  
-- Allow project owners to update their projects
CREATE POLICY "Owners can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_id = projects.id 
      AND user_id = auth.uid() 
      AND role = 'owner'
    )
  );
```

## Data Flow

### Creating a Project

1. User opens the `CreateProjectModal`
2. User enters project name and description
3. Frontend makes a request to Supabase:
   ```typescript
   const { data, error } = await supabase
     .from('projects')
     .insert({
       user_id: auth.user.id,
       name: projectData.name,
       description: projectData.description,
       image_url: projectData.image_url,
     })
     .select()
     .single();
   ```
4. After creation, user is added as an owner:
   ```typescript
   await supabase.from('project_members').insert({
     project_id: projectId,
     user_id: auth.user.id,
     role: 'owner'
   });
   ```

### Adding Subreddits to Projects

1. User clicks "Add to Project" on a subreddit
2. `AddToProjectModal` displays available projects
3. User selects a project
4. Frontend sends request:
   ```typescript
   await supabase.from('project_subreddits').insert({
     project_id: selectedProject.id,
     subreddit_id: subredditId,
   });
   ```

### Sharing a Project

1. User opens `ShareProjectModal`
2. User enters email address of person to share with
3. System checks if user exists:
   ```typescript
   const { data: userToShare } = await supabase
     .from('profiles')
     .select('id')
     .eq('email', email)
     .single();
   ```
4. If user exists, creates project member:
   ```typescript
   await supabase.from('project_members').insert({
     project_id: projectId,
     user_id: userToShare.id,
     role: selectedRole,
   });
   ```
5. If user doesn't exist, sends invitation (implemented in higher tiers)

## Feature Gating

Projects are available on all paid tiers (Starter and above):

```typescript
// From src/lib/subscription/features.ts
TIER_FEATURES.starter: [
  FEATURE_KEYS.ANALYZE_SUBREDDIT,
  FEATURE_KEYS.CREATE_PROJECT, // <-- Available from Starter tier
  FEATURE_KEYS.EXPORT_DATA,
],
```

Team collaboration is available on Pro and Agency tiers:

```typescript
TIER_FEATURES.pro: [
  // ...other features
  FEATURE_KEYS.TEAM_COLLABORATION, // <-- Available from Pro tier
  // ...other features
],
```

## UI Components

The UI for project management uses these components:

- Project cards with image, name, and description
- Modal interfaces for project operations
- List views for subreddits within projects
- Role selection dropdowns for collaboration
- Permission-based action buttons

## Error Handling

- Duplicate project names
- Permission issues when accessing projects
- Network errors during project operations
- Database constraints for project relationships

## Future Enhancements

- Project templates for common marketing scenarios
- Advanced analytics aggregated at the project level
- Campaign scheduling within projects
- Content calendar integration
- Automated reports for project progress