import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  FeatureKey, 
  getTierFromProductName,
  isWithinUsageLimit,
} from '../lib/subscription/features';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FeatureAccessContextType {
  hasAccess: (featureKey: FeatureKey) => boolean;
  isLoading: boolean;
  tier: string;
  refreshAccess: () => Promise<void>;
  checkUsageLimit: (metric: string, currentUsage: number) => boolean;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tier, setTier] = useState<string>('free');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [features, setFeatures] = useState<string[]>([]);

  // Load account and subscription data
  const loadSubscriptionData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Get the personal account using Basejump's function
      const { data: account, error: accountError } = await supabase.rpc('get_personal_account');
      
      if (accountError) {
        console.error('Error loading account:', accountError);
        setTier('free');
        setIsLoading(false);
        return;
      }
      
      if (account) {
        setAccountId(account.account_id);
        
        // Get billing status
        const { data: billingStatus, error: billingError } = await supabase.rpc(
          'get_account_billing_status',
          { account_id: account.account_id }
        );
        
        if (billingError) {
          console.error('Error loading billing status:', billingError);
          setTier('free');
          setIsLoading(false);
          return;
        }
        
        // Determine tier from subscription status
        let currentTier = 'free';
        
        if (billingStatus?.billing_status === 'active' || billingStatus?.billing_status === 'trialing') {
          // Get the plan details from the subscription
          const { data: subscription, error: subError } = await supabase
            .from('basejump.billing_subscriptions')
            .select(`
              id,
              plan_name,
              status,
              price_id,
              basejump.stripe_prices!inner (
                stripe_product_id
              )
            `)
            .eq('id', billingStatus.billing_subscription_id)
            .single();
            
          if (!subError && subscription) {
            // Get features for this subscription's product
            const { data: productFeatures, error: featuresError } = await supabase
              .from('basejump.product_features')
              .select('feature_key')
              .eq('stripe_product_id', subscription.basejump.stripe_prices.stripe_product_id)
              .eq('enabled', true);
              
            if (!featuresError && productFeatures) {
              setFeatures(productFeatures.map(f => f.feature_key));
            }
            
            // Get product name for tier determination
            const { data: product, error: productError } = await supabase
              .from('basejump.stripe_products')
              .select('name')
              .eq('stripe_product_id', subscription.basejump.stripe_prices.stripe_product_id)
              .single();
              
            if (!productError && product) {
              currentTier = getTierFromProductName(product.name);
            }
          }
        }
        
        setTier(currentTier);
      }
    } catch (error) {
      console.error('Error in subscription loading:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load subscription data on mount or when user changes
  useEffect(() => {
    loadSubscriptionData();
  }, [user]);

  // Function to check if user has access to a feature
  const hasAccess = (featureKey: FeatureKey): boolean => {
    // Always grant access in development mode for easier testing
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    
    // If features are loaded from database, check if feature is in the list
    if (features.length > 0) {
      return features.includes(featureKey);
    }
    
    // If no user or still loading, deny access
    if (!user || isLoading) {
      return false;
    }
    
    // Default allow access for now
    return true;
  };

  // Function to refresh subscription data
  const refreshAccess = async (): Promise<void> => {
    await loadSubscriptionData();
  };

  // Function to check usage limits
  const checkUsageLimit = (metric: string, currentUsage: number): boolean => {
    return isWithinUsageLimit(tier as any, metric, currentUsage);
  };

  return (
    <FeatureAccessContext.Provider value={{
      hasAccess,
      isLoading,
      tier,
      refreshAccess,
      checkUsageLimit,
    }}>
      {children}
    </FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess() {
  const context = useContext(FeatureAccessContext);
  if (context === undefined) {
    throw new Error('useFeatureAccess must be used within a FeatureAccessProvider');
  }
  return context;
}