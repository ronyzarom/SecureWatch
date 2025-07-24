import React, { useState } from 'react';
import { 
  Eye, 
  AlertTriangle, 
  Calendar, 
  User, 
  Bot, 
  Clock, 
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ViolationStatusBadge } from './ViolationStatusBadge';
import { ViolationStatusManager } from './ViolationStatusManager';
import EmployeeAvatar from './EmployeeAvatar';

interface Violation {
  id: number;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Investigating' | 'False Positive' | 'Resolved';
  description: string;
  evidence: string[];
  structuredEvidence: any[];
  aiValidationStatus: string;
  aiValidationScore: number;
  aiValidationReasoning: string;
  source: string;
  metadata: any;
  createdAt: string;
  resolvedAt: string;
  updatedAt: string;
  employee: {
    name: string;
    email: string;
    department: string;
    photo: string;
  };
}

interface ViolationCardProps {
  violation: Violation;
  onViewDetails: (violation: Violation) => void;
  onStatusChange: (violationId: number, newStatus: string, reason: string) => Promise<void>;
  layout?: 'grid' | 'list' | 'compact';
  className?: string;
}

// Severity indicator with progress-style bar
const SeverityIndicator: React.FC<{ severity: string }> = ({ severity }) => {
  const getSeverityConfig = () => {
    switch (severity) {
      case 'Critical': return { color: 'bg-red-500', text: 'text-red-600', width: '100%' };
      case 'High': return { color: 'bg-orange-500', text: 'text-orange-600', width: '75%' };
      case 'Medium': return { color: 'bg-yellow-500', text: 'text-yellow-600', width: '50%' };
      case 'Low': return { color: 'bg-blue-500', text: 'text-blue-600', width: '25%' };
      default: return { color: 'bg-gray-500', text: 'text-gray-600', width: '0%' };
    }
  };

  const config = getSeverityConfig();

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity</span>
        <span className={`text-sm font-bold ${config.text}`}>{severity}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${config.color}`}
          style={{ width: config.width }}
        />
      </div>
    </div>
  );
};

// AI Validation indicator
const AIValidationIndicator: React.FC<{ violation: Violation }> = ({ violation }) => {
  if (!violation.aiValidationStatus || !violation.aiValidationScore) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <Bot className="w-4 h-4" />
        <span className="text-xs">Not validated</span>
      </div>
    );
  }

  const getValidationColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="flex items-center space-x-2">
      <Bot className="w-4 h-4 text-blue-500" />
      <span className={`text-xs font-medium ${getValidationColor(violation.aiValidationScore)}`}>
        {violation.aiValidationScore}% confidence
      </span>
    </div>
  );
};

// Time formatting utility
const formatTimeAgo = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
};

export const ViolationCard: React.FC<ViolationCardProps> = ({ 
  violation, 
  onViewDetails, 
  onStatusChange,
  layout = 'grid',
  className = ''
}) => {
  // Safety check for missing employee data
  if (!violation.employee) {
    violation.employee = {
      name: 'Unknown Employee',
      email: 'unknown@company.com',
      department: 'Unknown',
      photo: ''
    };
  }

  // Grid Layout (Default) - Modern card design
  if (layout === 'grid') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer ${className}`}
           onClick={() => onViewDetails(violation)}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="flex-shrink-0">
              <EmployeeAvatar employee={violation.employee} size="md" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {violation.type}
                </h3>
                <ViolationStatusBadge status={violation.status} />
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {violation.employee.name} • {violation.employee.department}
              </p>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {violation.description}
              </p>
            </div>
          </div>

          {/* Severity Bar */}
          <SeverityIndicator severity={violation.severity} />

          {/* AI Validation */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI Validation</span>
              <AIValidationIndicator violation={violation} />
            </div>
          </div>

          {/* Last Activity */}
          <div className="mb-4">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span>
                Created: {formatTimeAgo(violation.createdAt)}
              </span>
            </div>
          </div>

          {/* Status Management Section */}
          <div className="mb-4">
            <ViolationStatusManager
              violation={violation}
              onStatusChange={onStatusChange}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(violation);
              }}
              className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              View Details
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">ID: {violation.id}</span>
              {violation.source && (
                <span className="text-xs text-gray-400">• {violation.source}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List Layout - Horizontal card
  if (layout === 'list') {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 cursor-pointer ${className}`}
           onClick={() => onViewDetails(violation)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <EmployeeAvatar employee={violation.employee} size="sm" />
            
            <div className="flex-1">
              <div className="flex items-center space-x-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{violation.type}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  violation.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                  violation.severity === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                  violation.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {violation.severity}
                </span>
                <ViolationStatusBadge status={violation.status} />
              </div>
              <div className="flex items-center space-x-4 mt-1">
                <p className="text-sm text-gray-600 dark:text-gray-300">{violation.employee.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">•</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{violation.employee.department}</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <AIValidationIndicator violation={violation} />
            
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatTimeAgo(violation.createdAt)}</span>
              </div>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(violation);
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
           onClick={() => onViewDetails(violation)}>
        <div className="flex items-center space-x-3">
          <EmployeeAvatar employee={violation.employee} size="sm" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="font-medium text-gray-900 dark:text-white truncate">{violation.type}</h3>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                violation.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                violation.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                violation.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              } flex-shrink-0`}>
                {violation.severity}
              </span>
              <ViolationStatusBadge status={violation.status} />
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{violation.employee.department}</p>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">{formatTimeAgo(violation.createdAt)}</span>
            </div>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(violation);
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