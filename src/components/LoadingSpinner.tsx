import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  overlay?: boolean;
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12'
};

const textSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  overlay = false,
  text,
  className = ''
}) => {
  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400`} />
      {text && (
        <p className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-300 font-medium`}>
          {text}
        </p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return spinnerContent;
};

interface InlineLoadingProps {
  text?: string;
  size?: 'sm' | 'md';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  text = 'Loading...',
  size = 'sm'
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 dark:text-blue-400`} />
      <span className={`${textSizeClasses[size]} text-gray-600 dark:text-gray-300`}>
        {text}
      </span>
    </div>
  );
};

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = 'h-4 w-full',
  count = 1
}) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className}`}
        />
      ))}
    </div>
  );
};

interface LoadingCardProps {
  title?: string;
  description?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  title = 'Loading content...',
  description = 'Please wait while we fetch the data.'
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-center space-y-4 flex-col">
        <LoadingSpinner size="lg" />
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}; 