import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import Stripe from 'stripe';
import cookieParser from 'cookie-parser';
import { randomBytes } from 'crypto';
import fetch from 'node-fetch';

// Import services
// In production, these would be compiled from TypeScript to JavaScript
// For simplicity and compatibility in production, we're using dynamic imports
let RedditPostingService;
let CampaignScheduler;

// We'll initialize these services after everything is set up

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Initialize Sentry error tracking (if configured)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express.js middleware tracing
      new Sentry.Integrations.Express({ app }),
      // Enable performance profiling
      new ProfilingIntegration(),
    ],
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    tracesSampleRate: 1.0,
    // Set profilesSampleRate to 1.0 to profile all transactions
    profilesSampleRate: 1.0,
    // Enable debug mode in development
    debug: process.env.NODE_ENV !== 'production',
  });

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler());
  // TracingHandler creates a trace for every incoming request
  app.use(Sentry.Handlers.tracingHandler());
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "js.stripe.com", "*.openrouter.ai"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "*.imgur.com", "*.redd.it", "*.redditstatic.com", "*.stripe.com", "*.supabase.co"],
      connectSrc: [
        "'self'", 
        "*.supabase.co", 
        "*.supabase.in", 
        "*.stripe.com", 
        "*.openrouter.ai", 
        "*.reddit.com", 
        "api.openai.com",
        process.env.VITE_SUPABASE_URL || ''
      ],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "*.imgur.com", "*.redd.it"],
      frameSrc: ["'self'", "js.stripe.com", "hooks.stripe.com"],
      upgradeInsecureRequests: [],
    },
  },
  // Set other security headers
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 15552000, // 180 days in seconds
    includeSubDomains: true,
    preload: true
  }
}));

app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    /\.subpirate\.com$/
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'stripe-signature', 'X-CSRF-Token'],
  credentials: true
}));

// Add cookie parser middleware (required for CSRF)
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    success: false, 
    message: 'Too many requests, please try again later.' 
  }
});
app.use(limiter);

// Body parsing middleware for normal routes
app.use((req, res, next) => {
  // Skip body parsing for Stripe webhook endpoint
  if (req.originalUrl === '/api/stripe/webhook') {
    next();
  } else {
    bodyParser.json({ limit: '1mb' })(req, res, next);
  }
});

// Create Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Get service role key from environment
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY;

// Verify required environment variables
if (!serviceRoleKey) {
  console.error('Missing Supabase service role key. Set VITE_SUPABASE_SERVICE_KEY in your .env file.');
  process.exit(1);
}

if (!supabaseUrl) {
  console.error('Missing Supabase URL. Set VITE_SUPABASE_URL in your .env file.');
  process.exit(1);
}

// Create Supabase client, using service role key for scheduler
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize Stripe
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Logger middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${req.method} ${req.originalUrl} - ${req.ip}\n`;
  
  // Log to console
  console.log(logEntry.trim());
  
  // Log to file with date-based rotation
  const today = new Date().toISOString().split('T')[0];
  const logFilePath = path.join(logsDir, `access-${today}.log`);
  
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) console.error('Failed to write to log file:', err);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'API routes are working',
    scheduler: 'active',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add Stripe webhook handler function
async function handleStripeWebhook(event) {
  console.log(`Processing Stripe webhook event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        
        // Get account ID from the client_reference_id
        const accountId = session.client_reference_id;
        if (!accountId) {
          console.error('No account ID found in session');
          return;
        }
        
        // Get the customer and subscription details
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        if (!customerId || !subscriptionId) {
          console.error('Missing customer or subscription ID');
          return;
        }
        
        // Load full subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const customer = await stripe.customers.retrieve(customerId);
        
        // Update customer and subscription records in database atomically
        await updateStripeCustomerAndSubscriptionAtomic(accountId, customer, subscription);
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        const customer_id = updatedSubscription.customer;
        
        // Get account ID for this customer
        const { data: customerData } = await supabase
          .from('basejump.billing_customers')
          .select('account_id')
          .eq('id', customer_id)
          .single();
          
        if (!customerData?.account_id) {
          console.error('No account found for customer', customer_id);
          return;
        }
        
        // Load full customer details
        const customerObj = await stripe.customers.retrieve(customer_id);
        
        // Update customer and subscription data atomically
        await updateStripeCustomerAndSubscriptionAtomic(customerData.account_id, customerObj, updatedSubscription);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        const deletedCustomerId = deletedSubscription.customer;
        
        // Get account ID for this customer
        const { data: deletedCustomerData } = await supabase
          .from('basejump.billing_customers')
          .select('account_id')
          .eq('id', deletedCustomerId)
          .single();
          
        if (!deletedCustomerData?.account_id) {
          console.error('No account found for customer', deletedCustomerId);
          return;
        }
        
        // Load full customer details to ensure we have the latest data
        const deletedCustomerObj = await stripe.customers.retrieve(deletedCustomerId);
        
        // Update customer and subscription records atomically
        await updateStripeCustomerAndSubscriptionAtomic(deletedCustomerData.account_id, deletedCustomerObj, deletedSubscription);
        break;
        
      case 'customer.created':
      case 'customer.updated':
        const updatedCustomer = event.data.object;
        
        // Check if we already have this customer in our database
        const { data: existingCustomer } = await supabase
          .from('basejump.billing_customers')
          .select('account_id')
          .eq('id', updatedCustomer.id)
          .single();
          
        if (existingCustomer?.account_id) {
          // Update only the customer data using atomic function
          await updateStripeCustomerAtomic(existingCustomer.account_id, updatedCustomer);
        } else {
          console.log('Customer not found in database, skipping update');
        }
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return { success: true };
  } catch (err) {
    console.error('Error handling webhook:', err);
    throw new Error(`Webhook Error: ${err.message}`);
  }
}

// Helper functions for updating Stripe data with transaction support
async function updateStripeCustomerAtomic(accountId, customer) {
  const customerData = {
    id: customer.id,
    billing_email: customer.email,
    provider: 'stripe'
  };
  
  // Use the new atomic function to update customer data
  await supabase.rpc('service_role_upsert_customer_subscription_atomic', {
    account_id: accountId,
    customer: customerData,
    subscription: null
  });
}

async function updateStripeSubscriptionAtomic(accountId, subscription, customerId) {
  // Get the product details
  const priceId = subscription.items.data[0]?.price.id;
  
  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }
  
  // Get the product name
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  
  const productName = price.product.name;
  
  // Prepare subscription data
  const subscriptionData = {
    id: subscription.id,
    billing_customer_id: customerId,
    status: subscription.status,
    price_id: priceId,
    plan_name: productName,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    created: new Date(subscription.created * 1000).toISOString(),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    ended_at: subscription.ended_at 
      ? new Date(subscription.ended_at * 1000).toISOString() 
      : null,
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
    cancel_at: subscription.cancel_at 
      ? new Date(subscription.cancel_at * 1000).toISOString() 
      : null,
    metadata: subscription.metadata,
    provider: 'stripe'
  };
  
  // Use the new atomic function to update subscription data
  await supabase.rpc('service_role_upsert_customer_subscription_atomic', {
    account_id: accountId,
    customer: null,
    subscription: subscriptionData
  });
}

// Function to update both customer and subscription data atomically in a single transaction
async function updateStripeCustomerAndSubscriptionAtomic(accountId, customer, subscription) {
  // Get the product details for the subscription
  const priceId = subscription.items.data[0]?.price.id;
  
  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }
  
  // Get the product name
  const price = await stripe.prices.retrieve(priceId, {
    expand: ['product']
  });
  
  const productName = price.product.name;
  
  // Prepare customer data
  const customerData = {
    id: customer.id,
    billing_email: customer.email,
    provider: 'stripe'
  };
  
  // Prepare subscription data
  const subscriptionData = {
    id: subscription.id,
    billing_customer_id: customer.id,
    status: subscription.status,
    price_id: priceId,
    plan_name: productName,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    created: new Date(subscription.created * 1000).toISOString(),
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_start: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000).toISOString() 
      : null,
    trial_end: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000).toISOString() 
      : null,
    ended_at: subscription.ended_at 
      ? new Date(subscription.ended_at * 1000).toISOString() 
      : null,
    canceled_at: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000).toISOString() 
      : null,
    cancel_at: subscription.cancel_at 
      ? new Date(subscription.cancel_at * 1000).toISOString() 
      : null,
    metadata: subscription.metadata,
    provider: 'stripe'
  };
  
  // Use the combined atomic function to update both customer and subscription data in a single transaction
  await supabase.rpc('service_role_update_customer_and_subscription_atomic', {
    account_id: accountId,
    customer: customerData,
    subscription: subscriptionData
  });
}

// For backward compatibility, retain the old functions but make them use the new atomic ones
async function updateStripeCustomer(accountId, customer) {
  return updateStripeCustomerAtomic(accountId, customer);
}

async function updateStripeSubscription(accountId, subscription, customerId) {
  return updateStripeSubscriptionAtomic(accountId, subscription, customerId);
}

// Raw body parser for Stripe webhooks
const rawBodyParser = bodyParser.raw({ type: 'application/json' });

// Stripe webhook endpoint
app.post('/api/stripe/webhook', rawBodyParser, async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'];
    
    if (!sig) {
      return res.status(400).json({
        success: false,
        message: 'Missing stripe-signature header'
      });
    }
    
    // Get webhook secret from environment
    const webhookSecret = process.env.VITE_STRIPE_WEBHOOK_SECRET || 
                        process.env.STRIPE_WEBHOOK_SECRET;
                        
    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret');
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    // Verify webhook signature and parse event
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      webhookSecret
    );
    
    // Process the webhook event
    await handleStripeWebhook(event);
    
    // Send successful response
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook error:', err);
    
    // Log to Sentry if available
    if (Sentry) {
      Sentry.captureException(err);
    }
    
    return res.status(400).json({
      success: false,
      message: 'Webhook error',
      error: process.env.NODE_ENV === 'production' 
        ? 'Webhook processing failed' 
        : err.message
    });
  }
});

// Endpoint to manually trigger the campaign scheduler
app.post('/api/campaigns/process', isAuthenticated, async (req, res) => {
  try {
    console.log('Manual trigger of campaign processing by user:', req.user.id);
    await CampaignScheduler.checkScheduledPosts();
    res.json({ 
      success: true, 
      message: 'Campaign processing triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing campaigns:', error);
    
    // Log error to Sentry if available
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error processing campaigns',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Create an endpoint to check upcoming posts (for debugging)
app.get('/api/campaigns/scheduled', isAuthenticated, async (req, res) => {
  try {
    // Get posts scheduled in the next 24 hours
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { data, error } = await supabase
      .from('campaign_posts')
      .select(`
        id, title, content_type, status, scheduled_for,
        campaign:campaigns(id, name),
        subreddit:subreddits(id, name),
        reddit_account:reddit_accounts(id, username)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_for', now.toISOString())
      .lte('scheduled_for', tomorrow.toISOString())
      .order('scheduled_for', { ascending: true });
      
    if (error) throw error;
    
    res.json({
      success: true,
      count: data.length,
      posts: data.map(post => ({
        id: post.id,
        title: post.title,
        campaign: post.campaign?.name,
        subreddit: post.subreddit?.name,
        reddit_account: post.reddit_account?.username,
        content_type: post.content_type,
        status: post.status,
        scheduled_for: post.scheduled_for
      }))
    });
  } catch (error) {
    console.error('Error fetching scheduled posts:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching scheduled posts',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Set up authentication check middleware for protected routes
const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the token with Supabase
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    }
    
    // Store the user in the request for later use
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Set up CSRF protection middleware
// We'll use a token based approach that works well with APIs and SPA frontends
const csrfProtection = (req, res, next) => {
  // Skip CSRF check for these routes
  const exemptPaths = [
    '/health', 
    '/api/test', 
    '/api/stripe/webhook',
    '/api/csrf-token' // Exempt the CSRF token endpoint itself
  ];
  
  if (exemptPaths.includes(req.path) || req.path.startsWith('/auth/')) {
    return next();
  }

  // For GET requests, generate and provide a new CSRF token
  if (req.method === 'GET') {
    try {
      // Generate a new token
      const csrfToken = randomBytes(32).toString('hex');
      
      // Set the token in a cookie with appropriate security settings
      res.cookie('csrf_token', csrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax' to make it work with redirects
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      // Store the token for validation in stateful operations
      res.locals.csrfToken = csrfToken;
    } catch (error) {
      console.error('Error generating CSRF token:', error);
      // Don't block the request on token generation error
    }
    return next();
  }
  
  // For state-changing operations (POST, PUT, DELETE), verify the token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const cookieToken = req.cookies?.csrf_token;
    const headerToken = req.headers['x-csrf-token'];
    
    // Skip CSRF check during development if explicitly disabled
    if (process.env.NODE_ENV === 'development' && process.env.DISABLE_CSRF === 'true') {
      console.warn('⚠️ WARNING: CSRF protection is disabled in development mode');
      return next();
    }
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      console.error('CSRF token validation failed:',
        !cookieToken ? 'Missing cookie token' : 
        !headerToken ? 'Missing header token' : 
        'Token mismatch');
        
      return res.status(403).json({
        success: false,
        message: 'CSRF token validation failed'
      });
    }
    
    // Generate a new token after successful validation for enhanced security
    try {
      const newCsrfToken = randomBytes(32).toString('hex');
      res.cookie('csrf_token', newCsrfToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Changed from 'strict' to 'lax'
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
    } catch (error) {
      console.error('Error rotating CSRF token:', error);
      // Continue anyway as the validation passed
    }
    
    return next();
  }
  
  // For any other HTTP methods
  next();
};

// Apply CSRF protection to all routes
app.use(csrfProtection);

// Protected route for campaign management
app.get('/api/campaigns/stats', isAuthenticated, async (req, res) => {
  try {
    // Get stats for the authenticated user's campaigns
    const { data, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('user_id', req.user.id);
      
    if (error) throw error;
    
    res.json({
      success: true,
      campaigns: data
    });
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching campaign stats' 
    });
  }
});

// Stripe API endpoints for client

// Get active products from Stripe
app.get('/api/stripe/products', isAuthenticated, async (req, res) => {
  try {
    const products = await stripe.products.list({
      active: true,
      expand: ['data.default_price'],
    });
    res.json({ 
      success: true, 
      products: products.data 
    });
  } catch (error) {
    console.error('Error getting Stripe products:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Stripe products',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Get active prices from Stripe
app.get('/api/stripe/prices', isAuthenticated, async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    res.json({ 
      success: true, 
      prices: prices.data 
    });
  } catch (error) {
    console.error('Error getting Stripe prices:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Stripe prices',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Create a checkout session
app.post('/api/stripe/create-checkout-session', isAuthenticated, async (req, res) => {
  try {
    const { 
      priceId, 
      successUrl, 
      cancelUrl, 
      accountId, 
      trial, 
      trialDays, 
      quantity, 
      metadata 
    } = req.body;
    
    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: priceId, successUrl, or cancelUrl'
      });
    }
    
    // Use the authenticated user
    const user = req.user;
    
    // Use provided accountId or default to user's personal account (their user id)
    const checkoutAccountId = accountId || user.id;
    
    // Get user's profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();
    
    const userEmail = profile?.email || user.email;
    
    // Check if there's already a customer record for this account
    const { data: existingCustomer } = await supabase
      .from('basejump.billing_customers')
      .select('id')
      .eq('account_id', checkoutAccountId)
      .single();
    
    // Session parameters
    const params = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: quantity || 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: checkoutAccountId,
      metadata: {
        account_id: checkoutAccountId,
        ...(metadata || {}),
      },
    };
    
    // Add customer email if available
    if (userEmail) {
      params.customer_email = userEmail;
    }
    
    // If we have an existing customer, use it
    if (existingCustomer?.id) {
      params.customer = existingCustomer.id;
    }
    
    // Add trial if enabled
    if (trial && trialDays > 0) {
      params.subscription_data = {
        trial_period_days: trialDays,
      };
    }
    
    // Create the checkout session
    const session = await stripe.checkout.sessions.create(params);
    
    res.json({ 
      success: true, 
      session 
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating checkout session',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Create a customer portal session
app.post('/api/stripe/create-portal-session', isAuthenticated, async (req, res) => {
  try {
    const { returnUrl } = req.body;
    
    if (!returnUrl) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: returnUrl'
      });
    }
    
    // Get the authenticated user
    const user = req.user;
    
    // Get the customer ID from the database
    const { data: accountData } = await supabase.rpc(
      'get_personal_account'
    );
    
    if (!accountData?.billing_customer_id) {
      return res.status(404).json({
        success: false,
        message: 'No billing customer found for this account'
      });
    }
    
    // Create the portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: accountData.billing_customer_id,
      return_url: returnUrl,
    });
    
    res.json({ 
      success: true, 
      session 
    });
  } catch (error) {
    console.error('Error creating portal session:', error);
    
    if (Sentry) {
      Sentry.captureException(error);
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error creating customer portal session',
      error: process.env.NODE_ENV === 'production' 
        ? 'An internal server error occurred' 
        : error.message
    });
  }
});

// Endpoint to get CSRF token for the client
app.get('/api/csrf-token', (req, res) => {
  try {
    // Generate a fresh token for the client
    const csrfToken = randomBytes(32).toString('hex');
    
    // Set it in a cookie
    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // 'lax' is more compatible than 'strict'
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    
    // Also return it in the response
    res.json({ 
      success: true, 
      csrfToken 
    });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate CSRF token'
    });
  }
});

// OpenRouter API Routes
app.post('/api/openrouter/analyze-subreddit', isAuthenticated, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data || !data.name) {
      return res.status(400).json({ error: 'Missing required data for subreddit analysis' });
    }
    
    const prompt = buildAnalysisPrompt(data);
    const modelName = 'nvidia/llama-3.1-nemotron-70b-instruct:free';
    
    // Get the API key from environment variable, not hardcoded
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'SubPirate - Reddit Marketing Analysis',
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://subpirate.app'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: req.body.systemPrompt || 'You are an expert Reddit marketing analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 35000,
        stream: false,
        response_format: req.body.responseFormat || { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return res.status(response.status).json({ 
        error: `OpenRouter API error: ${response.status} - ${errorText || response.statusText}` 
      });
    }
    
    const result = await response.json();
    
    res.json(result);
  } catch (error) {
    console.error('Error in OpenRouter API:', error);
    res.status(500).json({ error: error.message || 'Error processing request' });
  }
});

app.post('/api/openrouter/generate-title', isAuthenticated, async (req, res) => {
  try {
    const { subredditName, contentSummary, subredditDescription } = req.body;
    
    if (!subredditName || !contentSummary) {
      return res.status(400).json({ error: 'Missing required data for title generation' });
    }
    
    // Get the API key from environment variable, not hardcoded
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }
    
    const prompt = `
Generate an engaging Reddit post title for r/${subredditName}.

Subreddit description: ${subredditDescription || 'Not available'}
Content summary: ${contentSummary}

The title should:
- Be attention-grabbing but not clickbait
- Follow standard Reddit title conventions 
- Be concise (under 100 characters if possible)
- Match the subreddit's typical tone
- Avoid any special characters like emojis

Return ONLY the title text, nothing else.`;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'SubPirate - Reddit Title Generation',
        'Content-Type': 'application/json',
        'HTTP-Referer': req.headers.origin || 'https://subpirate.app'
      },
      body: JSON.stringify({
        model: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
        messages: [
          { role: 'system', content: 'You are an expert at creating engaging Reddit post titles.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 100,
        stream: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      
      return res.status(response.status).json({ 
        error: `OpenRouter API error: ${response.status} - ${errorText || response.statusText}` 
      });
    }
    
    const result = await response.json();
    
    // Extract the generated title from the response
    const title = result.choices?.[0]?.message?.content?.trim() || '';
    
    res.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    res.status(500).json({ error: error.message || 'Error generating title' });
  }
});

// Helper function to build the analysis prompt
function buildAnalysisPrompt(data) {
  return `Analyze the following subreddit for marketing potential:

Subreddit: r/${data.name}
Title: ${data.title || 'N/A'}
Description: ${data.description || 'N/A'}
Rules: ${JSON.stringify(data.rules || [])}
${data.content_categories ? `Content Categories: ${data.content_categories.join(', ')}` : ''}
${data.requires_approval ? 'Posts require manual approval' : ''}
${data.karma_required ? 'Minimum karma required for posting' : ''}
${data.account_age_required ? 'Minimum account age required for posting' : ''}

Analyze this subreddit for marketing potential. Consider the rules, posting requirements, and any content restrictions.`;
}

// The error handler must be before any other error middleware and after all controllers
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// Catch-all error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    message: 'API endpoint not found' 
  });
});

// Dynamically import the services
async function initializeServices() {
  try {
    console.log('Initializing services...');
    
    // First try TypeScript files (development)
    try {
      const RedditModule = await import('./src/features/campaigns/services/reddit.ts');
      const SchedulerModule = await import('./src/features/campaigns/services/scheduler.ts');
      
      RedditPostingService = RedditModule.RedditPostingService;
      CampaignScheduler = SchedulerModule.CampaignScheduler;
      
      console.log('Loaded services from TypeScript files');
    } catch (tsError) {
      // If TypeScript import fails, try JavaScript (production)
      try {
        console.log('TypeScript import failed, trying JavaScript files...');
        
        const RedditModule = await import('./dist/features/campaigns/services/reddit.js');
        const SchedulerModule = await import('./dist/features/campaigns/services/scheduler.js');
        
        RedditPostingService = RedditModule.RedditPostingService;
        CampaignScheduler = SchedulerModule.CampaignScheduler;
        
        console.log('Loaded services from JavaScript files');
      } catch (jsError) {
        // If both fail, load directly (development without extension)
        try {
          console.log('JavaScript import failed, trying direct import...');
          
          const RedditModule = await import('./src/features/campaigns/services/reddit');
          const SchedulerModule = await import('./src/features/campaigns/services/scheduler');
          
          RedditPostingService = RedditModule.RedditPostingService;
          CampaignScheduler = SchedulerModule.CampaignScheduler;
          
          console.log('Loaded services from direct import');
        } catch (directError) {
          console.error('All import methods failed:', directError);
          throw new Error('Could not load required services');
        }
      }
    }
    
    // Start the campaign scheduler
    console.log('Starting campaign scheduler...');
    const schedulerInterval = CampaignScheduler.startScheduler();
    
    return schedulerInterval;
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Check credentials
const redditCredentialsOk = process.env.VITE_REDDIT_APP_ID && process.env.VITE_REDDIT_APP_SECRET;
const stripeCredentialsOk = process.env.VITE_STRIPE_SECRET_KEY && process.env.VITE_STRIPE_WEBHOOK_SECRET;

// Start server on a different port to avoid conflicts with Vite
const port = process.env.WEBHOOK_SERVER_PORT || 4242;
let server;

// Initialize services and start server
(async () => {
  // Initialize services first
  const schedulerInterval = await initializeServices();
  
  // Then start the server
  server = app.listen(port, () => {
    console.log(`
========================================================
🚀 Server Started
========================================================
Server: http://localhost:${port}
Health Check: http://localhost:${port}/health
Stripe Webhook: http://localhost:${port}/api/stripe/webhook
Campaign Process: http://localhost:${port}/api/campaigns/process
View Scheduled: http://localhost:${port}/api/campaigns/scheduled
========================================================
Status:
- Campaign scheduler: ${schedulerInterval ? '✅ ACTIVE' : '❌ FAILED'}
- Environment: ${process.env.NODE_ENV || 'development'}
- Reddit API credentials: ${redditCredentialsOk ? '✅ FOUND' : '❌ MISSING'}
- Stripe API credentials: ${stripeCredentialsOk ? '✅ FOUND' : '❌ MISSING'}
- Supabase credentials: ${supabaseUrl && supabaseKey ? '✅ FOUND' : '❌ MISSING'}
- Sentry error tracking: ${process.env.SENTRY_DSN ? '✅ ENABLED' : '❌ DISABLED'}
========================================================
`);
  });
})().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n🛑 Received shutdown signal, gracefully shutting down...');
  
  // Variable to track if CampaignScheduler is available
  let schedulerStopped = false;
  
  // Clear the scheduler interval if available
  if (CampaignScheduler && CampaignScheduler._schedulerInterval) {
    clearInterval(CampaignScheduler._schedulerInterval);
    schedulerStopped = true;
    console.log('✅ Campaign scheduler stopped');
  }
  
  if (!schedulerStopped) {
    console.log('ℹ️ Campaign scheduler was not running');
  }
  
  // Close the express server
  if (server) {
    server.close(() => {
      console.log('✅ Express server closed');
      
      // Flush any pending Sentry events
      if (Sentry) {
        Sentry.close(2000).then(() => {
          console.log('✅ Sentry events flushed');
          process.exit(0);
        }).catch(e => {
          console.error('❌ Error flushing Sentry events:', e);
          process.exit(1);
        });
      } else {
        process.exit(0);
      }
    });
  } else {
    console.log('ℹ️ Express server was not running');
    process.exit(0);
  }
  
  // Force close after 10 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}