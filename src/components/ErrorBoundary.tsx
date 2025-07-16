import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent 
            error={this.state.error!} 
            resetError={this.handleReset} 
          />
        );
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.handleReset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Something went wrong
        </h1>
        
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          We encountered an unexpected error. This has been logged and our team has been notified.
        </p>

        {isDevelopment && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Error Details (Development):
            </h3>
            <pre className="text-xs text-red-600 dark:text-red-400 overflow-auto max-h-32">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetError}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorBoundary;
export { DefaultErrorFallback };
export type { ErrorBoundaryProps, ErrorFallbackProps }; 