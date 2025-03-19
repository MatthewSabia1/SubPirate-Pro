import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Use JSON parser for all routes except the webhook
app.use(bodyParser.json());

// Simplified webhook route (Stripe integration removed)
app.post('/api/stripe/webhook', (req, res) => {
  console.log('Webhook request received (Stripe integration removed)');
  return res.status(200).json({ 
    success: true, 
    message: 'Stripe webhook functionality has been removed' 
  });
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ status: 'API routes are working' });
});

// Start server on a different port to avoid conflicts with Vite
const port = 4242;
app.listen(port, () => {
  console.log(`Webhook server running at http://localhost:${port}`);
  console.log(`Webhook endpoint available at http://localhost:${port}/api/stripe/webhook`);
  console.log('Stripe integration has been removed');
});