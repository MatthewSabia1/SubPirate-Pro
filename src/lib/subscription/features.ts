import { Database } from '../database.types'

export type FeatureKey = string;

// Define all possible feature keys
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
} as const

// Type for subscription tiers
export type SubscriptionTier = 'starter' | 'creator' | 'pro' | 'agency' | 'free'

// Map of features included in each tier
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
  creator: [
    FEATURE_KEYS.ANALYZE_SUBREDDIT, // Limited to 50 per month
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.PRIORITY_SUPPORT,
  ],
  pro: [
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
  ],
  agency: [
    FEATURE_KEYS.ANALYZE_UNLIMITED,
    FEATURE_KEYS.CREATE_PROJECT,
    FEATURE_KEYS.ADVANCED_ANALYTICS,
    FEATURE_KEYS.EXPORT_DATA,
    FEATURE_KEYS.TEAM_COLLABORATION,
    FEATURE_KEYS.CUSTOM_TRACKING,
    FEATURE_KEYS.API_ACCESS,
    FEATURE_KEYS.PRIORITY_SUPPORT,
    FEATURE_KEYS.DEDICATED_ACCOUNT,
  ],
}

// Usage limits for each tier
export const TIER_LIMITS: Record<SubscriptionTier, { [key: string]: number }> = {
  free: {
    subreddit_analysis_per_month: 3,
  },
  starter: {
    subreddit_analysis_per_month: 10,
  },
  creator: {
    subreddit_analysis_per_month: 50,
  },
  pro: {
    subreddit_analysis_per_month: Infinity,
  },
  agency: {
    subreddit_analysis_per_month: Infinity,
  },
}

// Feature descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<string, string> = {
  [FEATURE_KEYS.ANALYZE_SUBREDDIT]: 'Access to detailed subreddit analysis including marketing friendliness scores, posting requirements, and best practices',
  [FEATURE_KEYS.ANALYZE_UNLIMITED]: 'Unlimited subreddit analysis per month',
  [FEATURE_KEYS.CREATE_PROJECT]: 'Create and manage marketing projects to organize your subreddit targets',
  [FEATURE_KEYS.ADVANCED_ANALYTICS]: 'Access to advanced analytics including engagement metrics, trend analysis, and detailed reporting',
  [FEATURE_KEYS.EXPORT_DATA]: 'Export analysis data and reports in various formats',
  [FEATURE_KEYS.TEAM_COLLABORATION]: 'Invite team members and collaborate on projects',
  [FEATURE_KEYS.CUSTOM_TRACKING]: 'Set up custom tracking metrics and alerts for your subreddits',
  [FEATURE_KEYS.API_ACCESS]: 'Access to the SubPirate API for custom integrations',
  [FEATURE_KEYS.PRIORITY_SUPPORT]: 'Priority email and chat support',
  [FEATURE_KEYS.DEDICATED_ACCOUNT]: 'Dedicated account manager for your team',
}

// Helper to check if a feature is included in a tier
export function isTierFeature(tier: SubscriptionTier, feature: FeatureKey): boolean {
  return TIER_FEATURES[tier].includes(feature)
}

// Get all features for a tier
export function getTierFeatures(tier: SubscriptionTier): FeatureKey[] {
  return TIER_FEATURES[tier]
}

// Get tier from product name
export function getTierFromProductName(productName: string): SubscriptionTier {
  const name = productName.toLowerCase();
  if (name.includes('starter')) return 'starter';
  if (name.includes('creator')) return 'creator';
  if (name.includes('pro')) return 'pro';
  if (name.includes('agency')) return 'agency';
  return 'free';
}

// Check if user has reached usage limit
export function isWithinUsageLimit(tier: SubscriptionTier, metric: string, currentUsage: number): boolean {
  const limit = TIER_LIMITS[tier]?.[metric];
  if (limit === undefined) return true; // No limit defined
  return currentUsage < limit;
}

// Get friendly name for subscription tier
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case 'starter': return 'Starter Plan';
    case 'creator': return 'Creator Plan';
    case 'pro': return 'Pro Plan';
    case 'agency': return 'Agency Plan';
    default: return 'Free Plan';
  }
} 