-- Fix missing columns in stripe_prices table
DO $$
DECLARE
  interval_exists boolean;
  interval_count_exists boolean;
BEGIN
  -- Check if recurring_interval column exists
  SELECT EXISTS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'stripe_prices' AND column_name = 'recurring_interval'
  ) INTO interval_exists;
  
  -- Check if recurring_interval_count column exists
  SELECT EXISTS (
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'stripe_prices' AND column_name = 'recurring_interval_count'
  ) INTO interval_count_exists;
  
  -- Add recurring_interval column if it doesn't exist
  IF NOT interval_exists THEN
    ALTER TABLE stripe_prices ADD COLUMN recurring_interval text;
    RAISE NOTICE 'Added recurring_interval column to stripe_prices table';
  ELSE
    RAISE NOTICE 'recurring_interval column already exists in stripe_prices table';
  END IF;
  
  -- Add recurring_interval_count column if it doesn't exist
  IF NOT interval_count_exists THEN
    ALTER TABLE stripe_prices ADD COLUMN recurring_interval_count integer;
    RAISE NOTICE 'Added recurring_interval_count column to stripe_prices table';
  ELSE
    RAISE NOTICE 'recurring_interval_count column already exists in stripe_prices table';
  END IF;
END $$;