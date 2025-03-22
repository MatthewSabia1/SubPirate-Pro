import Stripe from 'stripe';
import { supabase } from '../supabase';
import { Readable } from 'stream';
import { buffer } from 'micro';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Helper to read the request body as a buffer
export async function readBuffer(readable: Readable): Promise<Buffer> {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

// Process Stripe webhook events
export async function handleWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
  webhookSecret: string
) {
  try {
    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'customer.created':
      case 'customer.updated':
        await handleCustomerChange(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (err) {
    console.error('Webhook error:', err);
    throw new Error(`Webhook Error: ${err.message}`);
  }
}

// Handle successful checkout sessions
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  // Get the user from the client_reference_id
  const accountId = session.client_reference_id;
  if (!accountId) {
    console.error('No account ID found in session');
    return;
  }

  // Get the customer and subscription details
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID');
    return;
  }

  // Load full subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const customer = await stripe.customers.retrieve(customerId);

  // Upsert customer and subscription data using Basejump's pattern
  await upsertCustomerSubscriptionData(
    accountId,
    customer as Stripe.Customer,
    subscription
  );
}

// Handle subscription changes
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  // Get the customer ID
  const customerId = subscription.customer as string;

  // Get account ID from customer metadata if it exists
  // Otherwise find the account ID from the customer in the database
  const customerMetadata = (subscription.customer as any).metadata;
  let accountId = customerMetadata?.account_id;

  if (!accountId) {
    // Find the account ID by looking up the customer in the database
    const { data } = await supabase
      .from('basejump.billing_customers')
      .select('account_id')
      .eq('id', customerId)
      .single();
    
    if (data) {
      accountId = data.account_id;
    } else {
      console.error('No account found for customer', customerId);
      return;
    }
  }

  // Load full customer details
  const customer = await stripe.customers.retrieve(customerId);

  // Upsert customer and subscription data
  await upsertCustomerSubscriptionData(
    accountId,
    customer as Stripe.Customer,
    subscription
  );
}

// Handle subscription deletions
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  // We use the same handling as subscription changes
  await handleSubscriptionChange(subscription);
}

// Handle customer changes
async function handleCustomerChange(customer: Stripe.Customer) {
  // Get account ID from customer metadata if it exists
  const accountId = customer.metadata?.account_id;

  if (!accountId) {
    // Find the account ID by looking up the customer in the database
    const { data } = await supabase
      .from('basejump.billing_customers')
      .select('account_id')
      .eq('id', customer.id)
      .single();
    
    if (data) {
      await upsertCustomerData(data.account_id, customer);
    } else {
      console.error('No account found for customer', customer.id);
    }
  } else {
    await upsertCustomerData(accountId, customer);
  }
}

// Upsert customer data into the database
async function upsertCustomerData(accountId: string, customer: Stripe.Customer) {
  const customerData = {
    id: customer.id,
    billing_email: customer.email,
    provider: 'stripe'
  };

  await supabase.rpc(
    'service_role_upsert_customer_subscription',
    {
      account_id: accountId,
      customer: customerData
    }
  );
}

// Upsert subscription data into the database
async function upsertSubscriptionData(
  accountId: string, 
  subscription: Stripe.Subscription,
  customerId: string
) {
  // Find the product details
  const priceId = subscription.items.data[0]?.price.id;
  
  if (!priceId) {
    console.error('No price ID found in subscription');
    return;
  }

  // Get the product name from the subscription metadata or price
  const productName = subscription.items.data[0]?.price.product as string;

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

  await supabase.rpc(
    'service_role_upsert_customer_subscription',
    {
      account_id: accountId,
      subscription: subscriptionData
    }
  );
}

// Combined function to update both customer and subscription data
async function upsertCustomerSubscriptionData(
  accountId: string,
  customer: Stripe.Customer,
  subscription: Stripe.Subscription
) {
  // First upsert the customer
  await upsertCustomerData(accountId, customer);
  
  // Then upsert the subscription
  await upsertSubscriptionData(accountId, subscription, customer.id);
}