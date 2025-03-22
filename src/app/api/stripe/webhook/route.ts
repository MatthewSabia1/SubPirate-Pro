import { handleWebhookEvent } from '../../../../lib/stripe/webhook';
import { Readable } from 'stream';
import { buffer } from 'micro';

// Helper to convert Request to buffer
async function readRequestBuffer(req: Request): Promise<Buffer> {
  const arrayBuffer = await req.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// Stripe webhook handler
export async function POST(req: Request) {
  try {
    // Get the Stripe signature from headers
    const signature = req.headers.get('stripe-signature');
    
    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'Missing stripe-signature header' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get webhook secret from environment
    const webhookSecret = process.env.VITE_STRIPE_WEBHOOK_SECRET || 
                        process.env.STRIPE_WEBHOOK_SECRET;
                        
    if (!webhookSecret) {
      console.error('Missing Stripe webhook secret');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Read request body
    const rawBody = await readRequestBuffer(req);
    
    // Handle the webhook event
    await handleWebhookEvent(rawBody, signature, webhookSecret);
    
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Disable body parsing, as a precaution
export const config = {
  api: {
    bodyParser: false,
  },
};