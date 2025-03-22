import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CSRFContextType {
  csrfToken: string | null;
  loading: boolean;
  error: string | null;
  refreshToken: () => Promise<string | null>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to fetch the CSRF token from the server
  const fetchCSRFToken = async (): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      
      // Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not authenticated, no need for CSRF token yet
        setLoading(false);
        return null;
      }
      
      // Fetch the CSRF token from the server
      const response = await fetch('/api/csrf-token', {
        method: 'GET',
        credentials: 'include', // Important to include cookies
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      
      const data = await response.json();
      setCsrfToken(data.csrfToken);
      setLoading(false);
      return data.csrfToken;
    } catch (err: any) {
      console.error('Error fetching CSRF token:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  };

  // Fetch the CSRF token on initial load
  useEffect(() => {
    fetchCSRFToken();
  }, []);

  // Function to refresh the CSRF token
  const refreshToken = async (): Promise<string | null> => {
    return await fetchCSRFToken();
  };

  return (
    <CSRFContext.Provider value={{
      csrfToken,
      loading,
      error,
      refreshToken
    }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
} 