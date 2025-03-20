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
  if (error instanceof CampaignError) {
    return `Campaign error: ${error.message}`;
  } else if (error instanceof RedditApiError) {
    return `Reddit API error (${error.statusCode}): ${error.message}`;
  } else if (error instanceof SchedulingError) {
    return `Scheduling error: ${error.message}`;
  } else if (error instanceof MediaUploadError) {
    return `Media upload error: ${error.message}`;
  } else if (error instanceof Error) {
    return `Error: ${error.message}`;
  } else {
    return 'An unknown error occurred.';
  }
};