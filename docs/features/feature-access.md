# Feature Access System

This document outlines the feature access system in SubPirate, which replaces the previous Stripe-based subscription system.

## Overview

The Feature Access system controls which features users can access in the application. In the current implementation, all features are available to all users without requiring payment.

## Visual Representation

### Feature Access Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Interface │────▶│  FeatureGate    │────▶│ Feature Content │
│  Component      │     │  Component      │     │ (if accessible) │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │ FeatureAccess   │
                        │ Context         │
                        │                 │
                        └────────┬────────┘
                                 │
                                 │
                        ┌────────▼────────┐
                        │                 │
                        │ Features.ts     │
                        │ Configuration   │
                        │                 │
                        └─────────────────┘
```

### Feature Tiers Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                      Feature Access System                       │
└───────────────┬─────────────────────────────────────────────────┘
                │
    ┌───────────▼───────────┐
    │  Subscription Tiers   │
    └─┬──────────┬──────────┬┘
      │          │          │
┌─────▼────┐ ┌───▼────┐ ┌───▼────┐
│  Free    │ │ Starter│ │ Pro    │      ... more tiers
└─────┬────┘ └───┬────┘ └───┬────┘
      │          │          │
      │    ┌─────▼──────────▼─────────┐
      │    │                          │
      └────►    Feature Registry      │
           │   (FEATURE_KEYS)         │
           │                          │
           └──────────────────────────┘
```

## Implementation

### Feature Keys

Features are identified by unique string keys:

```typescript
export const FEATURE_KEYS = {
  ANALYZE_SUBREDDIT: 'analyze_subreddit',
  ANALYZE_UNLIMITED: 'analyze_unlimited',
  CREATE_PROJECT: 'create_project',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  EXPORT_DATA: 'export_data',
  TEAM_COLLABORATION: 'team_collaboration',
  CUSTOM_TRACKING: 'custom_tracking',
  API_ACCESS: 'api_access',
  PRIORITY_SUPPORT: 'priority_support',
  DEDICATED_ACCOUNT: 'dedicated_account',
};
```

### Feature Tiers

The system defines various tiers that could be used in the future:

```typescript
export type SubscriptionTier = 'starter' | 'creator' | 'pro' | 'agency' | 'free';

export const TIER_FEATURES: Record<SubscriptionTier, FeatureKey[]> = {
  free: [
    // Free tier has limited access
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 3 per month
  ],
  starter: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 10 per month
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.EXPORT_DATA,
  ],
  // More tiers defined...
};
```

### FeatureAccessContext

A React Context provides feature access information throughout the application:

```typescript
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
```

## Usage in Components

### Feature Gates

Components can use the FeatureAccess context to gate features:

```typescript
import { useFeatureAccess } from '../lib/subscription/useFeatureAccess';
import { FEATURE_KEYS } from '../lib/subscription/features';

function FeatureGatedComponent() {
  const { hasAccess } = useFeatureAccess();
  
  if (!hasAccess(FEATURE_KEYS.ADVANCED_ANALYTICS)) {
    return <UpgradePrompt feature="Advanced Analytics" />;
  }
  
  return <AdvancedAnalyticsComponent />;
}
```

### FeatureGate Component

A reusable component makes it easy to gate content:

```typescript
import { FEATURE_KEYS } from '../lib/subscription/features';
import { useFeatureAccess } from '../lib/subscription/useFeatureAccess';

interface FeatureGateProps {
  feature: typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function FeatureGate({ feature, fallback, children }: FeatureGateProps) {
  const { hasAccess } = useFeatureAccess();
  
  if (!hasAccess(feature)) {
    return fallback || <UpgradePrompt feature={feature} />;
  }
  
  return <>{children}</>;
}
```

## Pricing Page

The application maintains a pricing page that shows various tiers, though currently all features are available for free:

```tsx
function Pricing() {
  const plans = [
    {
      name: 'Starter',
      description: 'Essential features for getting started with Reddit marketing',
      price: 0, // Free
      features: [
        'Analyze up to 10 subreddits per month',
        'Basic marketing friendliness scores',
        'Export data in CSV format',
        'Email support',
      ],
    },
    // Other plans...
  ];
  
  return (
    // Pricing UI with notification that all features are free
  );
}
```

## Future Considerations

The current implementation is designed to be easily extended in the future:

1. **Subscription Integration**: The system is already structured to support subscription-based access when needed.
2. **Usage Tracking**: The database schema includes tables for tracking feature usage.
3. **Tiered Access**: The code defines multiple tiers that could be activated.

## Migration from Stripe

The transition from Stripe involved:

1. Removing Stripe API dependencies
2. Simplifying the FeatureAccess context to grant access to all features
3. Updating UI to indicate all features are free
4. Preserving the underlying structure for potential reintroduction later