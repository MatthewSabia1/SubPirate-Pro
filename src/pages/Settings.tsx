import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFeatureAccess } from '../contexts/FeatureAccessContext';
import { supabase } from '../lib/supabase';
import { createCustomerPortalSession } from '../lib/stripe/client';
import { getTierDisplayName } from '../lib/subscription/features';

function Settings() {
  const { user, profile, updateProfile } = useAuth();
  const { tier, refreshAccess } = useFeatureAccess();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [billingStatus, setBillingStatus] = useState<any>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  // Initialize form with user data
  useEffect(() => {
    if (profile) {
      setEmail(profile.email || '');
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  // Load subscription data from Basejump
  useEffect(() => {
    const loadSubscriptionData = async () => {
      if (!user) return;
      
      try {
        // Get personal account
        const { data: account, error: accountError } = await supabase.rpc('get_personal_account');
        
        if (accountError) {
          console.error('Error loading account:', accountError);
          return;
        }
        
        if (!account) return;
        setAccountId(account.account_id);
        
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
        
        // If we have a billing subscription ID, get the full details
        if (status?.billing_subscription_id) {
          const { data: subscription, error: subError } = await supabase
            .from('basejump.billing_subscriptions')
            .select('*')
            .eq('id', status.billing_subscription_id)
            .single();
            
          if (subError) {
            console.error('Error loading subscription:', subError);
          } else if (subscription) {
            // Add subscription details to the billing status
            setBillingStatus({
              ...status,
              ...subscription
            });
          }
        }
      } catch (error) {
        console.error('Error loading subscription data:', error);
      }
    };
    
    loadSubscriptionData();
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ display_name: displayName });
      // Show success message
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      // Show error message
      return;
    }
    setLoading(true);
    try {
      // Implement password update logic
    } catch (error) {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      if (!billingStatus?.billing_customer_id) {
        // If no subscription, go to pricing page
        window.location.href = '/pricing';
        return;
      }
      
      // Create customer portal session using Stripe
      const session = await createCustomerPortalSession(window.location.origin + '/settings');
      
      if (session?.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Failed to create customer portal session');
      }
    } catch (error) {
      console.error('Error managing subscription:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-bold mb-8">Account Settings</h1>

      <div className="space-y-6">
        {/* Subscription Section */}
        <div className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-xl font-semibold mb-1">Subscription</h2>
              <p className="text-gray-500 text-sm">Manage your subscription</p>
            </div>
            {billingStatus?.status && (
              <span className={`px-2 py-1 text-xs rounded-md ${
                billingStatus.status === 'active' || billingStatus.status === 'trialing'
                  ? 'bg-green-900/30 text-green-400'
                  : 'bg-yellow-900/30 text-yellow-400'
              }`}>
                {billingStatus.status === 'trialing' ? 'Trial' : billingStatus.status}
              </span>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {billingStatus?.billing_customer_id ? (
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-gray-500 mb-1">Plan</div>
                    <div className="text-lg">{getTierDisplayName(tier as any)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 mb-1">Status</div>
                    <div className="text-lg">
                      {billingStatus.status === 'trialing' 
                        ? 'Trial Period' 
                        : billingStatus.status === 'active'
                          ? 'Active'
                          : billingStatus.status}
                    </div>
                  </div>
                </div>

                {billingStatus.trial_end && (
                  <div>
                    <div className="text-gray-500 mb-1">Trial Ends</div>
                    <div className="text-lg">
                      {new Date(billingStatus.trial_end).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {billingStatus.current_period_end && (
                  <div>
                    <div className="text-gray-500 mb-1">Current Period Ends</div>
                    <div className="text-lg">
                      {new Date(billingStatus.current_period_end).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {billingStatus.cancel_at_period_end && (
                  <div className="bg-yellow-900/30 text-yellow-400 p-4 rounded-lg">
                    <p className="text-sm">
                      Your subscription will end on {new Date(billingStatus.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <button 
                  className="secondary w-full" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-gray-500 mb-4">No active subscription</p>
                <button 
                  className="primary w-full" 
                  onClick={() => window.location.href = '/pricing'}
                >
                  View Plans
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Information Section */}
        <form onSubmit={handleProfileUpdate} className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <h2 className="text-xl font-semibold mb-1">Profile Information</h2>
          <p className="text-gray-500 text-sm mb-6">Update your account profile settings</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={true} // Email can't be changed
                className="bg-gray-800 opacity-70"
              />
              <p className="text-gray-500 text-sm mt-2">This email will be used for account-related notifications</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Display Name (optional)</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-gray-500 text-sm mt-2">This name will be displayed to other users</p>
            </div>

            <button type="submit" className="primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Change Password Section */}
        <form onSubmit={handlePasswordUpdate} className="bg-[#0f0f0f] p-6 rounded-lg text-[#ffffff]">
          <h2 className="text-xl font-semibold mb-1">Change Password</h2>
          <p className="text-gray-500 text-sm mb-6">Update your account password</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Current Password</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
              />
              <p className="text-gray-500 text-sm mt-2">Password must be at least 6 characters and contain uppercase, lowercase, and numbers</p>
            </div>

            <div>
              <label className="block text-sm mb-2">Confirm New Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
              />
            </div>

            <button type="submit" className="primary w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;