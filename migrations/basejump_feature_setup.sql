-- Basejump Feature Setup for SubPirate
-- This migration creates the necessary feature definitions and maps them to subscription plans

-- -------------------------------------------------------
-- Section - Insert Subscription Features
-- -------------------------------------------------------

-- Insert the feature definitions based on FEATURE_KEYS
INSERT INTO basejump.subscription_features (feature_key, name, description)
VALUES 
    ('analyze_subreddit', 'Subreddit Analysis', 'Access to detailed subreddit analysis including marketing friendliness scores, posting requirements, and best practices'),
    ('analyze_unlimited', 'Unlimited Analysis', 'Unlimited subreddit analysis per month'),
    ('create_project', 'Project Creation', 'Create and manage marketing projects to organize your subreddit targets'),
    ('advanced_analytics', 'Advanced Analytics', 'Access to advanced analytics including engagement metrics, trend analysis, and detailed reporting'),
    ('export_data', 'Export Data', 'Export analysis data and reports in various formats'),
    ('team_collaboration', 'Team Collaboration', 'Invite team members and collaborate on projects'),
    ('custom_tracking', 'Custom Tracking', 'Set up custom tracking metrics and alerts for your subreddits'),
    ('api_access', 'API Access', 'Access to the SubPirate API for custom integrations'),
    ('priority_support', 'Priority Support', 'Priority email and chat support'),
    ('dedicated_account', 'Dedicated Account Manager', 'Dedicated account manager for your team'),
    ('campaigns', 'Campaigns', 'Create and manage automated Reddit posting campaigns'),
    ('campaigns_ai_optimization', 'AI Campaign Optimization', 'AI-powered optimization for post timing and title generation'),
    ('campaigns_unlimited', 'Unlimited Campaigns', 'Unlimited campaigns and scheduled posts')
ON CONFLICT (feature_key) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

-- -------------------------------------------------------
-- Section - Create Stripe Product Records
-- -------------------------------------------------------

-- We'll create records for each subscription tier that correspond to your Stripe products
-- You'll need to update these with your actual Stripe product IDs once set up

-- For now we'll use dummy Stripe IDs - replace these with real ones!
INSERT INTO basejump.stripe_products (stripe_product_id, name, description, active)
VALUES
    ('prod_free', 'Free Plan', 'Free access with limited features', true),
    ('prod_starter', 'Starter Plan', 'Essential features for getting started with Reddit marketing', true),
    ('prod_creator', 'Creator Plan', 'Perfect for content creators and growing brands', true),
    ('prod_pro', 'Pro Plan', 'Advanced features for professional marketers', true),
    ('prod_agency', 'Agency Plan', 'Full platform access for marketing teams and agencies', true)
ON CONFLICT (stripe_product_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

-- -------------------------------------------------------
-- Section - Create Product-Feature Mapping
-- -------------------------------------------------------

-- Free tier features
INSERT INTO basejump.product_features (stripe_product_id, feature_key, enabled)
VALUES
    ('prod_free', 'analyze_subreddit', true)
ON CONFLICT (stripe_product_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- Starter tier features
INSERT INTO basejump.product_features (stripe_product_id, feature_key, enabled)
VALUES
    ('prod_starter', 'analyze_subreddit', true),
    ('prod_starter', 'create_project', true),
    ('prod_starter', 'export_data', true),
    ('prod_starter', 'campaigns', true)
ON CONFLICT (stripe_product_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- Creator tier features
INSERT INTO basejump.product_features (stripe_product_id, feature_key, enabled)
VALUES
    ('prod_creator', 'analyze_subreddit', true),
    ('prod_creator', 'create_project', true),
    ('prod_creator', 'advanced_analytics', true),
    ('prod_creator', 'custom_tracking', true),
    ('prod_creator', 'export_data', true),
    ('prod_creator', 'priority_support', true),
    ('prod_creator', 'campaigns', true)
ON CONFLICT (stripe_product_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- Pro tier features
INSERT INTO basejump.product_features (stripe_product_id, feature_key, enabled)
VALUES
    ('prod_pro', 'analyze_unlimited', true),
    ('prod_pro', 'create_project', true),
    ('prod_pro', 'advanced_analytics', true),
    ('prod_pro', 'export_data', true),
    ('prod_pro', 'team_collaboration', true),
    ('prod_pro', 'custom_tracking', true),
    ('prod_pro', 'api_access', true),
    ('prod_pro', 'priority_support', true),
    ('prod_pro', 'campaigns', true),
    ('prod_pro', 'campaigns_ai_optimization', true)
ON CONFLICT (stripe_product_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- Agency tier features
INSERT INTO basejump.product_features (stripe_product_id, feature_key, enabled)
VALUES
    ('prod_agency', 'analyze_unlimited', true),
    ('prod_agency', 'create_project', true),
    ('prod_agency', 'advanced_analytics', true),
    ('prod_agency', 'export_data', true),
    ('prod_agency', 'team_collaboration', true),
    ('prod_agency', 'custom_tracking', true),
    ('prod_agency', 'api_access', true),
    ('prod_agency', 'priority_support', true),
    ('prod_agency', 'dedicated_account', true),
    ('prod_agency', 'campaigns', true),
    ('prod_agency', 'campaigns_ai_optimization', true),
    ('prod_agency', 'campaigns_unlimited', true)
ON CONFLICT (stripe_product_id, feature_key) DO UPDATE
SET enabled = EXCLUDED.enabled;

-- -------------------------------------------------------
-- Section - Add Test Prices
-- -------------------------------------------------------

-- Create price records - you'll replace these with real Stripe price IDs
INSERT INTO basejump.stripe_prices (stripe_price_id, stripe_product_id, currency, unit_amount, recurring_interval, recurring_interval_count, active)
VALUES
    ('price_free', 'prod_free', 'usd', 0, 'month', 1, true),
    ('price_starter_monthly', 'prod_starter', 'usd', 1900, 'month', 1, true),
    ('price_creator_monthly', 'prod_creator', 'usd', 3400, 'month', 1, true),
    ('price_pro_monthly', 'prod_pro', 'usd', 4900, 'month', 1, true),
    ('price_agency_monthly', 'prod_agency', 'usd', 9700, 'month', 1, true)
ON CONFLICT (stripe_price_id) DO UPDATE
SET unit_amount = EXCLUDED.unit_amount,
    active = EXCLUDED.active;