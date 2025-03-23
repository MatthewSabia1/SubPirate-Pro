import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Supabase client with service_role key for admin access
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or service role key. This script requires the service role key to bypass RLS.');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public'
  }
});

/**
 * Purge inactive products and prices from the database
 */
async function purgeInactiveStripeData() {
  try {
    console.log('Starting purge of inactive Stripe data...');
    
    // Step 1: Purge inactive prices
    const { data: inactivePrices, error: priceError } = await supabase
      .from('stripe_prices')
      .select('id, stripe_price_id')
      .eq('active', false);
      
    if (priceError) {
      console.error('Error fetching inactive prices:', priceError);
    } else {
      console.log(`Found ${inactivePrices.length} inactive prices to purge`);
      
      if (inactivePrices.length > 0) {
        const pricesToDelete = inactivePrices.map(price => price.stripe_price_id);
        
        // Delete inactive prices
        const { error: deleteError } = await supabase
          .from('stripe_prices')
          .delete()
          .in('stripe_price_id', pricesToDelete);
          
        if (deleteError) {
          console.error('Error deleting inactive prices:', deleteError);
        } else {
          console.log(`Successfully purged ${pricesToDelete.length} inactive prices`);
        }
      }
    }
    
    // Step 2: Purge inactive products
    const { data: inactiveProducts, error: productError } = await supabase
      .from('stripe_products')
      .select('stripe_product_id')
      .eq('active', false);
      
    if (productError) {
      console.error('Error fetching inactive products:', productError);
    } else {
      console.log(`Found ${inactiveProducts.length} inactive products to purge`);
      
      if (inactiveProducts.length > 0) {
        const productsToDelete = inactiveProducts.map(product => product.stripe_product_id);
        
        // Delete inactive products
        const { error: deleteError } = await supabase
          .from('stripe_products')
          .delete()
          .in('stripe_product_id', productsToDelete);
          
        if (deleteError) {
          console.error('Error deleting inactive products:', deleteError);
        } else {
          console.log(`Successfully purged ${productsToDelete.length} inactive products`);
        }
      }
    }
    
    console.log('Purge operation completed');
    
  } catch (error) {
    console.error('Error purging inactive Stripe data:', error);
    throw error;
  }
}

// Run the purge function
purgeInactiveStripeData()
  .then(() => {
    console.log('Purge completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Purge failed:', error);
    process.exit(1);
  });