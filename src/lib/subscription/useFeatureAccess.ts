import { useCallback, useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { Database } from '../database.types'
import { FeatureKey } from './features'
import { supabase } from '../supabase'

type SupabaseClient = ReturnType<typeof useSupabaseClient<Database>>

/**
 * React hook for checking access to a specific feature
 * Interfaces with Basejump's subscription system
 */
export function useFeatureAccess() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeFeatures, setActiveFeatures] = useState<string[]>([])
  const [accountId, setAccountId] = useState<string | null>(null)

  // Load account and features data
  useEffect(() => {
    const loadFeatureAccess = async () => {
      setIsLoading(true)
      try {
        // Get user's personal account from Basejump
        const { data: account, error: accountError } = await supabase.rpc('get_personal_account')
        
        if (accountError || !account) {
          console.error('Error getting personal account:', accountError)
          return
        }
        
        setAccountId(account.account_id)
        
        // Get subscription status
        const { data: billingStatus, error: billingError } = await supabase.rpc(
          'get_account_billing_status',
          { account_id: account.account_id }
        )
        
        if (billingError) {
          console.error('Error getting billing status:', billingError)
          return
        }
        
        // If subscription is active or trialing, get the features
        if (billingStatus?.billing_status === 'active' || billingStatus?.billing_status === 'trialing') {
          // Get subscription details
          const { data: subscription, error: subError } = await supabase
            .from('basejump.billing_subscriptions')
            .select(`
              id,
              price_id,
              basejump.stripe_prices!inner (
                stripe_product_id
              )
            `)
            .eq('id', billingStatus.billing_subscription_id)
            .single()
            
          if (subError || !subscription) {
            console.error('Error getting subscription:', subError)
            return
          }
          
          // Get features for this product
          const { data: features, error: featuresError } = await supabase
            .from('basejump.product_features')
            .select('feature_key')
            .eq('stripe_product_id', subscription.basejump.stripe_prices.stripe_product_id)
            .eq('enabled', true)
            
          if (featuresError) {
            console.error('Error getting product features:', featuresError)
            return
          }
          
          // Set active features
          setActiveFeatures(features.map(f => f.feature_key))
        }
      } catch (error) {
        console.error('Error in useFeatureAccess:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadFeatureAccess()
  }, [])

  /**
   * Check if the user has access to a specific feature
   */
  const checkFeatureAccess = useCallback(async (featureKey: FeatureKey): Promise<boolean> => {
    if (!accountId) return false
    
    try {
      // For direct check, use the Basejump function
      const { data, error } = await supabase.rpc(
        'has_feature_access',
        { 
          account_id: accountId,
          feature_key: featureKey
        }
      )
      
      if (error) {
        console.error('Error checking feature access:', error)
        return false
      }
      
      return !!data
    } catch (error) {
      console.error('Error in checkFeatureAccess:', error)
      return false
    }
  }, [accountId])
  
  /**
   * Sync check if the user has access to a specific feature
   * Uses the cached features list for immediate response
   */
  const hasAccess = useCallback((featureKey: FeatureKey): boolean => {
    // Always allow in development
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    
    // If no cached features, be conservative
    if (activeFeatures.length === 0) {
      return false
    }
    
    return activeFeatures.includes(featureKey)
  }, [activeFeatures])

  return { checkFeatureAccess, hasAccess, isLoading, accountId }
}