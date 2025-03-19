import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import RedditConnectModal from '../components/RedditConnectModal';
import { useLocation } from 'react-router-dom';

type RedditAccountContextType = {
  hasRedditAccounts: boolean;
  isLoading: boolean;
  connectRedditAccount: () => void;
  refreshAccountStatus: () => Promise<void>;
};

const RedditAccountContext = createContext<RedditAccountContextType>({
  hasRedditAccounts: false,
  isLoading: true,
  connectRedditAccount: () => {},
  refreshAccountStatus: async () => {},
});

export const useRedditAccounts = () => useContext(RedditAccountContext);

export const RedditAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [hasRedditAccounts, setHasRedditAccounts] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRedditConnectModal, setShowRedditConnectModal] = useState(false);
  // Track if modal has been dismissed on the current page
  const [modalDismissedOnCurrentPage, setModalDismissedOnCurrentPage] = useState(false);
  // Ref to track if we've checked for accounts on this page load
  const checkedOnCurrentPageRef = useRef(false);
  // Ref to track the last pathname to avoid duplicate checks for the same path
  const lastPathCheckedRef = useRef('');
  // Track if user is authenticated to avoid unnecessary checks
  const isAuthenticatedRef = useRef(false);
  
  // Check if the user has any Reddit accounts
  const checkForRedditAccounts = async () => {
    if (!user) {
      setIsLoading(false);
      setShowRedditConnectModal(false);
      return;
    }
    
    // Don't check if we've already checked on this page and the modal was dismissed
    if (checkedOnCurrentPageRef.current && modalDismissedOnCurrentPage) {
      return;
    }
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
        
      if (error) throw error;
      
      const hasAccounts = data && data.length > 0;
      setHasRedditAccounts(hasAccounts);
      
      console.log('Reddit accounts check:', hasAccounts ? 'Has accounts' : 'No accounts');
      
      // Show modal if user has no Reddit accounts and hasn't dismissed it on this page
      if (!hasAccounts && !modalDismissedOnCurrentPage) {
        console.log('Showing Reddit connect modal');
        setShowRedditConnectModal(true);
      } else if (hasAccounts) {
        console.log('User has Reddit accounts, hiding modal');
        setShowRedditConnectModal(false);
      }
      
      // Mark that we've checked on this page
      checkedOnCurrentPageRef.current = true;
    } catch (err) {
      console.error('Error checking for Reddit accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Public function to refresh account status
  const refreshAccountStatus = async () => {
    console.log('Manually refreshing account status');
    // Reset the checked flag when manually refreshing
    checkedOnCurrentPageRef.current = false;
    await checkForRedditAccounts();
  };
  
  // Connect Reddit account
  const connectRedditAccount = () => {
    // Generate a random state string for security
    const state = Math.random().toString(36).substring(7);
    
    // Store state in session storage to verify on callback
    sessionStorage.setItem('reddit_oauth_state', state);

    // Construct the OAuth URL with expanded scopes
    const params = new URLSearchParams({
      client_id: import.meta.env.VITE_REDDIT_APP_ID,
      response_type: 'code',
      state,
      redirect_uri: `${window.location.origin}/auth/reddit/callback`,
      duration: 'permanent',
      scope: [
        'identity',
        'read',
        'submit',
        'subscribe',
        'history',
        'mysubreddits',
        'privatemessages',
        'save',
        'vote',
        'edit',
        'flair',
        'report'
      ].join(' ')
    });

    // Redirect to Reddit's OAuth page
    window.location.href = `https://www.reddit.com/api/v1/authorize?${params}`;
  };
  
  // Handle modal close - track dismissal for current page only
  const handleModalClose = () => {
    console.log('Modal dismissed for current page');
    setShowRedditConnectModal(false);
    setModalDismissedOnCurrentPage(true);
  };
  
  // Check for Reddit accounts when the component mounts and when the user changes
  useEffect(() => {
    if (user) {
      if (!isAuthenticatedRef.current) {
        console.log('User authenticated, initial account check');
        isAuthenticatedRef.current = true;
        
        // Only check once on initial authentication
        const timer = setTimeout(() => {
          checkForRedditAccounts();
        }, 100);
        return () => clearTimeout(timer);
      }
    } else {
      isAuthenticatedRef.current = false;
      setHasRedditAccounts(false);
      setIsLoading(false);
      setShowRedditConnectModal(false);
      checkedOnCurrentPageRef.current = false;
    }
  }, [user]);
  
  // Reset modal dismissed state when location changes (navigating to a new page)
  useEffect(() => {
    // Only reset dismissed state and check for accounts if user is authenticated
    // and the path has actually changed
    if (user && lastPathCheckedRef.current !== location.pathname) {
      console.log('Location changed to:', location.pathname);
      console.log('Resetting modal dismissed state');
      
      // Update our ref to the current path
      lastPathCheckedRef.current = location.pathname;
      
      // Reset flags for the new page
      setModalDismissedOnCurrentPage(false);
      checkedOnCurrentPageRef.current = false;
      
      // Check for accounts with a small delay to ensure the page has fully loaded
      const timer = setTimeout(() => {
        checkForRedditAccounts();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, user]);
  
  // No periodic check - it's causing too many state updates and console logs
  
  return (
    <RedditAccountContext.Provider
      value={{
        hasRedditAccounts,
        isLoading,
        connectRedditAccount,
        refreshAccountStatus,
      }}
    >
      {children}
      
      {/* Global Reddit Connect Modal */}
      <RedditConnectModal
        isOpen={showRedditConnectModal}
        onClose={handleModalClose}
        onConnect={connectRedditAccount}
      />
    </RedditAccountContext.Provider>
  );
}; 