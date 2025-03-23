-- Add missing recurring columns to stripe_prices table
ALTER TABLE stripe_prices ADD COLUMN IF NOT EXISTS recurring_interval text;
ALTER TABLE stripe_prices ADD COLUMN IF NOT EXISTS recurring_interval_count integer;