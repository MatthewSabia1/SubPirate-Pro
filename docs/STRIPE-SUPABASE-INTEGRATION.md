# Stripe + Supabase Integration with Basejump

This document provides a step-by-step guide to implementing Stripe subscriptions with Supabase in SubPirate using the Basejump pattern.

## Overview

We use Basejump's approach for integrating Stripe with Supabase, which provides:

1. Personal and team account management
2. Subscription and billing management
3. Feature access control based on subscription plans
4. Row Level Security (RLS) for secure data access

## Implementation Steps

### 1. Database Setup

Run the following SQL migrations in your Supabase dashboard:

1. `basejump_integration.sql` - Core Basejump schema and utility functions
2. `basejump_feature_setup.sql` - Feature definitions and Stripe product mapping
3. `basejump_feature_access.sql` - Feature access control functions

### 2. Stripe Configuration

1. Create the following products in your Stripe dashboard:
   - Free Plan
   - Starter Plan
   - Creator Plan
   - Pro Plan
   - Agency Plan

2. For each product, create a corresponding price:
   - Free: $0/month
   - Starter: $19/month
   - Creator: $34/month
   - Pro: $49/month
   - Agency: $97/month

3. Make sure the product and price IDs match the ones in `basejump_feature_setup.sql`

4. Set up Stripe webhooks with the following events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `customer.created`
   - `customer.updated`

5. Configure the webhook endpoint to point to:
   ```
   https://your-domain.com/api/stripe/webhook
   ```

### 3. Environment Variables

Add the following environment variables to your project:

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_WEBHOOK_SECRET=whsec_...
```

For production, replace test keys with live keys.

### 4. Usage in Code

The integration provides several ways to check feature access:

#### In Database Queries

```sql
SELECT * FROM some_table
WHERE public.current_user_has_feature_access('feature_key');
```

#### In React Components

```tsx
import { useFeatureAccess } from '../contexts/FeatureAccessContext';

function MyComponent() {
  const { hasAccess } = useFeatureAccess();
  
  if (!hasAccess('analyze_unlimited')) {
    return <UpgradePrompt />;
  }
  
  return <FeatureComponent />;
}
```

#### Using FeatureGate Component

```tsx
<FeatureGate feature="campaigns">
  <CampaignsFeature />
</FeatureGate>
```

## Maintenance

### Syncing Products from Stripe

We currently don't have automated syncing of products from Stripe to Supabase. To update products:

1. Edit the `basejump_feature_setup.sql` file
2. Run the SQL in your Supabase dashboard
3. Alternatively, create a script to automatically sync products

### Testing Webhooks Locally

1. Run the development server:
   ```
   npm run dev:webhook
   ```

2. Use Stripe CLI to forward webhooks:
   ```
   stripe listen --forward-to http://localhost:4242/api/stripe/webhook
   ```

## Troubleshooting

### Common Issues

1. **Missing subscription data**: Ensure Stripe webhooks are properly configured and working
2. **Feature access not updating**: Call `refreshAccess()` from the FeatureAccessContext
3. **Database errors**: Check the SQL migrations have been applied correctly

### Testing Mode

In development mode, all features are enabled by default. To test specific subscription plans:

1. Use the test Stripe dashboard to create subscriptions
2. Subscribe to different plans to test access control