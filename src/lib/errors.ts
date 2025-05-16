// Custom error class for sports API errors
export class SportsApiError extends Error {
  public readonly code: string;
  public readonly status?: number;
  public readonly details?: any;

  constructor(message: string, code: string, status?: number, details?: any) {
    super(message);
    this.name = 'SportsApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Type guard for Axios error
export const isAxiosError = (err: unknown): err is { 
  message: string;
  response?: { status?: number; data?: any };
  config?: { url?: string; method?: string };
} => {
  return err !== null && 
         typeof err === 'object' && 
         'isAxiosError' in err &&
         'message' in err;
};

// Error handler for sports API
export const handleSportsApiError = (error: unknown, context: string): never => {
  if (isAxiosError(error)) {
    throw new SportsApiError(
      `API request failed: ${error.message}`,
      'API_ERROR',
      error.response?.status,
      {
        url: error.config?.url,
        method: error.config?.method,
        response: error.response?.data
      }
    );
  }
  
  const errorMessage = error instanceof Error ? error.message : String(error);
  throw new SportsApiError(
    `Unexpected error in ${context}: ${errorMessage}`,
    'UNEXPECTED_ERROR',
    undefined,
    error
  );
};