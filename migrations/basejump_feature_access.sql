-- Feature Access Function to check if a user has access to a specific feature
-- This adds a publicly-callable function to test feature access

CREATE OR REPLACE FUNCTION public.has_feature_access(account_id uuid, feature_key text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    set search_path = public, basejump
AS $$
DECLARE
    has_access boolean;
    sub_status text;
    product_id text;
BEGIN
    -- Check if the account exists and user has access to it
    IF NOT (SELECT basejump.has_role_on_account(has_feature_access.account_id)) THEN
        RETURN false;
    END IF;
    
    -- Get the subscription status for this account
    SELECT bs.status::text, bs.basejump.stripe_prices.stripe_product_id
    INTO sub_status, product_id
    FROM basejump.billing_subscriptions bs
    LEFT JOIN basejump.stripe_prices sp ON bs.price_id = sp.stripe_price_id
    WHERE bs.account_id = has_feature_access.account_id
    ORDER BY bs.created DESC
    LIMIT 1;
    
    -- If no subscription or not active/trialing, return false
    IF sub_status IS NULL OR (sub_status != 'active' AND sub_status != 'trialing') THEN
        -- For development, we'll allow access to make testing easier
        IF current_setting('request.headers')::json->>'x-application-name' = 'development' THEN
            RETURN true;
        ELSE
            RETURN false;
        END IF;
    END IF;
    
    -- Check if the feature is enabled for this product
    SELECT enabled INTO has_access
    FROM basejump.product_features
    WHERE stripe_product_id = product_id
      AND feature_key = has_feature_access.feature_key;
    
    -- If no feature record, default to false  
    RETURN COALESCE(has_access, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_feature_access(uuid, text) TO authenticated;

-- Create a simple wrapper function to check access for the current user's personal account
CREATE OR REPLACE FUNCTION public.current_user_has_feature_access(feature_key text)
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    set search_path = public, basejump
AS $$
DECLARE
    user_account_id uuid;
BEGIN
    -- Get the personal account ID for the current user
    SELECT id INTO user_account_id
    FROM basejump.accounts
    WHERE primary_owner_user_id = auth.uid() AND personal_account = true
    LIMIT 1;
    
    IF user_account_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check feature access
    RETURN public.has_feature_access(user_account_id, feature_key);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_has_feature_access(text) TO authenticated;