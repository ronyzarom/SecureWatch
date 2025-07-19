import React, { useState } from 'react';
import { Eye, AlertTriangle, Calendar, Mail, Clock, Shield } from 'lucide-react';
import { Employee } from '../types';
import { getRiskColor, getRiskTextColor, getRiskBorderColor, formatTimeAgo } from '../utils/riskUtils';

interface EmployeeCardProps {
  employee: Employee;
  onViewDetails: (employee: Employee) => void;
  layout?: 'grid' | 'list' | 'compact';
  showMetrics?: boolean;
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

export const EmployeeCard: React.FC<EmployeeCardProps> = ({ 
  employee, 
  onViewDetails, 
  layout = 'grid',
  showMetrics = false,
  className = ''
}) => {
  const violationCount = employee.violationCount || employee.violations?.length || 0;

  // Grid Layout (Default)
  if (layout === 'grid') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${getRiskBorderColor(employee.riskLevel)} p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails(employee)}>
        <div className="flex items-center space-x-4">
          <Avatar employee={employee} size="md" />
          
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
                {employee.riskLevel}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">{employee.jobTitle || employee.role}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{employee.department}</p>
            
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(employee.lastActivity)}</span>
              </div>
              {violationCount > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600">
                    {violationCount} violation{violationCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {showMetrics && <EmployeeMetrics employee={employee} />}
          </div>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded-full transition-colors">
            <Eye className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // List Layout
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
            
            <button className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-gray-200 rounded transition-colors">
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Compact Layout
  if (layout === 'compact') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-3 hover:shadow-sm transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails(employee)}>
        <div className="flex items-center space-x-3">
          <Avatar employee={employee} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h4 className="font-medium text-gray-900 dark:text-white truncate">{employee.name}</h4>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getRiskTextColor(employee.riskLevel)} bg-opacity-10`}>
                {employee.riskLevel}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{employee.department}</p>
          </div>
          {violationCount > 0 && (
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600">{violationCount}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fallback to grid layout
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 ${getRiskBorderColor(employee.riskLevel)} p-6 hover:shadow-md transition-all duration-200 cursor-pointer ${className}`}
         onClick={() => onViewDetails(employee)}>
      {/* Grid layout content */}
    </div>
  );
};