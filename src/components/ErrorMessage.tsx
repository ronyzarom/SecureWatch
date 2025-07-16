import React from 'react';
import { AlertTriangle, XCircle, AlertCircle, RefreshCw, X } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  retryText?: string;
  dismissible?: boolean;
  className?: string;
}

const getIcon = (type: 'error' | 'warning' | 'info') => {
  switch (type) {
    case 'error':
      return <XCircle className="w-5 h-5" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5" />;
    case 'info':
      return <AlertCircle className="w-5 h-5" />;
  }
};

const getColorClasses = (type: 'error' | 'warning' | 'info') => {
  switch (type) {
    case 'error':
      return {
        container: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
        icon: 'text-red-500 dark:text-red-400',
        title: 'text-red-900 dark:text-red-100',
        message: 'text-red-800 dark:text-red-200',
        button: 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600'
      };
    case 'warning':
      return {
        container: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-500 dark:text-yellow-400',
        title: 'text-yellow-900 dark:text-yellow-100',
        message: 'text-yellow-800 dark:text-yellow-200',
        button: 'bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600'
      };
    case 'info':
      return {
        container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
        icon: 'text-blue-500 dark:text-blue-400',
        title: 'text-blue-900 dark:text-blue-100',
        message: 'text-blue-800 dark:text-blue-200',
        button: 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
      };
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  type = 'error',
  onRetry,
  onDismiss,
  retryText = 'Try Again',
  dismissible = false,
  className = ''
}) => {
  const colors = getColorClasses(type);
  const icon = getIcon(type);

  return (
    <div className={`rounded-lg border p-4 ${colors.container} ${className}`}>
      <div className="flex items-start space-x-3">
        <div className={colors.icon}>
          {icon}
        </div>
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold ${colors.title} mb-1`}>
              {title}
            </h3>
          )}
          
          <p className={`text-sm ${colors.message} leading-relaxed`}>
            {message}
          </p>
          
          {onRetry && (
            <div className="mt-3">
              <button
                onClick={onRetry}
                className={`inline-flex items-center space-x-2 px-3 py-2 text-white text-sm font-medium rounded-lg ${colors.button} transition-colors`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>{retryText}</span>
              </button>
            </div>
          )}
        </div>
        
        {(dismissible || onDismiss) && (
          <button
            onClick={onDismiss}
            className={`${colors.icon} hover:opacity-75 transition-opacity p-1 rounded`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

interface InlineErrorProps {
  message: string;
  className?: string;
}

export const InlineError: React.FC<InlineErrorProps> = ({ 
  message, 
  className = '' 
}) => {
  return (
    <div className={`flex items-center space-x-2 text-red-600 dark:text-red-400 ${className}`}>
      <XCircle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

interface ErrorCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'Error loading content',
  message,
  onRetry,
  retryText = 'Try Again'
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
          {message}
        </p>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{retryText}</span>
          </button>
        )}
      </div>
    </div>
  );
}; 