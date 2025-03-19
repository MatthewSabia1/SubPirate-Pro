import { handleWebhookEvent } from '../../../../lib/stripe/webhook';

// Simplified webhook handler (Stripe integration removed)
export async function POST() {
  console.log('Stripe webhook functionality has been removed');
  
  return new Response(
    JSON.stringify({ success: true, message: 'Stripe integration has been removed' }),
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Disable body parsing, as a precaution
export const config = {
  api: {
    bodyParser: false,
  },
};