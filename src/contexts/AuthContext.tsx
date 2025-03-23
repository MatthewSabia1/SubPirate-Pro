import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { fetchCSRFToken } from '../lib/fetch';

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  image_url: string | null;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Format auth error messages to be more user-friendly
function formatAuthError(error: AuthError | Error): string {
  const message = error.message;
  
  // Common Supabase Auth errors with friendly messages
  if (message.includes('Email not confirmed')) {
    return 'Please check your email to confirm your account.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'The email or password you entered is incorrect.';
  }
  if (message.includes('Email already registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (message.includes('Password should be at least 6 characters')) {
    return 'Password must be at least 6 characters long.';
  }
  if (message.includes('rate limited')) {
    return 'Too many attempts. Please try again later.';
  }
  
  // Return the original message if no specific mapping exists
  return message;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const clearError = React.useCallback(() => setError(null), []);

  // Better approach to avoid circular dependency by moving both functions to a custom hook
  const { fetchProfile, createUserProfile } = React.useMemo(() => {
    // Inner function to create a profile
    const createProfile = async (userId: string) => {
      try {
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
        
        if (error) throw error;
        
        // Return true to indicate success
        return true;
      } catch (err) {
        console.error('Error creating user profile:', err);
        return false;
      }
    };

    // Inner function to fetch a profile
    const fetchProfileInner = async (userId: string) => {
      try {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        setProfile(data);
        
        // Create profile if it doesn't exist
        if (!data) {
          const created = await createProfile(userId);
          if (created) {
            // Fetch the newly created profile
            const { data: newProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
              
            if (newProfile) {
              setProfile(newProfile);
            }
          }
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching profile:', err);
        setProfile(null);
        return null;
      } finally {
        setProfileLoading(false);
      }
    };

    return {
      fetchProfile: fetchProfileInner,
      createUserProfile: createProfile
    };
  }, []);

  useEffect(() => {
    // Check active sessions and sets the user
    const setupInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        setError(formatAuthError(sessionError));
      }
      
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      }
      setLoading(false);
      } catch (err) {
        console.error('Error in initial session setup:', err);
        setLoading(false);
      }
    };
    
    setupInitialSession();

    // Define auth state change handler inside useEffect to avoid hooks rule violation
    const handleAuthChange = (_event: string, session: Session | null) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };
    
    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile, createUserProfile]);

  const signIn = React.useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) {
        setError(formatAuthError(error));
        return null;
      }
      
      return data;
    } catch (error: any) {
      setError(formatAuthError(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = React.useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        setError(formatAuthError(error));
        return { user: null, session: null };
      }
      
      // If email confirmation is required (no session returned)
      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.');
      } else if (data.user && data.session) {
        // Auto-confirmed email - user is already logged in
        console.log('Account created and auto-confirmed with session');
      }
      
      return data;
    } catch (error: any) {
      setError(formatAuthError(error));
      return { user: null, session: null };
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = React.useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      // For Google, we'll use PKCE flow and ensure we specify the correct redirect URL
      const redirectTo = `${window.location.origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
          skipBrowserRedirect: false // Ensure the browser handles the redirect properly
        }
      });
      
      if (error) {
        setError(formatAuthError(error));
        return null;
      } 
      
      return data;
    } catch (error: any) {
      setError(formatAuthError(error));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = React.useCallback(async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(formatAuthError(error));
      }
    } catch (error: any) {
      setError(formatAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = React.useCallback(async (data: { display_name?: string }) => {
    try {
      setError(null);
      if (!user) {
        setError('No user logged in');
        return;
      }

      // Get CSRF token for this state-changing operation
      const csrfToken = await fetchCSRFToken();
      if (!csrfToken) {
        console.warn('No CSRF token available for profile update');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .headers(csrfToken ? { 'X-CSRF-Token': csrfToken } : {});

      if (error) {
        setError(formatAuthError(error));
      } else {
        // Refresh profile after update
        await fetchProfile(user.id);
      }
    } catch (error: any) {
      setError(formatAuthError(error));
    }
  }, [fetchProfile, user]);
  
  // Add password reset functionality
  const sendPasswordResetEmail = React.useCallback(async (email: string) => {
    try {
      setError(null);
      setLoading(true);
      
      // Get CSRF token for this state-changing operation
      const csrfToken = await fetchCSRFToken();
      if (!csrfToken) {
        console.warn('No CSRF token available for password reset');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        ...(csrfToken ? { options: { headers: { 'X-CSRF-Token': csrfToken } } } : {})
      });
      
      if (error) {
        setError(formatAuthError(error));
      }
    } catch (error: any) {
      setError(formatAuthError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      error,
      clearError,
      signIn,
      signUp,
      signOut,
      updateProfile,
      signInWithGoogle,
      sendPasswordResetEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}