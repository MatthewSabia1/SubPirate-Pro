import { useState, useEffect } from 'react';

/**
 * Hook for managing modal state with proper reset functionality
 * @param initialState Initial state of the modal fields
 * @param isOpen Boolean indicating if modal is open
 * @returns State and utility methods for managing modal state
 */
export function useModalState<T extends Record<string, any>>(
  initialState: T,
  isOpen: boolean
) {
  // Main state for the modal
  const [state, setState] = useState<T>(initialState);
  // Optional error state
  const [error, setError] = useState<string | null>(null);
  // Optional loading/saving state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Optional delay to prevent flicker during modal animation
      const timeout = setTimeout(() => {
        setState(initialState);
        setError(null);
        setIsSubmitting(false);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isOpen, initialState]);

  // Update a single field
  const updateField = <K extends keyof T>(field: K, value: T[K]) => {
    setState(prev => ({ ...prev, [field]: value }));
    // Clear error when user makes changes
    if (error) setError(null);
  };

  // Update multiple fields at once
  const updateFields = (updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
    // Clear error when user makes changes
    if (error) setError(null);
  };

  // Reset state manually (in addition to automatic reset)
  const resetState = () => {
    setState(initialState);
    setError(null);
    setIsSubmitting(false);
  };

  return {
    state,
    updateField,
    updateFields,
    resetState,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
  };
} 