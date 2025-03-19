import React, { createContext, useContext, useState } from 'react';
import { 
  FeatureKey, 
  TIER_FEATURES, 
  isWithinUsageLimit,
} from '../lib/subscription/features';

interface FeatureAccessContextType {
  hasAccess: (featureKey: FeatureKey) => boolean;
  isLoading: boolean;
  tier: string;
  refreshAccess: () => Promise<void>;
  checkUsageLimit: (metric: string, currentUsage: number) => boolean;
}

const FeatureAccessContext = createContext<FeatureAccessContextType | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
  // Set all users to 'free' tier by default - no Stripe integration
  const [isLoading, setIsLoading] = useState(false);
  const [tier] = useState<string>('free');

  // Function to check if user has access to a feature
  // In the simplified version, everyone has access to all features
  const hasAccess = (featureKey: FeatureKey): boolean => {
    // For now, grant access to all features
    return true;
  };

  // No-op function - simplified implementation with no actual refresh needed
  const refreshAccess = async (): Promise<void> => {
    // No-op function
    return Promise.resolve();
  };

  // Function to check usage limits - simplified to always return true
  const checkUsageLimit = (metric: string, currentUsage: number): boolean => {
    // No usage limits - always return true
    return true;
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