// Error types for better categorization
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  statusCode?: number;
  retryable?: boolean;
  timestamp: Date;
}

// Create standardized error objects
export const createError = (
  type: ErrorType, 
  message: string, 
  originalError?: Error,
  statusCode?: number,
  retryable: boolean = false
): AppError => ({
  type,
  message,
  originalError,
  statusCode,
  retryable,
  timestamp: new Date()
});

// Network error handling
export const handleNetworkError = (error: Error): AppError => {
  if (error.message.includes('fetch')) {
    return createError(
      ErrorType.NETWORK,
      'Network connection failed. Please check your internet connection.',
      error,
      undefined,
      true
    );
  }
  
  return createError(
    ErrorType.UNKNOWN,
    'An unexpected error occurred.',
    error,
    undefined,
    true
  );
};

// API error handling
export const handleApiError = (response: Response, error?: Error): AppError => {
  const statusCode = response.status;
  
  switch (statusCode) {
    case 400:
      return createError(
        ErrorType.VALIDATION,
        'Invalid request. Please check your input.',
        error,
        statusCode,
        false
      );
    case 401:
      return createError(
        ErrorType.AUTHENTICATION,
        'Authentication required. Please log in.',
        error,
        statusCode,
        false
      );
    case 403:
      return createError(
        ErrorType.AUTHORIZATION,
        'Access denied. You do not have permission to perform this action.',
        error,
        statusCode,
        false
      );
    case 404:
      return createError(
        ErrorType.NOT_FOUND,
        'The requested resource was not found.',
        error,
        statusCode,
        false
      );
    case 429:
      return createError(
        ErrorType.SERVER,
        'Too many requests. Please try again later.',
        error,
        statusCode,
        true
      );
    case 500:
    case 502:
    case 503:
    case 504:
      return createError(
        ErrorType.SERVER,
        'Server error. Please try again later.',
        error,
        statusCode,
        true
      );
    default:
      return createError(
        ErrorType.UNKNOWN,
        'An unexpected error occurred.',
        error,
        statusCode,
        true
      );
  }
};

// Retry logic with exponential backoff
export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

export const retry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      );
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// Format error messages for user display
export const formatErrorMessage = (error: AppError | Error | string): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }
  
  // AppError
  return error.message;
};

// Get user-friendly error title based on error type
export const getErrorTitle = (error: AppError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.VALIDATION:
      return 'Invalid Input';
    case ErrorType.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorType.AUTHORIZATION:
      return 'Access Denied';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
};

// Determine if error should show retry button
export const isRetryableError = (error: AppError | Error): boolean => {
  if (error instanceof Error) {
    return true; // Default to retryable for generic errors
  }
  
  return error.retryable || false;
};

// Development error logging
export const logError = (error: AppError | Error, context?: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error${context ? ` in ${context}` : ''}`);
    console.error('Error details:', error);
    
    if ('originalError' in error && error.originalError) {
      console.error('Original error:', error.originalError);
    }
    
    console.groupEnd();
  }
  
  // In production, you might want to send to an error reporting service
  // Example: Sentry.captureException(error);
};

// Async operation wrapper with error handling
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context?: string
): Promise<{ data?: T; error?: AppError }> => {
  try {
    const data = await operation();
    return { data };
  } catch (error) {
    const appError = error instanceof Error 
      ? handleNetworkError(error)
      : error as AppError;
    
    logError(appError, context);
    return { error: appError };
  }
};

// Validation error helpers
export const createValidationError = (field: string, message: string): AppError => 
  createError(ErrorType.VALIDATION, `${field}: ${message}`);

export const validateRequired = (value: any, fieldName: string): AppError | null => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return createValidationError(fieldName, 'This field is required');
  }
  return null;
};

export const validateEmail = (email: string): AppError | null => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createValidationError('Email', 'Please enter a valid email address');
  }
  return null;
}; 