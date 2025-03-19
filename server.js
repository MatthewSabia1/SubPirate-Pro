import express from 'express';
import { createServer as createViteServer } from 'vite';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Stripe from 'stripe';

// Load environment variables first
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the appropriate webhook secret based on environment
const isProduction = process.env.NODE_ENV === 'production';
const stripeSecretKey = process.env.VITE_STRIPE_SECRET_KEY || '';
// Use the appropriate webhook secret based on environment
const webhookSecret = isProduction 
  ? process.env.VITE_STRIPE_PROD_WEBHOOK_SECRET
  : process.env.VITE_STRIPE_TEST_WEBHOOK_SECRET || process.env.VITE_STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(stripeSecretKey);

// Create a simple handler for webhook events
async function handleWebhookEvent(rawBody, signature, webhookSecret) {
  try {
    console.log('Constructing Stripe event from webhook payload');
    
    // Verify webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`✓ Webhook verified! Event type: ${stripeEvent.type}`);
    
    // Handle different event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed event');
        // TODO: Implement checkout session handling
        break;
        
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log(`Processing ${stripeEvent.type} event`);
        // TODO: Implement subscription status handling
        break;
        
      case 'invoice.payment_succeeded':
        console.log('Processing invoice.payment_succeeded event');
        // TODO: Implement invoice payment succeeded handling
        break;

      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed event');
        // TODO: Implement invoice payment failed handling
        break;

      case 'product.created':
      case 'product.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        // TODO: Implement product sync
        break;

      case 'price.created':
      case 'price.updated':
        console.log(`Processing ${stripeEvent.type} event`);
        // TODO: Implement price sync
        break;

      case 'payment_intent.succeeded':
        console.log('Processing payment_intent.succeeded event');
        // TODO: Implement payment intent succeeded handling
        break;

      case 'payment_intent.payment_failed':
        console.log('Processing payment_intent.payment_failed event');
        // TODO: Implement payment intent failed handling
        break;

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }
    
    // Log the event data for debugging
    console.log('Event data:', JSON.stringify(stripeEvent.data.object, null, 2));
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    throw error;
  }
}

async function createServer() {
  const app = express();
  
  // Setup for API endpoints that need JSON parsing
  app.use('/api', (req, res, next) => {
    // Skip JSON parsing for the webhook route
    if (req.originalUrl === '/api/stripe/webhook') {
      next();
    } else {
      express.json()(req, res, next);
    }
  });
  
  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  
  // Use vite's connect instance as middleware
  app.use(vite.middlewares);
  
  // Stripe webhook endpoint needs raw body for signature verification
  app.post('/api/stripe/webhook', 
    bodyParser.raw({ type: 'application/json' }), 
    async (req, res) => {
      try {
        console.log('Stripe webhook request received');
        
        if (!webhookSecret) {
          console.error('No webhook secret found in environment variables');
          return res.status(500).json({ error: 'Webhook secret is not configured' });
        }
        
        const signature = req.headers['stripe-signature'];

        if (!signature) {
          console.error('No Stripe signature found in headers');
          return res.status(400).json({ error: 'No signature found' });
        }

        console.log('Signature received:', signature.substring(0, 20) + '...');
        
        // Convert body to string if it's a Buffer
        const payload = req.body.toString('utf8');
        
        try {
          await handleWebhookEvent(payload, signature, webhookSecret);
          console.log('Webhook processed successfully');
          return res.status(200).json({ success: true });
        } catch (webhookError) {
          console.error('Error processing webhook:', webhookError.message);
          return res.status(400).json({ 
            error: 'Webhook handler failed', 
            message: webhookError.message 
          });
        }
      } catch (error) {
        console.error('Unexpected webhook error:', error);
        return res.status(500).json({ 
          error: 'Webhook handler failed', 
          message: error.message 
        });
      }
    }
  );
  
  // Add a test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ status: 'API routes are working' });
  });
  
  // Simple path test to verify routing is working
  app.get('/api/stripe-test', (req, res) => {
    res.json({ 
      status: 'Stripe API route is working',
      webhook_secret_configured: Boolean(webhookSecret),
      environment: isProduction ? 'production' : 'development' 
    });
  });
  
  // Start server
  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Webhook endpoint available at http://localhost:${port}/api/stripe/webhook`);
    console.log(`Using ${isProduction ? 'production' : 'test'} webhook secret: ${webhookSecret ? 'Configured ✓' : 'MISSING ✗'}`);
  });
}

createServer(); 