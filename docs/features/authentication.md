# Authentication System

This document outlines the authentication system used in SubPirate, which leverages Supabase Authentication.

## Overview

The authentication system handles user authentication, session management, and profile creation. It is built on Supabase Auth, which provides secure, token-based authentication with support for email/password and social login methods.

## Visual Representation

### Authentication Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│ Login/Register  │────▶│  Supabase Auth  │────▶│ Create/Fetch    │
│ UI Components   │     │  Service        │     │ User Profile    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                │
                        ┌───────▼───────┐
                        │               │
                        │ AuthContext   │
                        │ Provider      │
                        │               │
                        └───────┬───────┘
                                │
                                │
            ┌──────────────────┐│┌───────────────────┐
            │                  ││                    │
            │ Protected Routes ││  App Components    │
            │                  ││                    │
            └──────────────────┘└────────────────────┘
```

### Session Management Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                       Authentication Flow                            │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
            ┌───────────────┼────────────────┐
            │               │                │
  ┌─────────▼────┐   ┌──────▼─────┐   ┌──────▼──────┐
  │              │   │            │   │             │
  │ Sign Up      │   │ Sign In    │   │ Social Login│
  │              │   │            │   │             │
  └──────┬───────┘   └─────┬──────┘   └──────┬──────┘
         │                 │                 │
         └─────────┬───────┘─────────┬───────┘
                   │                 │
           ┌───────▼─────────────────▼──────┐
           │                                │
           │        Supabase JWT            │
           │                                │
           └────────────────┬───────────────┘
                            │
                  ┌─────────▼──────────┐
                  │                    │
                  │  User Session      │
                  │                    │
                  └─────────┬──────────┘
                            │
                  ┌─────────▼──────────┐
                  │                    │
                  │ Auth Context State │
                  │                    │
                  └────────────────────┘
```

## Implementation

### AuthContext

The `AuthContext` is a React Context that provides authentication state and methods throughout the application:

```typescript
interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session } | null>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: { display_name?: string }) => Promise<void>;
  signInWithGoogle: () => Promise<{ provider: string; url: string } | null>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Authentication state and methods implementation
  // ...
}
```

### User Authentication

The application supports multiple authentication methods:

1. **Email/Password Authentication**:
   ```typescript
   const signIn = async (email: string, password: string) => {
     const { data, error } = await supabase.auth.signInWithPassword({ 
       email, 
       password 
     });
     
     // Handle result
     // ...
   };
   
   const signUp = async (email: string, password: string) => {
     const { data, error } = await supabase.auth.signUp({ 
       email, 
       password,
       options: {
         emailRedirectTo: `${window.location.origin}/auth/callback`
       }
     });
     
     // Handle result
     // ...
   };
   ```

2. **Social Authentication (Google)**:
   ```typescript
   const signInWithGoogle = async () => {
     const { data, error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: {
         redirectTo: `${window.location.origin}/auth/callback`,
         queryParams: {
           access_type: 'offline',
           prompt: 'select_account',
         },
       }
     });
     
     // Handle result
     // ...
   };
   ```

### Profile Management

When a user signs up, the system creates a profile record in the database:

```typescript
const createProfile = async (userId: string) => {
  // Get user details from auth
  const { data: userData } = await supabase.auth.getUser();
  
  if (!userData.user) return;
  
  const userEmail = userData.user.email;
  const displayName = userData.user.user_metadata?.full_name || 
                      userData.user.user_metadata?.name ||
                      userEmail?.split('@')[0] || 'User';
                      
  const { error } = await supabase.from('profiles').insert({
    id: userId,
    display_name: displayName,
    email: userEmail,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  
  // Handle error and return result
  // ...
};
```

### Protected Routes

Routes that require authentication are wrapped in a `PrivateRoute` component:

```typescript
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    // Render the protected route content
    // ...
  );
}
```

## Database Schema

```sql
profiles {
  id: string (primary key)
  display_name: string (nullable)
  created_at: string (timestamp)
  updated_at: string (timestamp)
  email: string (nullable)
  full_name: string (nullable)
}
```

## Row-Level Security (RLS)

Supabase Row-Level Security policies ensure data protection:

```sql
-- Enable RLS on tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subreddits ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only access their own profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Example policy: Users can update their own profiles
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
```

## Authentication API

The `useAuth` hook provides access to auth state and functions:

```typescript
// Using the auth context
const { user, loading, signOut } = useAuth();

// Check if user is authenticated
if (!user) {
  return <Login />;
}

// Access user data
return <div>Welcome, {user.name}</div>;
```

## Error Handling

The authentication system includes robust error handling:

```typescript
function formatAuthError(error: AuthError | Error): string {
  const message = error.message;
  
  // Common Supabase Auth errors with friendly messages
  if (message.includes('Email not confirmed')) {
    return 'Please check your email to confirm your account.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'The email or password you entered is incorrect.';
  }
  // More error handling...
  
  return message;
}
```

## Security Considerations

1. **JWT Tokens**: Supabase Auth uses secure JWT tokens for session management
2. **Password Security**: Passwords are never stored in plaintext
3. **HTTPS**: All authentication requests are made over HTTPS
4. **Session Timeouts**: Sessions expire after a configured period
5. **Row-Level Security**: Supabase RLS policies protect user data

## Integration with Feature Access

The authentication system works closely with the Feature Access system to determine what features a user can access:

```typescript
function DashboardPage() {
  const { user } = useAuth();
  const { hasAccess } = useFeatureAccess();
  
  // Use user information and feature access to render appropriate content
  // ...
}
```

## User Session Flow

1. User signs in or registers
2. JWT token is stored in local storage
3. AuthContext populates user state
4. Components react to authentication state
5. Protected routes become accessible
6. User profile is fetched and stored in context

## Future Enhancements

- Enhanced profile management
- Role-based access control
- Organization/team management
- Additional social login providers
- Enhanced security features (2FA, security logs)