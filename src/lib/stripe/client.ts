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

// Get active products from Stripe via server API
export async function getActiveProducts() {
  try {
    const response = await secureFetch('/api/stripe/products', {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching products: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error('Error getting Stripe products:', error);
    return [];
  }
}

// Get active prices from Stripe via server API
export async function getActivePrices() {
  try {
    const response = await secureFetch('/api/stripe/prices', {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error(`Error fetching prices: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.prices;
  } catch (error) {
    console.error('Error getting Stripe prices:', error);
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