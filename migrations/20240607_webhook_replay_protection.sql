-- Migration: Add Stripe webhook event tracking for replay protection
-- Description: Creates a table to track processed webhook events and adds indexes for efficient lookups

-- Create the stripe_webhook_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  idempotency_key TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Add UNIQUE constraint on event_id to prevent duplicates
  CONSTRAINT stripe_webhook_events_event_id_unique UNIQUE (event_id)
);

-- Add indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id ON stripe_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_idempotency_key ON stripe_webhook_events(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_created_at ON stripe_webhook_events(created_at);

-- Create a function that automatically purges old webhook events
CREATE OR REPLACE FUNCTION purge_old_webhook_events() RETURNS void AS $$
BEGIN
  -- Delete webhook events older than 30 days
  DELETE FROM stripe_webhook_events
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comment on table and columns for documentation
COMMENT ON TABLE stripe_webhook_events IS 'Tracks processed Stripe webhook events to prevent replay attacks';
COMMENT ON COLUMN stripe_webhook_events.event_id IS 'Unique identifier for the Stripe event';
COMMENT ON COLUMN stripe_webhook_events.event_type IS 'Type of Stripe event (e.g., checkout.session.completed)';
COMMENT ON COLUMN stripe_webhook_events.idempotency_key IS 'Idempotency key from the Stripe request, if available';
COMMENT ON COLUMN stripe_webhook_events.event_timestamp IS 'Timestamp when the event was created in Stripe';
COMMENT ON COLUMN stripe_webhook_events.created_at IS 'Timestamp when the event was processed by our webhook handler';

-- Add RLS policy to ensure only service role can access this table
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do anything" ON stripe_webhook_events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create a scheduled job to clean up old events (commented out - would need to be run manually)
-- SELECT cron.schedule('0 2 * * *', 'SELECT purge_old_webhook_events()'); 