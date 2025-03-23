import Stripe from 'stripe';
import { supabase } from '../supabase';
import { secureFetch, fetchCSRFToken } from '../fetch';

// Initialize Stripe client (publishable key only)
export const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.VITE_STRIPE_PUBLISHABLE_KEY || '', {
  apiVersion: '2023-10-16',
});

// Check if we're in test mode
const isTestMode = process.env.STRIPE_TEST_MODE === 'true';

// Interface for checkout session parameters
interface CreateCheckoutSessionParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  accountId?: string; // Optional for team billing
  trial?: boolean;
  trialDays?: number;
  quantity?: number;
  metadata?: Record<string, string>;
}

// Get the latest catalog update timestamp from Supabase
async function getCatalogUpdateTimestamp(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single();
      
    if (error || !data) {
      return null;
    }
    
    return typeof data.value === 'string' ? data.value : null;
  } catch (error) {
    console.error(`Error getting ${key} timestamp:`, error);
    return null;
  }
}

// Check if cached data is still valid
async function isCacheValid(cacheKey: string, timestampKey: string): Promise<boolean> {
  try {
    // Get cache from localStorage
    const cachedData = localStorage.getItem(cacheKey);
    if (!cachedData) {
      return false;
    }
    
    // Parse cached data and check if it has a validUntil field
    const parsed = JSON.parse(cachedData);
    if (!parsed.validUntil) {
      return false;
    }
    
    // Get server timestamp
    const serverTimestamp = await getCatalogUpdateTimestamp(timestampKey);
    if (!serverTimestamp) {
      // If we can't get server timestamp, check if cache is less than 15 minutes old
      return (Date.now() - parsed.timestamp) < 900000; // 15 minutes
    }
    
    // Check if cache is still valid based on server timestamp
    const serverDate = new Date(serverTimestamp).getTime();
    const cacheValidUntil = new Date(parsed.validUntil).getTime();
    
    return serverDate < cacheValidUntil;
  } catch (error) {
    console.error(`Error checking cache validity for ${cacheKey}:`, error);
    return false;
  }
}

// Get active products from Stripe via server API
export async function getActiveProducts() {
  try {
    // First check if cached data is still valid
    if (await isCacheValid('stripe_products', 'product_catalog_updated')) {
      try {
        const cachedData = localStorage.getItem('stripe_products');
        const parsed = JSON.parse(cachedData!);
        console.log('Using cached Stripe products (still valid)');
        // Filter to only return active products, even from cache
        return parsed.data.filter(product => product.active === true);
      } catch (cacheError) {
        console.error('Error parsing cached products:', cacheError);
      }
    }
    
    // If cache is invalid or not available, fetch fresh data
    const response = await secureFetch('/api/stripe/products', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching products: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter to only include active products
    const activeProducts = data.products.filter(product => product.active === true);
    
    // Cache the products in localStorage for faster access next time
    if (data.products && data.products.length > 0) {
      // Set cache validity for 1 hour
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 1);
      
      localStorage.setItem('stripe_products', JSON.stringify({
        data: data.products, // Store all products but will filter on retrieval
        timestamp: Date.now(),
        validUntil: validUntil.toISOString()
      }));
    }
    
    return activeProducts;
  } catch (error) {
    console.error('Error getting Stripe products:', error);
    
    // Try to use cached data if available
    const cachedData = localStorage.getItem('stripe_products');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        
        // Use cache if less than 1 day old as a fallback
        const isUseable = (Date.now() - parsed.timestamp) < 86400000; // 1 day
        
        if (isUseable && parsed.data.length > 0) {
          console.log('Using cached Stripe products (fallback)');
          // Still filter for active products even in fallback case
          return parsed.data.filter(product => product.active === true);
        }
      } catch (cacheError) {
        console.error('Error parsing cached products:', cacheError);
      }
    }
    
    return [];
  }
}

// Get active prices from Stripe via server API
export async function getActivePrices() {
  try {
    // First check if cached data is still valid
    if (await isCacheValid('stripe_prices', 'price_catalog_updated')) {
      try {
        const cachedData = localStorage.getItem('stripe_prices');
        const parsed = JSON.parse(cachedData!);
        console.log('Using cached Stripe prices (still valid)');
        // Filter to only return active prices, even from cache
        return parsed.data.filter(price => price.active === true);
      } catch (cacheError) {
        console.error('Error parsing cached prices:', cacheError);
      }
    }
    
    // If cache is invalid or not available, fetch fresh data
    const response = await secureFetch('/api/stripe/prices', {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching prices: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Filter to only include active prices
    const activePrices = data.prices.filter(price => price.active === true);
    
    // Cache the prices in localStorage for faster access next time
    if (data.prices && data.prices.length > 0) {
      // Set cache validity for 1 hour
      const validUntil = new Date();
      validUntil.setHours(validUntil.getHours() + 1);
      
      localStorage.setItem('stripe_prices', JSON.stringify({
        data: data.prices, // Store all prices but will filter on retrieval
        timestamp: Date.now(),
        validUntil: validUntil.toISOString()
      }));
    }
    
    return activePrices;
  } catch (error) {
    console.error('Error getting Stripe prices:', error);
    
    // Try to use cached data if available
    const cachedData = localStorage.getItem('stripe_prices');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        
        // Use cache if less than 1 day old as a fallback
        const isUseable = (Date.now() - parsed.timestamp) < 86400000; // 1 day
        
        if (isUseable && parsed.data.length > 0) {
          console.log('Using cached Stripe prices (fallback)');
          // Still filter for active prices even in fallback case
          return parsed.data.filter(price => price.active === true);
        }
      } catch (cacheError) {
        console.error('Error parsing cached prices:', cacheError);
      }
    }
    
    return [];
  }
}

// Get available subscription plans with product and price details
export async function getSubscriptionPlans() {
  try {
    // Check if either product or price cache has been invalidated
    const productCacheValid = await isCacheValid('stripe_products', 'product_catalog_updated');
    const priceCacheValid = await isCacheValid('stripe_prices', 'price_catalog_updated');
    
    // If both caches are valid, we can use cached plans
    if (productCacheValid && priceCacheValid) {
      // Check if subscription plans cache is valid
      const cachedData = localStorage.getItem('subscription_plans');
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          
          // Verify the cache has a timestamp and validUntil
          if (parsed.validUntil && parsed.data && parsed.data.length > 0) {
            const validUntil = new Date(parsed.validUntil).getTime();
            
            // If the cache is still valid, use it
            if (validUntil > Date.now()) {
              console.log('Using cached subscription plans (still valid)');
              return parsed.data;
            }
          }
        } catch (cacheError) {
          console.error('Error parsing cached plans:', cacheError);
        }
      }
    }
    
    // Get fresh products and prices from API
    const products = await getActiveProducts();
    const prices = await getActivePrices();
    
    if (!products || !prices || products.length === 0 || prices.length === 0) {
      return [];
    }
    
    // Create subscription plans by mapping products to their prices
    const plans = products.map(product => {
      // Find prices for this product
      const productPrices = prices.filter(price => 
        price.product_id === product.id && 
        price.recurring?.interval === 'month'
      );
      
      if (productPrices.length === 0) {
        return null;
      }
      
      // Get the first monthly price (could be enhanced to handle multiple)
      const price = productPrices[0];
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        priceId: price.id,
        amount: price.unit_amount / 100, // Convert from cents
        currency: price.currency,
        interval: 'month',
        metadata: product.metadata || {}
      };
    }).filter(Boolean);
    
    // Cache the results with a validity period of 1 hour
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 1);
    
    localStorage.setItem('subscription_plans', JSON.stringify({
      data: plans,
      timestamp: Date.now(),
      validUntil: validUntil.toISOString()
    }));
    
    return plans;
  } catch (error) {
    console.error('Error getting subscription plans:', error);
    
    // Try to use cached data if available as a fallback
    const cachedData = localStorage.getItem('subscription_plans');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        
        // Use cache if less than 1 day old as a fallback
        const isUseable = (Date.now() - parsed.timestamp) < 86400000; // 1 day
        
        if (isUseable && parsed.data && parsed.data.length > 0) {
          console.log('Using cached subscription plans (fallback)');
          return parsed.data;
        }
      } catch (cacheError) {
        console.error('Error parsing cached plans:', cacheError);
      }
    }
    
    return [];
  }
}

// Create a Stripe checkout session via server API
export async function createCheckoutSession({
  priceId,
  successUrl, 
  cancelUrl,
  accountId,
  trial = false,
  trialDays = 14,
  quantity = 1,
  metadata = {}
}: CreateCheckoutSessionParams) {
  try {
    // Get the authenticated user session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('User must be authenticated to create a checkout session');
    }
    
    // Get CSRF token for this operation
    const csrfToken = await fetchCSRFToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token for checkout session');
    }
    
    // Call the server API endpoint
    const response = await secureFetch('/api/stripe/create-checkout-session', {
      method: 'POST',
      csrfToken,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId,
        successUrl,
        cancelUrl,
        accountId,
        trial,
        trialDays,
        quantity,
        metadata
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create checkout session');
    }
    
    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

// Create a customer portal session for managing subscriptions via server API
export async function createCustomerPortalSession(returnUrl: string) {
  try {
    // Get the authenticated user session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('User must be authenticated to access the customer portal');
    }
    
    // Get CSRF token for this operation
    const csrfToken = await fetchCSRFToken();
    if (!csrfToken) {
      throw new Error('Failed to get CSRF token for portal session');
    }
    
    // Call the server API endpoint
    const response = await secureFetch('/api/stripe/create-portal-session', {
      method: 'POST',
      csrfToken,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        returnUrl
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create portal session');
    }
    
    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}