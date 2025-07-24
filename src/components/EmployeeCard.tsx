import React, { useState } from 'react';
import { Eye, AlertTriangle, Calendar, Mail, Clock, Shield, User } from 'lucide-react';
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

// Improved Avatar component with better styling
const Avatar: React.FC<{ employee: Employee; size?: 'sm' | 'md' | 'lg' }> = ({ employee, size = 'md' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Size configurations
  const sizeConfig = {
    sm: { avatar: 'w-10 h-10', text: 'text-sm' },
    md: { avatar: 'w-12 h-12', text: 'text-lg' },
    lg: { avatar: 'w-16 h-16', text: 'text-xl' }
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
      <div 
        className={`${config.avatar} rounded-full flex items-center justify-center text-white font-bold ${config.text}`}
        style={{ backgroundColor }}
        title={`${employee.name} (${initials})`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="relative">
      {imageLoading && (
        <div 
          className={`absolute inset-0 ${config.avatar} rounded-full flex items-center justify-center text-white font-bold ${config.text} animate-pulse`}
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      )}
      <img 
        src={photoUrl}
        alt={employee.name}
        className={`${config.avatar} rounded-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={() => {
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          setImageLoading(false);
        }}
      />
    </div>
  );
};

// Risk Score component with progress bar
const RiskScoreBar: React.FC<{ employee: Employee }> = ({ employee }) => {
  const riskScore = employee.riskScore || 0;
  const riskLevel = employee.riskLevel || 'Low';
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return { bg: 'bg-red-500', text: 'text-red-600' };
    if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
    if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-600' };
    return { bg: 'bg-green-500', text: 'text-green-600' };
  };

  const colors = getScoreColor(riskScore);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk Score</span>
        <span className={`text-sm font-bold ${colors.text}`}>{riskScore}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${colors.bg}`}
          style={{ width: `${riskScore}%` }}
        />
      </div>
    </div>
  );
};

// Metrics component with improved styling
const EmployeeMetrics: React.FC<{ employee: Employee; compact?: boolean }> = ({ employee, compact = false }) => {
  if (!employee.metrics) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 italic">
        No metrics available
      </div>
    );
  }

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

// Risk factors badges
const RiskFactors: React.FC<{ employee: Employee }> = ({ employee }) => {
  const violationCount = employee.violationCount || employee.violations?.length || 0;
  const factors = [];

  if (employee.riskLevel === 'High' || employee.riskLevel === 'Critical') {
    factors.push({
      label: 'High Risk',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    });
  }

  if (violationCount > 0) {
    factors.push({
      label: `${violationCount} Violation${violationCount > 1 ? 's' : ''}`,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    });
  }

  if (!employee.complianceProfile) {
    factors.push({
      label: 'No Compliance Profile',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    });
  }

  if (factors.length === 0) {
    factors.push({
      label: 'Low Risk',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    });
  }

  return (
    <div className="mb-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Factors</h4>
      <div className="flex flex-wrap gap-1">
        {factors.map((factor, index) => (
          <span key={index} className={`px-2 py-1 rounded-full text-xs ${factor.color}`}>
            {factor.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  onViewDetails, 
  layout = 'grid',
  showMetrics = false,
  showCompliance = true,
  className = ''
}) => {
  const violationCount = employee.violationCount || employee.violations?.length || 0;

  // Grid Layout (Default) - New improved design
  if (layout === 'grid') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer ${className}`}
           onClick={() => onViewDetails(employee)}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="flex-shrink-0">
              <Avatar employee={employee} size="md" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {employee.name}
                </h3>
                {showCompliance && employee.complianceStatus && (
                  <ComplianceStatusBadge status={employee.complianceStatus} />
                )}
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {employee.jobTitle || employee.role} • {employee.department}
              </p>
              
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {employee.email}
              </p>
            </div>
          </div>

          {/* Risk Score Bar */}
          <RiskScoreBar employee={employee} />

          {/* Compliance Profile */}
          {showCompliance && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Compliance Profile</span>
                {employee.complianceProfile ? (
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {employee.complianceProfile}
                  </span>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">Not assigned</span>
                )}
              </div>
            </div>
          )}

          {/* Last Activity */}
          <div className="mb-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                Last activity: {formatTimeAgo(employee.lastActivity)}
              </span>
            </div>
          </div>

          {/* Risk Factors */}
          <RiskFactors employee={employee} />

          {/* Metrics */}
          {showMetrics && <EmployeeMetrics employee={employee} />}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(employee);
              }}
              className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
              {employee.riskLevel}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // List Layout - Simplified version
  if (layout === 'list') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails(employee)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar employee={employee} size="sm" />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
                  {employee.riskLevel}
                </span>
                {showCompliance && employee.complianceStatus && (
                  <ComplianceStatusBadge status={employee.complianceStatus} />
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">{employee.jobTitle || employee.role}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">•</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{employee.department}</p>
              </div>
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
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(employee);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact Layout - Minimal version
  if (layout === 'compact') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 hover:shadow-sm transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails(employee)}>
        <div className="flex items-center space-x-3">
          <Avatar employee={employee} size="sm" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">{employee.name}</h3>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10 flex-shrink-0`}>
                {employee.riskLevel}
              </span>
              {showCompliance && employee.complianceStatus && (
                <ComplianceIndicator status={employee.complianceStatus} size="sm" />
              )}
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{employee.department}</p>
              {violationCount > 0 && (
                <>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-red-600">{violationCount} violations</span>
                </>
              )}
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(employee);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-gray-200 rounded transition-colors flex-shrink-0"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Fallback to grid layout
  return null;
};