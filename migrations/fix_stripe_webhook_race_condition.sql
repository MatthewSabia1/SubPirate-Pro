-- Migration to fix race condition in Stripe webhook processing
-- This adds a new function that uses transactions for atomicity when updating customer and subscription data

-- Create a new transaction-based function for updating Stripe data
CREATE OR REPLACE FUNCTION public.service_role_upsert_customer_subscription_atomic(
  account_id uuid,
  customer jsonb default null,
  subscription jsonb default null
)
RETURNS void AS $$
BEGIN
  -- Begin transaction with serializable isolation level to prevent race conditions
  BEGIN
    -- Set the transaction isolation level to serializable
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    -- If the customer is not null, upsert the data into billing_customers
    IF customer IS NOT NULL THEN
      INSERT INTO basejump.billing_customers (id, account_id, email, provider)
      VALUES (
        customer ->> 'id', 
        service_role_upsert_customer_subscription_atomic.account_id, 
        customer ->> 'billing_email',
        (customer ->> 'provider')
      )
      ON CONFLICT (id) DO UPDATE
      SET email = customer ->> 'billing_email';
    END IF;

    -- If the subscription is not null, upsert the data into billing_subscriptions
    IF subscription IS NOT NULL THEN
      INSERT INTO basejump.billing_subscriptions (
        id, account_id, billing_customer_id, status, metadata, price_id,
        quantity, cancel_at_period_end, created, current_period_start,
        current_period_end, ended_at, cancel_at, canceled_at, trial_start,
        trial_end, plan_name, provider
      )
      VALUES (
        subscription ->> 'id', 
        service_role_upsert_customer_subscription_atomic.account_id,
        subscription ->> 'billing_customer_id', 
        (subscription ->> 'status')::basejump.subscription_status,
        subscription -> 'metadata',
        subscription ->> 'price_id', 
        (subscription ->> 'quantity')::int,
        (subscription ->> 'cancel_at_period_end')::boolean,
        (subscription ->> 'created')::timestamptz, 
        (subscription ->> 'current_period_start')::timestamptz,
        (subscription ->> 'current_period_end')::timestamptz, 
        (subscription ->> 'ended_at')::timestamptz,
        (subscription ->> 'cancel_at')::timestamptz,
        (subscription ->> 'canceled_at')::timestamptz, 
        (subscription ->> 'trial_start')::timestamptz,
        (subscription ->> 'trial_end')::timestamptz,
        subscription ->> 'plan_name', 
        (subscription ->> 'provider')
      )
      ON CONFLICT (id) DO UPDATE
      SET 
        billing_customer_id = subscription ->> 'billing_customer_id',
        status = (subscription ->> 'status')::basejump.subscription_status,
        metadata = subscription -> 'metadata',
        price_id = subscription ->> 'price_id',
        quantity = (subscription ->> 'quantity')::int,
        cancel_at_period_end = (subscription ->> 'cancel_at_period_end')::boolean,
        current_period_start = (subscription ->> 'current_period_start')::timestamptz,
        current_period_end = (subscription ->> 'current_period_end')::timestamptz,
        ended_at = (subscription ->> 'ended_at')::timestamptz,
        cancel_at = (subscription ->> 'cancel_at')::timestamptz,
        canceled_at = (subscription ->> 'canceled_at')::timestamptz,
        trial_start = (subscription ->> 'trial_start')::timestamptz,
        trial_end = (subscription ->> 'trial_end')::timestamptz,
        plan_name = subscription ->> 'plan_name';
    END IF;
    
    -- Commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      ROLLBACK;
      -- Rethrow the exception
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to service_role
GRANT EXECUTE ON FUNCTION public.service_role_upsert_customer_subscription_atomic(uuid, jsonb, jsonb) TO service_role;

-- Create a combined function that atomically updates both customer and subscription data
CREATE OR REPLACE FUNCTION public.service_role_update_customer_and_subscription_atomic(
  account_id uuid,
  customer jsonb,
  subscription jsonb
)
RETURNS void AS $$
BEGIN
  -- Begin transaction with serializable isolation level to prevent race conditions
  BEGIN
    -- Set the transaction isolation level to serializable
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    -- Call the atomic upsert function with both customer and subscription data
    PERFORM public.service_role_upsert_customer_subscription_atomic(
      account_id,
      customer,
      subscription
    );
    
    -- Commit the transaction
    COMMIT;
  EXCEPTION
    WHEN OTHERS THEN
      -- If any error occurs, rollback the transaction
      ROLLBACK;
      -- Rethrow the exception
      RAISE;
  END;
END;
$$ LANGUAGE plpgsql;

-- Grant execution permission to service_role
GRANT EXECUTE ON FUNCTION public.service_role_update_customer_and_subscription_atomic(uuid, jsonb, jsonb) TO service_role;

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed: Added atomic transaction functions for Stripe webhook processing';
END $$; 