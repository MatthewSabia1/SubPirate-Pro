import { useCallback } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Database } from '../database.types'
import { FeatureKey } from './features'

type SupabaseClient = ReturnType<typeof useSupabaseClient<Database>>

export function useFeatureAccess() {
  const supabase = useSupabaseClient<Database>()

  const checkFeatureAccess = useCallback(async (featureKey: FeatureKey): Promise<boolean> => {
    try {
      // Get the user's current subscription and its associated product
      const { data: subscription, error: subscriptionError } = await supabase
        .from('customer_subscriptions')
        .select(`
          stripe_price_id,
          status,
          stripe_prices!inner (
            stripe_product_id
          )
        `)
        .single()

      if (subscriptionError || !subscription) {
        console.error('Error fetching subscription:', subscriptionError)
        return false
      }

      // Check if subscription is active
      if (subscription.status !== 'active' && subscription.status !== 'trialing') {
        return false
      }

      // Check if the feature is enabled for the product
      const { data: feature, error: featureError } = await supabase
        .from('product_features')
        .select('enabled')
        .eq('stripe_product_id', subscription.stripe_prices.stripe_product_id)
        .eq('feature_key', featureKey)
        .single()

      if (featureError || !feature) {
        console.error('Error fetching feature access:', featureError)
        return false
      }

      return feature.enabled
    } catch (error) {
      console.error('Error checking feature access:', error)
      return false
    }
  }, [supabase])

  return { checkFeatureAccess }
} 