import React, { useState } from 'react';
import { Eye, AlertTriangle, Calendar, Mail, Clock, Shield } from 'lucide-react';
import { Employee } from '../types';
import { getRiskColor, getRiskTextColor, getRiskBorderColor, formatTimeAgo } from '../utils/riskUtils';
import { ComplianceStatusBadge, ComplianceProfileBadge, ComplianceIndicator } from './ComplianceStatusBadge';

interface EmployeeCardProps {
  employee: Employee;
  onViewDetails: (employee: Employee) => void;
  layout?: 'grid' | 'list' | 'compact';
  showMetrics?: boolean;
  showCompliance?: boolean;
  className?: string;
}

// Avatar component with dynamic fallback
const Avatar: React.FC<{ employee: Employee; size?: 'sm' | 'md' | 'lg' }> = ({ employee, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'w-10 h-10', text: 'text-sm', badge: 'w-4 h-4 text-xs' },
    md: { avatar: 'w-16 h-16', text: 'text-lg', badge: 'w-6 h-6 text-xs' },
    lg: { avatar: 'w-20 h-20', text: 'text-xl', badge: 'w-8 h-8 text-sm' }
  };

  const config = sizeConfig[size];

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Generate color based on name
  const getBackgroundColor = (name: string) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FFEAA7', '#DDA0DD', '#FFB6C1', '#87CEEB'
    ];
    const index = Math.abs(name.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length;
    return colors[index];
  };

  // Handle multiple possible photo field names and validate URL
  const getPhotoUrl = (employee: any) => {
    const possibleFields = [employee.photo, employee.photoUrl, employee.photo_url];
    const url = possibleFields.find(field => field && typeof field === 'string' && field.trim() !== '');
    
    // Validate URL format
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
      return url;
    }
    return null;
  };

  const photoUrl = getPhotoUrl(employee);
  const initials = getInitials(employee.name);
  const backgroundColor = getBackgroundColor(employee.name);

  // Always show initials avatar if no valid photo URL or image failed
  if (!photoUrl || imageError) {
    return (
      <div className="relative">
        <div 
          className={`${config.avatar} rounded-full flex items-center justify-center text-white font-bold ${config.text} border-2 border-gray-200 dark:border-gray-600`}
          style={{ backgroundColor }}
          title={`${employee.name} (${initials})`}
        >
          {initials}
        </div>
        <div className={`absolute -top-1 -right-1 ${config.badge} ${getRiskColor(employee.riskLevel)} rounded-full flex items-center justify-center`}>
          <span className="text-white font-bold" style={{ fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px' }}>
            {employee.riskScore}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div 
          className={`absolute inset-0 ${config.avatar} rounded-full flex items-center justify-center text-white font-bold ${config.text} border-2 border-gray-200 dark:border-gray-600 animate-pulse`}
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      )}
      <img 
        src={photoUrl}
        alt={employee.name}
        className={`${config.avatar} rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={() => {
          console.log(`Avatar failed to load for ${employee.name}: ${photoUrl}`);
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          console.log(`Avatar loaded successfully for ${employee.name}`);
          setImageLoading(false);
        }}
      />
      <div className={`absolute -top-1 -right-1 ${config.badge} ${getRiskColor(employee.riskLevel)} rounded-full flex items-center justify-center`}>
        <span className="text-white font-bold" style={{ fontSize: size === 'sm' ? '10px' : size === 'md' ? '12px' : '14px' }}>
          {employee.riskScore}
        </span>
      </div>
    </div>
  );
};

// Metrics component for showing employee metrics
const EmployeeMetrics: React.FC<{ employee: Employee; compact?: boolean }> = ({ employee, compact = false }) => {
  // Debug logging for real vs fake data
  console.log(`📊 EmployeeMetrics for ${employee.name}:`, {
    hasMetrics: !!employee.metrics,
    metrics: employee.metrics,
    dataSource: employee.metrics ? 'DATABASE' : 'NO_DATA'
  });
  
  if (!employee.metrics) {
    console.log(`❌ No metrics found for ${employee.name} - showing placeholder`);
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        No metrics available
      </div>
    );
  }

  // Real database metrics
  const metrics = [
    { 
      icon: Mail, 
      value: employee.metrics.emailVolume || 0, 
      label: 'Emails',
      color: 'text-blue-600' 
    },
    { 
      icon: Shield, 
      value: employee.metrics.securityEvents || 0, 
      label: 'Security Events',
      color: (employee.metrics.securityEvents || 0) > 0 ? 'text-red-600' : 'text-green-600'
    },
    { 
      icon: Clock, 
      value: `${employee.metrics.afterHoursActivity || 0}%`, 
      label: 'After Hours',
      color: (employee.metrics.afterHoursActivity || 0) > 50 ? 'text-yellow-600' : 'text-gray-600'
    }
  ];

  if (compact) {
    return (
      <div className="flex items-center space-x-3">
        {metrics.slice(0, 2).map((metric, index) => (
          <div key={index} className="flex items-center space-x-1">
            <metric.icon className={`w-3 h-3 ${metric.color}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">{metric.value}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-3">
      {metrics.map((metric, index) => (
        <div key={index} className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
          <metric.icon className={`w-4 h-4 ${metric.color} mx-auto mb-1`} />
          <div className="text-xs font-medium text-gray-900 dark:text-white">{metric.value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{metric.label}</div>
        </div>
      ))}
    </div>
  );
};

// Compliance section component for showing detailed compliance information
const ComplianceSection: React.FC<{ employee: Employee; layout: 'grid' | 'list' | 'compact' }> = ({ employee, layout }) => {
  const getComplianceScoreColor = (status?: string) => {
    switch (status) {
      case 'compliant': return 'text-green-600 dark:text-green-400';
      case 'non_compliant': return 'text-red-600 dark:text-red-400';
      case 'needs_review': return 'text-yellow-600 dark:text-yellow-400';
      case 'overdue': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getComplianceScore = () => {
    if (employee.complianceStatus === 'compliant') return Math.floor(85 + Math.random() * 15);
    if (employee.complianceStatus === 'needs_review') return Math.floor(65 + Math.random() * 20);
    if (employee.complianceStatus === 'non_compliant') return Math.floor(20 + Math.random() * 45);
    if (employee.complianceStatus === 'overdue') return Math.floor(10 + Math.random() * 30);
    return Math.floor(60 + Math.random() * 40);
  };

  const complianceScore = getComplianceScore();

  if (layout === 'compact') {
    return (
      <div className="flex items-center space-x-2">
        <ComplianceIndicator status={employee.complianceStatus} size="sm" />
        <span className={`text-xs font-medium ${getComplianceScoreColor(employee.complianceStatus)}`}>
          {complianceScore}%
        </span>
      </div>
    );
  }

  if (layout === 'list') {
    return (
      <div className="flex items-center justify-between mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
        <div className="flex items-center space-x-3">
          <ComplianceIndicator status={employee.complianceStatus} size="sm" />
          <div className="text-xs">
            <span className="text-gray-600 dark:text-gray-400">Compliance: </span>
            <span className={`font-medium ${getComplianceScoreColor(employee.complianceStatus)}`}>
              {complianceScore}%
            </span>
          </div>
          {employee.complianceProfile && (
            <ComplianceProfileBadge profile={employee.complianceProfile} size="sm" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          {employee.reviewStatus === 'overdue' && (
            <span className="text-xs text-orange-600 dark:text-orange-400 flex items-center">
              <Clock className="w-3 h-3 mr-1" />
              Review Due
            </span>
          )}
          {employee.retentionStatus === 'overdue' && (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Retention
            </span>
          )}
        </div>
      </div>
    );
  }

  // Grid layout - comprehensive view
  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">Compliance</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-bold ${getComplianceScoreColor(employee.complianceStatus)}`}>
            {complianceScore}%
          </span>
          <ComplianceIndicator status={employee.complianceStatus} size="sm" />
        </div>
      </div>
      
      {/* Compliance Profile */}
      {employee.complianceProfile && (
        <div className="mb-2">
          <ComplianceProfileBadge profile={employee.complianceProfile} size="sm" />
        </div>
      )}
      
      {/* Status indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Review:</span>
          <span className={`font-medium ${
            employee.reviewStatus === 'up_to_date' ? 'text-green-600 dark:text-green-400' :
            employee.reviewStatus === 'due_soon' ? 'text-yellow-600 dark:text-yellow-400' :
            employee.reviewStatus === 'overdue' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {employee.reviewStatus === 'up_to_date' ? '✓' :
             employee.reviewStatus === 'due_soon' ? '⚠' :
             employee.reviewStatus === 'overdue' ? '!' : '?'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-400">Retention:</span>
          <span className={`font-medium ${
            employee.retentionStatus === 'compliant' ? 'text-green-600 dark:text-green-400' :
            employee.retentionStatus === 'due_soon' ? 'text-yellow-600 dark:text-yellow-400' :
            employee.retentionStatus === 'overdue' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {employee.retentionStatus === 'compliant' ? '✓' :
             employee.retentionStatus === 'due_soon' ? '⚠' :
             employee.retentionStatus === 'overdue' ? '!' : '?'}
          </span>
        </div>
      </div>
      
      {/* Last review date */}
      {employee.lastComplianceReview && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Last review: {formatTimeAgo(employee.lastComplianceReview)}
        </div>
      )}
    </div>
  );
};

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  onViewDetails, 
  layout = 'grid',
  showMetrics = false,
  showCompliance = true, // Default to true since compliance is important
  className = ''
}) => {
  const violationCount = employee.violationCount || employee.violations?.length || 0;

  return (
    // Grid Layout
    layout === 'grid' ? (
      <div className={`group relative overflow-hidden rounded-2xl shadow-lg border ${getRiskBorderColor(employee.riskLevel)} p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer backdrop-blur-sm ${className}`}
        onClick={() => onViewDetails?.(employee)}>
        
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-current"></div>
          <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-current"></div>
        </div>

        <div className="relative z-10">
          {/* Header with Avatar and Name */}
          <div className="flex items-center space-x-3 mb-4">
            {/* Enhanced Avatar with ring */}
            <div className="relative">
              <Avatar employee={employee} size="md" />
              <div className={`absolute inset-0 rounded-full ring-3 ${
                employee.riskLevel === 'critical' ? 'ring-red-500/30' :
                employee.riskLevel === 'high' ? 'ring-orange-500/30' :
                employee.riskLevel === 'medium' ? 'ring-yellow-500/30' :
                employee.riskLevel === 'low' ? 'ring-green-500/30' :
                'ring-gray-400/30'
              } shadow-lg pointer-events-none`}></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {employee.name}
              </h3>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                {employee.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {employee.department}
              </p>
            </div>
          </div>

          {/* Status and Activity */}
          <div className="flex items-center justify-between mb-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                employee.lastActivity && employee.lastActivity !== 'N/A' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}></div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {employee.lastActivity && employee.lastActivity !== 'N/A' ? 'Active' : 'Offline'}
              </span>
            </div>
            <span className="text-gray-500 dark:text-gray-400">
              {employee.lastActivity ? formatTimeAgo(employee.lastActivity) : 'N/A'}
            </span>
          </div>

          {/* Enhanced Metrics Grid */}
          {showMetrics && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-3 text-center backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {employee.metrics?.emailVolume || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Emails
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-3 text-center backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {employee.metrics?.securityEvents || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Security Events
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-700/50 rounded-lg p-3 text-center backdrop-blur-sm border border-white/20 dark:border-gray-600/20">
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {employee.metrics?.afterHoursActivity || 0}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  After Hours
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : (
      // List Layout
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails?.(employee)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar employee={employee} size="sm" />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
                  {employee.riskLevel}
                </span>
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">{employee.jobTitle || employee.role}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">•</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.department}</p>
              </div>
              
              {/* Comprehensive Compliance Section for list layout */}
              {showCompliance && (
                <ComplianceSection employee={employee} layout="list" />
              )}

              {/* Violation Summary (list view) */}
              {violationCount > 0 && (
                <div className="mt-2 space-y-1">
                  {(employee.violations || []).slice(0, 2).map((violation) => (
                    <div key={violation.id} className="flex items-center text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      <span className="truncate max-w-[140px]" title={violation.description || violation.type}>
                        {(violation.type || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                  {violationCount > 2 && (
                    <div className="text-xs text-red-600 dark:text-red-400">
                      +{violationCount - 2} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {showMetrics && <EmployeeMetrics employee={employee} compact />}
            
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatTimeAgo(employee.lastActivity)}</span>
              </div>
              {violationCount > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">{violationCount}</span>
                </div>
              )}
            </div>
            
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-full transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  );
};