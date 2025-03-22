// Standardized validation utility for form inputs

/**
 * Email validation using RFC 5322 standard
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
};

/**
 * URL validation
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Username validation for Reddit usernames
 */
export const isValidRedditUsername = (username: string): boolean => {
  // Remove 'u/' prefix if present
  const cleanUsername = username.replace(/^u\//, '');
  
  // Reddit usernames must be 3-20 characters, alphanumeric and underscores only
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return usernameRegex.test(cleanUsername);
};

/**
 * Subreddit name validation
 */
export const isValidSubredditName = (subreddit: string): boolean => {
  // Remove 'r/' prefix if present
  const cleanSubreddit = subreddit.replace(/^r\//, '');
  
  // Subreddit names must be 3-21 characters
  const subredditRegex = /^[a-zA-Z0-9_]{3,21}$/;
  return subredditRegex.test(cleanSubreddit);
};

/**
 * Password strength checker
 * Returns a score from 0-4:
 * 0 = Very weak
 * 1 = Weak
 * 2 = Medium
 * 3 = Strong
 * 4 = Very strong
 */
export const getPasswordStrength = (password: string): number => {
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  
  // Character variety checks
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  
  // Return normalized score (0-4)
  return Math.min(4, Math.floor(score / 1.5));
};

/**
 * Input validator with standardized error messages
 */
export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

export const validateInput = (
  value: string,
  fieldName: string,
  options?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
    customValidator?: (value: string) => ValidationResult;
  }
): ValidationResult => {
  const opts = {
    required: true,
    minLength: 0,
    maxLength: Infinity,
    ...options
  };

  // Required check
  if (opts.required && !value.trim()) {
    return {
      isValid: false,
      errorMessage: `${fieldName} is required`
    };
  }

  // Length checks
  if (value && value.length < opts.minLength) {
    return {
      isValid: false,
      errorMessage: `${fieldName} must be at least ${opts.minLength} characters`
    };
  }

  if (value && value.length > opts.maxLength) {
    return {
      isValid: false,
      errorMessage: `${fieldName} must not exceed ${opts.maxLength} characters`
    };
  }

  // Pattern validation
  if (value && opts.pattern && !opts.pattern.test(value)) {
    return {
      isValid: false,
      errorMessage: opts.patternMessage || `${fieldName} has an invalid format`
    };
  }

  // Custom validation
  if (value && opts.customValidator) {
    return opts.customValidator(value);
  }

  return { isValid: true };
};

/**
 * Common validation patterns
 */
export const validationPatterns = {
  email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  url: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  numeric: /^[0-9]+$/,
  phone: /^\+?[1-9]\d{1,14}$/
};

/**
 * Project name validation - basic format check
 */
export const isValidProjectName = (name: string): boolean => {
  // Project names should be 3-50 characters, alphanumeric, spaces, dashes, and underscores
  const nameRegex = /^[\w\s-]{3,50}$/;
  return nameRegex.test(name.trim());
};

/**
 * File size validation
 */
export const isValidFileSize = (fileSize: number, maxSizeMB: number): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSizeBytes;
};

/**
 * File type validation
 */
export const isValidFileType = (
  fileType: string, 
  acceptedTypes: string[]
): boolean => {
  return acceptedTypes.some(type => fileType.startsWith(type));
};

/**
 * Async validation for project name uniqueness
 */
export const isProjectNameUnique = async (
  name: string, 
  userId: string, 
  supabase: any, 
  currentProjectId?: string
): Promise<ValidationResult> => {
  try {
    let query = supabase
      .from('projects')
      .select('id')
      .eq('name', name.trim())
      .eq('user_id', userId);
    
    // If we're editing an existing project, exclude it from the check
    if (currentProjectId) {
      query = query.neq('id', currentProjectId);
    }
    
    const { data } = await query.maybeSingle();
    
    if (data) {
      return {
        isValid: false,
        errorMessage: 'A project with this name already exists'
      };
    }
    
    return { isValid: true };
  } catch (error) {
    console.error('Error checking project name uniqueness:', error);
    return {
      isValid: false,
      errorMessage: 'Failed to validate project name'
    };
  }
};