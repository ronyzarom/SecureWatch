import React from 'react';
import { AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ViolationStatusBadgeProps {
  status: 'Active' | 'Investigating' | 'False Positive' | 'Resolved';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const ViolationStatusBadge: React.FC<ViolationStatusBadgeProps> = ({ 
  status, 
  size = 'md', 
  showIcon = true 
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Active':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          icon: AlertTriangle,
          label: 'Active'
        };
      case 'Investigating':
        return {
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
          icon: Clock,
          label: 'Investigating'
        };
      case 'False Positive':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
          icon: XCircle,
          label: 'False Positive'
        };
      case 'Resolved':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: CheckCircle,
          label: 'Resolved'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
          icon: AlertTriangle,
          label: status
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClasses = getSizeClasses(size);

  return (
    <span className={`inline-flex items-center ${sizeClasses} font-medium rounded-full ${config.color}`}>
      {showIcon && <Icon className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} mr-1`} />}
      {config.label}
    </span>
  );
}; 