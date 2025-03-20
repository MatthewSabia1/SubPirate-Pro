// Custom error classes for campaign-specific errors

export class CampaignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CampaignError';
  }
}

export class RedditApiError extends Error {
  statusCode?: number;
  
  constructor(message: string, statusCode?: number) {
    super(message);
    this.name = 'RedditApiError';
    this.statusCode = statusCode;
  }
}

export class SchedulingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchedulingError';
  }
}

export class MediaUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediaUploadError';
  }
}

// Error handler to process and format errors
export const handleCampaignError = (error: unknown): string => {
  console.error('Campaign feature error:', error);

  // Handle our custom error types
  if (error instanceof CampaignError) {
    return `Campaign error: ${error.message}`;
  } else if (error instanceof RedditApiError) {
    return `Reddit API error${error.statusCode ? ` (${error.statusCode})` : ''}: ${error.message}`;
  } else if (error instanceof SchedulingError) {
    return `Scheduling error: ${error.message}`;
  } else if (error instanceof MediaUploadError) {
    return `Media upload error: ${error.message}`;
  } else if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  
  // Handle Supabase or other object errors
  const err = error as any;
  
  // Supabase specific errors
  if (err?.code) {
    // Handle specific error codes
    switch(err.code) {
      case '22P02': return 'Invalid input value';
      case '23505': return 'A record with this information already exists';
      case '23503': return 'Referenced record does not exist';
      case '23514': return 'Check constraint violation, please check your inputs';
      case '42501': return 'You do not have permission to perform this action';
      case '42P01': return 'Table does not exist - the feature may not be fully set up';
      case 'PGRST116': return 'The requested resource was not found';
    }
  }
  
  // Storage errors
  if (err?.message?.includes('storage/')) {
    if (err.message.includes('storage/object-too-large')) {
      return 'File is too large. Maximum size is 5MB.';
    }
    if (err.message.includes('storage/unauthorized')) {
      return 'Not authorized to access storage';
    }
    if (err.message.includes('storage/invalid-mime-type')) {
      return 'Invalid file type. Please upload an image (JPG, PNG, GIF, or WebP)';
    }
    if (err.message.includes('storage/bucket-not-found')) {
      return 'Storage bucket not found';
    }
  }
  
  // Try to extract a message from any shape of response
  if (err?.message && typeof err.message === 'string') {
    return err.message;
  }
  
  if (err?.error) {
    if (typeof err.error === 'string') {
      return err.error;
    }
    if (typeof err.error.message === 'string') {
      return err.error.message;
    }
  }
  
  // As a last resort, try to stringify the error
  try {
    return typeof err === 'object' ? JSON.stringify(err) : String(err);
  } catch {
    return 'An unknown error occurred';
  }
};