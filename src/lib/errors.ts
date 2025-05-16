import type { AxiosError } from 'axios';

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
export function handleSportsApiError(error: unknown, context: string): never {
  console.error(`Error ${context}:`, error);
  throw error;
}