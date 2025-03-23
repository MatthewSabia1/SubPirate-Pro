import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Stripe
console.log('Initializing Stripe with API key:', process.env.VITE_STRIPE_SECRET_KEY ? process.env.VITE_STRIPE_SECRET_KEY.substring(0, 8) + '...' : 'MISSING');
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Initialize Supabase client with service_role key for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? supabaseUrl : 'MISSING');
console.log('Supabase Service Role Key:', supabaseKey ? supabaseKey.substring(0, 8) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or service role key. This script requires the service role key to bypass RLS.');
  process.exit(1);
}

// Create a fresh client with schema cache disabled to ensure we see the new columns
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  }
});

/**
 * Sync all products from Stripe to Supabase
 */
async function syncProducts() {
  try {
    console.log('Starting product sync from Stripe to Supabase...');
    
    // Fetch all products from Stripe
    const stripeProducts = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price']
    });
    
    console.log(`Found ${stripeProducts.data.length} products in Stripe`);
    
    // Get set of active product IDs from Stripe
    const activeStripeProductIds = new Set(
      stripeProducts.data.map(product => product.id)
    );
    
    // Prepare product data for batch upsert
    const productsToUpsert = stripeProducts.data.map(product => ({
      stripe_product_id: product.id,
      name: product.name,
      description: product.description || '',
      active: product.active,
      metadata: product.metadata || {}
      // created_at and updated_at handled by database triggers
    }));
    
    // Batch upsert products
    if (productsToUpsert.length > 0) {
      const { error } = await supabase
        .from('stripe_products')
        .upsert(productsToUpsert, {
          onConflict: 'stripe_product_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error('Error upserting products:', error);
        throw error;
      }
      
      console.log(`Successfully upserted ${productsToUpsert.length} products`);
    } else {
      console.log('No products to upsert');
    }
    
    // Get current products from database to find those that no longer exist in Stripe
    const { data: dbProducts, error: dbError } = await supabase
      .from('stripe_products')
      .select('stripe_product_id, active');
      
    if (dbError) {
      console.error('Error fetching products from database:', dbError);
    } else {
      // Find products that exist in DB but not in Stripe
      const productsToDeactivate = dbProducts
        .filter(product => !activeStripeProductIds.has(product.stripe_product_id) && product.active)
        .map(product => product.stripe_product_id);
      
      if (productsToDeactivate.length > 0) {
        console.log(`Found ${productsToDeactivate.length} products that no longer exist in Stripe, deactivating...`);
        
        // Mark these products as inactive
        const { error: deactivateError } = await supabase
          .from('stripe_products')
          .update({ active: false })
          .in('stripe_product_id', productsToDeactivate);
          
        if (deactivateError) {
          console.error('Error deactivating obsolete products:', deactivateError);
        } else {
          console.log(`Successfully deactivated ${productsToDeactivate.length} obsolete products`);
        }
      } else {
        console.log('No obsolete products to deactivate');
      }
      
      // Get all inactive products that are older than 30 days to delete them completely
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log('Checking for old inactive products to purge...');
      const { data: oldInactiveProducts, error: oldProductsError } = await supabase
        .from('stripe_products')
        .select('stripe_product_id, updated_at')
        .eq('active', false);
        
      if (oldProductsError) {
        console.error('Error fetching old inactive products:', oldProductsError);
      } else {
        // Find products that have been inactive for more than 30 days
        const productsToDelete = oldInactiveProducts
          .filter(product => {
            const updatedAt = new Date(product.updated_at);
            return updatedAt < thirtyDaysAgo;
          })
          .map(product => product.stripe_product_id);
        
        if (productsToDelete.length > 0) {
          console.log(`Found ${productsToDelete.length} old inactive products to purge from database`);
          
          // Delete these old products
          const { error: deleteError } = await supabase
            .from('stripe_products')
            .delete()
            .in('stripe_product_id', productsToDelete);
            
          if (deleteError) {
            console.error('Error deleting old inactive products:', deleteError);
          } else {
            console.log(`Successfully purged ${productsToDelete.length} old inactive products`);
          }
        } else {
          console.log('No old inactive products to purge');
        }
      }
    }
    
    // Update the product catalog timestamp
    const { error: timestampError } = await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(new Date().toISOString()) })
      .eq('key', 'product_catalog_updated');
      
    if (timestampError) {
      console.error('Error updating product catalog timestamp:', timestampError);
    } else {
      console.log('Product catalog timestamp updated');
    }
    
    return productsToUpsert;
  } catch (error) {
    console.error('Error syncing products:', error);
    throw error;
  }
}

/**
 * Sync all prices from Stripe to Supabase
 */
async function syncPrices() {
  try {
    console.log('Starting price sync from Stripe to Supabase...');
    
    // Fetch all prices from Stripe
    const stripePrices = await stripe.prices.list({
      limit: 100,
      expand: ['data.product']
    });
    
    console.log(`Found ${stripePrices.data.length} prices in Stripe`);
    
    // Get set of active price IDs from Stripe
    const activeStripePriceIds = new Set(
      stripePrices.data.map(price => price.id)
    );
    
    // Prepare price data for batch upsert
    const pricesToUpsert = stripePrices.data.map(price => {
      // Determine the product ID
      const productId = typeof price.product === 'string' 
        ? price.product 
        : price.product?.id;
        
      // Create object with required fields only
      const priceObj = {
        id: price.id, // Must include ID field
        stripe_price_id: price.id,
        stripe_product_id: productId,
        unit_amount: price.unit_amount || 0,
        currency: price.currency,
        active: price.active
        // Omit fields that might not exist in the database yet
        // created_at and updated_at handled by database triggers
      };
      
      // Only add recurring fields if they exist
      if (price.recurring?.interval) {
        try {
          priceObj.recurring_interval = price.recurring.interval;
        } catch (e) {
          console.log('Skipping recurring_interval field as it might not exist in database');
        }
      }
      
      return priceObj;
    });
    
    // Batch upsert prices
    if (pricesToUpsert.length > 0) {
      const { error } = await supabase
        .from('stripe_prices')
        .upsert(pricesToUpsert, {
          onConflict: 'stripe_price_id',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error('Error upserting prices:', error);
        throw error;
      }
      
      console.log(`Successfully upserted ${pricesToUpsert.length} prices`);
    } else {
      console.log('No prices to upsert');
    }
    
    // Get current prices from database to find those that no longer exist in Stripe
    const { data: dbPrices, error: dbError } = await supabase
      .from('stripe_prices')
      .select('stripe_price_id, active');
      
    if (dbError) {
      console.error('Error fetching prices from database:', dbError);
    } else {
      // Find prices that exist in DB but not in Stripe
      const pricesToDeactivate = dbPrices
        .filter(price => !activeStripePriceIds.has(price.stripe_price_id) && price.active)
        .map(price => price.stripe_price_id);
      
      if (pricesToDeactivate.length > 0) {
        console.log(`Found ${pricesToDeactivate.length} prices that no longer exist in Stripe, deactivating...`);
        
        // Mark these prices as inactive
        const { error: deactivateError } = await supabase
          .from('stripe_prices')
          .update({ active: false })
          .in('stripe_price_id', pricesToDeactivate);
          
        if (deactivateError) {
          console.error('Error deactivating obsolete prices:', deactivateError);
        } else {
          console.log(`Successfully deactivated ${pricesToDeactivate.length} obsolete prices`);
        }
      } else {
        console.log('No obsolete prices to deactivate');
      }
      
      // Get all inactive prices that are older than 30 days to delete them completely
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      console.log('Checking for old inactive prices to purge...');
      const { data: oldInactivePrices, error: oldPricesError } = await supabase
        .from('stripe_prices')
        .select('stripe_price_id, updated_at')
        .eq('active', false);
        
      if (oldPricesError) {
        console.error('Error fetching old inactive prices:', oldPricesError);
      } else {
        // Find prices that have been inactive for more than 30 days
        const pricesToDelete = oldInactivePrices
          .filter(price => {
            const updatedAt = new Date(price.updated_at);
            return updatedAt < thirtyDaysAgo;
          })
          .map(price => price.stripe_price_id);
        
        if (pricesToDelete.length > 0) {
          console.log(`Found ${pricesToDelete.length} old inactive prices to purge from database`);
          
          // Delete these old prices
          const { error: deleteError } = await supabase
            .from('stripe_prices')
            .delete()
            .in('stripe_price_id', pricesToDelete);
            
          if (deleteError) {
            console.error('Error deleting old inactive prices:', deleteError);
          } else {
            console.log(`Successfully purged ${pricesToDelete.length} old inactive prices`);
          }
        } else {
          console.log('No old inactive prices to purge');
        }
      }
    }
    
    // Update the price catalog timestamp
    const { error: timestampError } = await supabase
      .from('system_settings')
      .update({ value: JSON.stringify(new Date().toISOString()) })
      .eq('key', 'price_catalog_updated');
      
    if (timestampError) {
      console.error('Error updating price catalog timestamp:', timestampError);
    } else {
      console.log('Price catalog timestamp updated');
    }
    
    return pricesToUpsert;
  } catch (error) {
    console.error('Error syncing prices:', error);
    throw error;
  }
}

/**
 * Main function to sync all Stripe data
 */
async function syncStripeData() {
  try {
    console.log('Starting full Stripe data sync...');
    
    // Sync products first
    const products = await syncProducts();
    
    // Then sync prices
    const prices = await syncPrices();
    
    console.log('Stripe data sync completed successfully');
    console.log(`Synced ${products.length} products and ${prices.length} prices`);
    
    return {
      products,
      prices
    };
  } catch (error) {
    console.error('Error during Stripe data sync:', error);
    throw error;
  }
}

// If this script is run directly, execute the sync
console.log('import.meta.url:', import.meta.url);
// Use a more reliable method to detect if the script is run directly
if (process.argv[1] === import.meta.url.substring(7)) {
  console.log('Starting Stripe data sync as main module...');
  try {
    syncStripeData()
      .then(result => {
        console.log('Sync completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('Sync failed:', error);
        process.exit(1);
      });
  } catch (error) {
    console.error('Caught synchronous error in script execution:', error);
    process.exit(1);
  }
}

// Export functions for use in other modules
export {
  syncProducts,
  syncPrices,
  syncStripeData
};