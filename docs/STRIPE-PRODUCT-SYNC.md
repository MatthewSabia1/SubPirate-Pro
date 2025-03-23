# Stripe Product/Price Synchronization

This document explains how SubPirate automatically synchronizes Stripe product and price data with the Supabase database, including the automatic handling of obsolete products.

## Overview

The Stripe product/price synchronization system ensures that any changes made to products and prices in the Stripe Dashboard are automatically reflected in the application. This eliminates the need for manual updates and ensures that users always see the most up-to-date subscription plans.

## Components

The synchronization system consists of the following components:

1. **Webhook handlers** - Process real-time events from Stripe
2. **Database tables** - Store product and price data
3. **Cache invalidation** - Ensures client caches are refreshed when data changes
4. **Manual sync script** - For initial setup and recovery
5. **Purge system** - Automatically cleans up obsolete data

## How It Works

### Automatic Synchronization via Webhooks

When products or prices are created, updated, or deleted in the Stripe Dashboard, Stripe sends webhook events to our application. The webhook handler processes these events and updates the database accordingly:

- `product.created`, `product.updated` - Add or update product in database
- `product.deleted` - Mark product as inactive in database
- `price.created`, `price.updated` - Add or update price in database
- `price.deleted` - Mark price as inactive in database

Each time a product or price changes, the system also updates a timestamp in the `system_settings` table to invalidate client-side caches.

### Obsolete Data Handling

The system handles obsolete products and prices in three stages:

1. **Deactivation**
   - Products/prices that no longer exist in Stripe are marked as inactive (`active = false`)
   - This happens during the sync process
   - Inactive items never appear in the UI

2. **Automatic Purge**
   - After 30 days, inactive products/prices are automatically purged from the database
   - This prevents database bloat and keeps the data clean
   - The 30-day grace period allows for recovery if needed

3. **Manual Purge**
   - For immediate cleanup, the `stripe:purge` script can remove all inactive items
   - This is useful when doing major catalog restructuring

### Client-Side Filtering

All client-side code has additional safeguards to ensure only active products and prices are displayed:

1. The client-side API functions filter by the `active` flag:
   ```typescript
   // Filter to only return active products, even from cache
   return data.filter(product => product.active === true);
   ```

2. The server-side API endpoints apply active filters in database queries:
   ```typescript
   // Only fetch active products from database
   .eq('active', true)
   ```

3. These multi-layer filters ensure obsolete products never appear in the UI, even if there's a sync issue.

### Client-Side Caching with Server Validation

The client-side code caches product and price data in localStorage for better performance, but validates this cache against the server timestamp before using it:

1. When the client requests product/price data, it first checks if cached data exists
2. If cache exists, it queries the server for the latest catalog update timestamp
3. If the server timestamp is newer than the cache timestamp, the cache is invalidated
4. If cache is invalid or doesn't exist, fresh data is fetched from the server

This approach provides fast access to data while ensuring users always see the most current information.

### Manual Synchronization

For initial setup, recovery from webhook failures, or forcing immediate catalog updates, you can run a manual sync:

```bash
npm run stripe:sync
```

This command will:
1. Fetch all products and prices from Stripe
2. Upsert them into the Supabase database
3. Mark products/prices that no longer exist in Stripe as inactive
4. Update the catalog timestamps

## Database Schema

The system uses the following tables in the Supabase database:

### stripe_products

Stores information about Stripe products:

| Column             | Type          | Description                           |
|--------------------|---------------|---------------------------------------|
| id                 | UUID          | Primary key                           |
| stripe_product_id  | TEXT          | Unique ID from Stripe                 |
| name               | TEXT          | Product name                          |
| description        | TEXT          | Product description                   |
| active             | BOOLEAN       | Whether the product is active         |
| metadata           | JSONB         | Additional product metadata           |
| created_at         | TIMESTAMP     | When the product was created          |
| updated_at         | TIMESTAMP     | When the product record was last updated |

### stripe_prices

Stores information about Stripe prices:

| Column                  | Type          | Description                       |
|-------------------------|---------------|-----------------------------------|
| id                      | TEXT          | Primary key (Stripe ID)           |
| stripe_price_id         | TEXT          | Stripe price ID                   |
| stripe_product_id       | TEXT          | ID of the associated product      |
| unit_amount             | INTEGER       | Price amount in cents             |
| currency                | TEXT          | Price currency                    |
| active                  | BOOLEAN       | Whether the price is active       |
| recurring_interval      | TEXT          | Billing interval (month, year)    |
| recurring_interval_count| INTEGER       | Number of intervals               |
| created_at              | TIMESTAMP     | When the price was created        |
| updated_at              | TIMESTAMP     | When the price record was last updated |

### system_settings

Stores system-wide settings, including catalog update timestamps:

| Column             | Type          | Description                           |
|--------------------|---------------|---------------------------------------|
| id                 | UUID          | Primary key                           |
| key                | TEXT          | Setting key (e.g., `product_catalog_updated`) |
| value              | JSONB         | Setting value (timestamp as JSON string) |
| created_at         | TIMESTAMP     | When the setting was created          |
| updated_at         | TIMESTAMP     | When the setting was last updated     |

## Available Scripts

The system provides several scripts for managing the product/price catalog:

1. **Sync Script**
   ```bash
   npm run stripe:sync
   ```
   Fetches all products and prices from Stripe, updates the database, and handles obsolete items.

2. **Test Script**
   ```bash
   npm run stripe:test-sync
   ```
   Tests the current state of the sync system, showing products/prices in both Stripe and the database.

3. **Purge Script**
   ```bash
   npm run stripe:purge
   ```
   Immediately removes all inactive products and prices from the database.

## Configuration

The synchronization system requires the following environment variables:

- `VITE_STRIPE_SECRET_KEY` - Stripe API secret key
- `VITE_STRIPE_WEBHOOK_SECRET` - Webhook signing secret for verifying events
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key for client
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for admin operations

## Testing

To test the synchronization system:

1. Make a change to a product or price in the Stripe Dashboard
2. Check the server logs for webhook processing
3. Verify that the change is reflected in the Supabase database
4. Clear client-side cache and confirm the updated data appears in the UI

To test the purge system:

1. Mark a product as inactive in Stripe
2. Run the sync script to mark it inactive in the database
3. Run the purge script to remove it completely
4. Verify it no longer exists in the database

## Troubleshooting

If products or prices are not synchronizing properly:

1. Check webhook logs for errors
2. Verify webhook endpoint is properly configured in Stripe
3. Confirm the webhook secret is correctly set in environment variables
4. Run the manual sync script to refresh all data:
   ```bash
   npm run stripe:sync
   ```
5. Check the `system_settings` table for correct timestamp updates

If old products or prices still appear in the UI:

1. Run the purge script to remove inactive items:
   ```bash
   npm run stripe:purge
   ```
2. Clear browser localStorage to refresh client cache
3. Verify that server-side API endpoints are filtering by `active = true`
4. Check client-side code is properly filtering inactive items

## Implementation Details

### Sync Script Logic

The sync script follows this process:

1. Fetch all products and prices from Stripe
2. Upsert them into the Supabase database
3. Find products/prices in the database that no longer exist in Stripe
4. Mark these obsolete items as inactive
5. Find products/prices that have been inactive for over 30 days
6. Delete these old inactive items from the database
7. Update the catalog timestamps to invalidate client caches

### Client-Side Logic

The client-side code:

1. Attempts to retrieve cached data from localStorage
2. Validates the cache against server timestamps
3. If invalid, fetches fresh data from the server
4. Filters data to ensure only active products/prices are used
5. Stores the complete dataset in cache, but always filters on retrieval
6. Provides a fallback mechanism for offline or server error scenarios