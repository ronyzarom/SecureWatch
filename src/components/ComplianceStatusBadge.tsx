import React from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle } from 'lucide-react';

interface ComplianceStatusBadgeProps {
  status?: 'compliant' | 'non_compliant' | 'needs_review' | 'overdue' | 'never_reviewed';
  retentionStatus?: 'compliant' | 'due_soon' | 'overdue';
  reviewStatus?: 'up_to_date' | 'due_soon' | 'overdue' | 'never_reviewed';
  complianceProfile?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const ComplianceStatusBadge: React.FC<ComplianceStatusBadgeProps> = ({
  status,
  retentionStatus,
  reviewStatus,
  complianceProfile,
  size = 'md',
  showIcon = true,
  className = ''
}) => {
  // Determine overall status if not provided
  const getOverallStatus = () => {
    if (status) return status;
    
    // Determine based on retention and review status
    if (retentionStatus === 'overdue' || reviewStatus === 'overdue') {
      return 'overdue';
    }
    if (retentionStatus === 'due_soon' || reviewStatus === 'due_soon') {
      return 'needs_review';
    }
    if (reviewStatus === 'never_reviewed') {
      return 'never_reviewed';
    }
    if (retentionStatus === 'compliant' && reviewStatus === 'up_to_date') {
      return 'compliant';
    }
    
    return 'needs_review';
  };

  const overallStatus = getOverallStatus();

  // Size configurations
  const sizeConfig = {
    sm: {
      badge: 'px-2 py-1 text-xs',
      icon: 'w-3 h-3',
      text: 'text-xs'
    },
    md: {
      badge: 'px-2 py-1 text-xs',
      icon: 'w-4 h-4',
      text: 'text-xs'
    },
    lg: {
      badge: 'px-3 py-1 text-sm',
      icon: 'w-4 h-4',
      text: 'text-sm'
    }
  };

  const config = sizeConfig[size];

  // Status configurations
  const statusConfig = {
    compliant: {
      icon: CheckCircle,
      colors: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      label: 'Compliant'
    },
    non_compliant: {
      icon: XCircle,
      colors: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      label: 'Non-Compliant'
    },
    needs_review: {
      icon: Clock,
      colors: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
      label: 'Needs Review'
    },
    overdue: {
      icon: AlertTriangle,
      colors: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
      label: 'Overdue'
    },
    never_reviewed: {
      icon: Clock,
      colors: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      label: 'Never Reviewed'
    }
  };

  const statusInfo = statusConfig[overallStatus];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      {/* Main compliance status badge */}
      <div className={`inline-flex items-center rounded-full font-medium ${config.badge} ${statusInfo.colors}`}>
        {showIcon && <StatusIcon className={`${config.icon} mr-1`} />}
        <span className={config.text}>{statusInfo.label}</span>
      </div>

      {/* Additional status indicators */}
      {(retentionStatus || reviewStatus) && (
        <div className="inline-flex space-x-1">
          {retentionStatus && retentionStatus !== 'compliant' && (
            <div className={`inline-flex items-center rounded-full font-medium ${config.badge} ${
              retentionStatus === 'overdue' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' 
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
            }`}>
              <Clock className={`${config.icon} mr-1`} />
              <span className={config.text}>
                {retentionStatus === 'overdue' ? 'Ret. Overdue' : 'Ret. Due'}
              </span>
            </div>
          )}

          {reviewStatus && !['up_to_date', 'compliant'].includes(reviewStatus) && (
            <div className={`inline-flex items-center rounded-full font-medium ${config.badge} ${
              reviewStatus === 'overdue' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                : reviewStatus === 'never_reviewed'
                ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
            }`}>
              <Shield className={`${config.icon} mr-1`} />
              <span className={config.text}>
                {reviewStatus === 'overdue' ? 'Rev. Overdue' 
                : reviewStatus === 'never_reviewed' ? 'No Review'
                : 'Rev. Due'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Compliance profile indicator component
export const ComplianceProfileBadge: React.FC<{
  profile?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ profile, size = 'md', className = '' }) => {
  if (!profile) return null;

  const sizeConfig = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1 text-sm'
  };

  const getProfileColor = (profileName: string) => {
    const profileColors = {
      'standard employee': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'finance team': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'it administration': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      'contractors': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'service accounts': 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    };

    const key = profileName.toLowerCase();
    return profileColors[key] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
  };

  return (
    <div className={`inline-flex items-center rounded-full font-medium ${sizeConfig[size]} ${getProfileColor(profile)} ${className}`}>
      <Shield className={`${size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} mr-1`} />
      <span>{profile}</span>
    </div>
  );
};

// Compact compliance indicator for small spaces
export const ComplianceIndicator: React.FC<{
  status?: 'compliant' | 'non_compliant' | 'needs_review' | 'overdue' | 'never_reviewed';
  size?: 'sm' | 'md';
  tooltip?: string;
  className?: string;
}> = ({ status = 'compliant', size = 'sm', tooltip, className = '' }) => {
  const statusConfig = {
    compliant: {
      icon: CheckCircle,
      color: 'text-green-500'
    },
    non_compliant: {
      icon: XCircle,
      color: 'text-red-500'
    },
    needs_review: {
      icon: Clock,
      color: 'text-yellow-500'
    },
    overdue: {
      icon: AlertTriangle,
      color: 'text-red-500'
    },
    never_reviewed: {
      icon: Clock,
      color: 'text-gray-400'
    }
  };

  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div 
      className={`inline-flex items-center ${className}`}
      title={tooltip || `Compliance Status: ${status.replace('_', ' ')}`}
    >
      <StatusIcon className={`${iconSize} ${statusInfo.color}`} />
    </div>
  );
}; 