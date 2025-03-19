// Supabase related types for better TypeScript support
import { PostgrestError } from '@supabase/supabase-js';

/**
 * Extended PostgrestError type that includes common Supabase error codes
 */
export interface SupabaseError extends PostgrestError {
  // Common constraint violation error codes
  code?: '23505' | // unique_violation
         '23503' | // foreign_key_violation
         '23502' | // not_null_violation
         '23514' | // check_violation
         '42P01' | // undefined_table
         '42703' | // undefined_column
         '42P07' | // duplicate_table
         '42701' | // duplicate_column
         string;  // other error codes
}

/**
 * Database constraint error helpers
 */
export const dbErrorCodes = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514'
};

/**
 * Helper function to handle common database errors
 */
export function handleDbError(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  // Cast to our extended error type
  const dbError = error as SupabaseError;

  // Handle specific error codes
  if (dbError.code === dbErrorCodes.UNIQUE_VIOLATION) {
    return 'A record with this information already exists';
  }
  
  if (dbError.code === dbErrorCodes.FOREIGN_KEY_VIOLATION) {
    return 'This record references another record that does not exist';
  }
  
  if (dbError.code === dbErrorCodes.NOT_NULL_VIOLATION) {
    return 'Required information is missing';
  }
  
  if (dbError.code === dbErrorCodes.CHECK_VIOLATION) {
    return 'The provided value does not meet requirements';
  }

  // Handle messages from the error
  if (dbError.message) return dbError.message;

  // Fallback for other error types
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Type-safe function to check if an error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  if (!error) return false;
  
  // Check for key properties of PostgrestError
  const possibleError = error as Partial<SupabaseError>;
  return (
    typeof possibleError === 'object' &&
    possibleError !== null &&
    (possibleError.code !== undefined || possibleError.message !== undefined)
  );
}