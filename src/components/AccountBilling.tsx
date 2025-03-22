import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { supabase } from '../lib/supabase';
import { createCustomerPortalSession } from '../lib/stripe/client';
import { getTierDisplayName } from '../lib/subscription/features';

export function AccountBilling() {
  const { user } = useAuth();
  const { tier, refreshAccess } = useFeatureAccess();
  const [loading, setLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load billing status
  useEffect(() => {
    const loadBillingStatus = async () => {
      if (!user) return;
      
      try {
        // Get personal account
        const { data: account, error: accountError } = await supabase.rpc('get_personal_account');
        
        if (accountError) {
          console.error('Error loading account:', accountError);
          return;
        }
        
        if (!account) return;
        
        // Get billing status
        const { data: status, error: statusError } = await supabase.rpc(
          'get_account_billing_status',
          { account_id: account.account_id }
        );
        
        if (statusError) {
          console.error('Error loading billing status:', statusError);
          return;
        }
        
        setBillingStatus(status);
      } catch (error) {
        console.error('Error loading billing info:', error);
      }
    };
    
    loadBillingStatus();
  }, [user]);

  // Handle managing subscription
  const handleManageSubscription = async () => {
    setLoading(true);
    setErrorMessage(null);
    
    try {
      const portalSession = await createCustomerPortalSession(window.location.origin + '/settings');
      
      if (portalSession?.url) {
        window.location.href = portalSession.url;
      } else {
        throw new Error('Failed to create customer portal session');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      setErrorMessage('Failed to access billing portal. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4">Subscription Information</h2>
      
      {errorMessage && (
        <div className="bg-red-900/30 border border-red-800 p-3 rounded-md text-red-200 mb-4">
          {errorMessage}
        </div>
      )}
      
      <div className="mb-6 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400">Current Plan:</span>
          <span className="text-white font-semibold">{getTierDisplayName(tier as any)}</span>
        </div>
        
        {billingStatus?.billing_status && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`font-semibold ${
                billingStatus.billing_status === 'active' || billingStatus.billing_status === 'trialing' 
                  ? 'text-green-400' 
                  : 'text-yellow-400'
              }`}>
                {billingStatus.billing_status.charAt(0).toUpperCase() + billingStatus.billing_status.slice(1)}
              </span>
            </div>
            
            {billingStatus.current_period_end && (
              <div className="flex justify-between">
                <span className="text-gray-400">Current Period Ends:</span>
                <span className="text-white">{formatDate(billingStatus.current_period_end)}</span>
              </div>
            )}
            
            {billingStatus.cancel_at_period_end && (
              <div className="bg-yellow-900/30 border border-yellow-800 p-3 rounded-md text-yellow-200 my-3">
                Your subscription will be canceled at the end of the current billing period.
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="flex flex-col space-y-4">
        {billingStatus?.billing_customer_id ? (
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Manage Subscription'}
          </button>
        ) : (
          <a
            href="/pricing"
            className="bg-green-600 hover:bg-green-700 text-center text-white py-2 px-4 rounded-md"
          >
            Upgrade Now
          </a>
        )}
      </div>
    </div>
  );
}