import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import RedditConnectModal from '../components/RedditConnectModal';
import { useLocation } from 'react-router-dom';
import { connectRedditAccount as oauthConnect, reconnectRedditAccount } from '../lib/redditOAuth';

type RedditAccountContextType = {
  hasRedditAccounts: boolean;
  hasActiveRedditAccounts: boolean;
  inactiveAccounts: any[];
  isLoading: boolean;
  connectRedditAccount: () => void;
  refreshAccountStatus: () => Promise<void>;
  reconnectAccount: (accountId: string) => void;
};

const RedditAccountContext = createContext<RedditAccountContextType>({
  hasRedditAccounts: false,
  hasActiveRedditAccounts: false,
  inactiveAccounts: [],
  isLoading: true,
  connectRedditAccount: () => {},
  refreshAccountStatus: async () => {},
  reconnectAccount: () => {},
});

export const useRedditAccounts = () => useContext(RedditAccountContext);

export const RedditAccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [hasRedditAccounts, setHasRedditAccounts] = useState(false);
  const [hasActiveRedditAccounts, setHasActiveRedditAccounts] = useState(false);
  const [inactiveAccounts, setInactiveAccounts] = useState<any[]>([]);
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
      
      // Get both active and inactive accounts 
      const { data, error } = await supabase
        .from('reddit_accounts')
        .select('id, username, is_active, refresh_error')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      // Track both overall accounts and active accounts
      const hasAccounts = data && data.length > 0;
      const activeAccounts = data ? data.filter(account => account.is_active) : [];
      const inactiveAccts = data ? data.filter(account => !account.is_active) : [];
      
      setHasRedditAccounts(hasAccounts);
      setHasActiveRedditAccounts(activeAccounts.length > 0);
      setInactiveAccounts(inactiveAccts);
      
      // Determine if we need to show the connect modal
      // Show if no accounts at all or if all accounts are inactive
      const shouldShowModal = hasAccounts 
        ? activeAccounts.length === 0 && !modalDismissedOnCurrentPage
        : !modalDismissedOnCurrentPage;
      
      console.log('Reddit accounts check:', {
        total: data?.length || 0,
        active: activeAccounts.length,
        inactive: inactiveAccts.length,
        showModal: shouldShowModal
      });
      
      if (shouldShowModal) {
        console.log('Showing Reddit connect modal');
        setShowRedditConnectModal(true);
      } else {
        console.log('Not showing Reddit connect modal');
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
  
  // Connect a new Reddit account
  const connectRedditAccount = () => {
    // Use the central OAuth utility
    oauthConnect();
  };
  
  // Reconnect a specific account (for inactive accounts)
  const reconnectAccount = (accountId: string) => {
    // Use the central OAuth utility
    reconnectRedditAccount(accountId);
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
      setHasActiveRedditAccounts(false);
      setInactiveAccounts([]);
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
        hasActiveRedditAccounts,
        inactiveAccounts,
        isLoading,
        connectRedditAccount,
        refreshAccountStatus,
        reconnectAccount,
      }}
    >
      {children}
      
      {/* Global Reddit Connect Modal */}
      <RedditConnectModal
        isOpen={showRedditConnectModal}
        onClose={handleModalClose}
        onConnect={connectRedditAccount}
        inactiveAccounts={inactiveAccounts}
        onReconnect={reconnectAccount}
      />
    </RedditAccountContext.Provider>
  );
}; 