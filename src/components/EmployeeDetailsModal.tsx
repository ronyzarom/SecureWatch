import React, { useState } from 'react';
import { X, Mail, Users, Clock, Shield, TrendingUp, AlertTriangle, Calendar, Database, Activity, Eye, FileText, Zap } from 'lucide-react';
import { Employee } from '../types';
import { getRiskColor, getRiskTextColor, formatTimeAgo } from '../utils/riskUtils';
import { SecurityChatbot } from './SecurityChatbot';
import { LoadingSpinner, InlineLoading } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { AppError, ErrorType, createError, withErrorHandling, logError } from '../utils/errorUtils';

interface EmployeeDetailsModalProps {
  employee: Employee;
  onClose: () => void;
  loading?: boolean;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, onClose, loading = false }) => {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<AppError | null>(null);

  // Simulate API calls for actions
  const simulateAction = async (actionType: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const delay = 1000 + Math.random() * 2000;
      
      setTimeout(() => {
        // Simulate occasional failures
        const shouldFail = Math.random() < 0.15; // 15% failure rate
        
        if (shouldFail) {
          reject(new Error(`Failed to ${actionType.toLowerCase()}. Please try again.`));
        } else {
          resolve();
        }
      }, delay);
    });
  };

  const handleAction = async (actionType: string, actionLabel: string) => {
    setActionLoading(actionType);
    setActionError(null);

    try {
      const { error } = await withErrorHandling(
        () => simulateAction(actionType),
        `EmployeeDetailsModal.${actionType}`
      );

      if (error) {
        throw error;
      }

      // Success feedback could be added here
      console.log(`${actionLabel} completed successfully for ${employee.name}`);
      
    } catch (error) {
      const appError = error instanceof Error 
        ? createError(ErrorType.SERVER, `Failed to ${actionLabel.toLowerCase()}. Please try again.`, error, undefined, true)
        : error as AppError;

      setActionError(appError);
      logError(appError, 'EmployeeDetailsModal');
      
    } finally {
      setActionLoading(null);
    }
  };

  const handleChatAction = (actionType: string, context?: any) => {
    console.log('Chat action:', actionType, context);
    // Handle different action types (investigate, monitor, escalate, report)
    // This could trigger other parts of the application
  };

  const retryLastAction = () => {
    setActionError(null);
    // In a real app, you might want to retry the last failed action
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'High': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'Medium': return <Activity className="w-5 h-5 text-yellow-500" />;
      case 'Low': return <Shield className="w-5 h-5 text-green-500" />;
      default: return <Shield className="w-5 h-5 text-gray-500" />;
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'email': return <Mail className="w-5 h-5" />;
      case 'contacts': return <Users className="w-5 h-5" />;
      case 'hours': return <Clock className="w-5 h-5" />;
      case 'data': return <Database className="w-5 h-5" />;
      case 'events': return <AlertTriangle className="w-5 h-5" />;
      case 'behavior': return <TrendingUp className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-black dark:bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Enhanced Header */}
        <div className="relative bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-8 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-white dark:border-gray-600 shadow-lg">
                  <img 
                    src={employee.photoUrl || employee.photo || '/default-avatar.png'} 
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={`absolute -top-2 -right-2 w-10 h-10 ${getRiskColor(employee.riskLevel)} rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-600`}>
                  <span className="text-white text-sm font-bold">{employee.riskScore}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{employee.name}</h1>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getRiskColor(employee.riskLevel)} bg-opacity-10 border border-current border-opacity-20`}>
                    {getRiskLevelIcon(employee.riskLevel)}
                    <span className={`text-sm font-semibold ${getRiskTextColor(employee.riskLevel)}`}>
                      {employee.riskLevel} Risk
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">{employee.role}</p>
                  <p className="text-gray-600 dark:text-gray-400">{employee.department} Department</p>
                  <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">{employee.email}</p>
                </div>
                
                <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 dark:text-gray-400" />
                  <span>Last activity: {formatTimeAgo(employee.lastActivity)}</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={onClose} 
              className="p-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 hover:bg-opacity-50 rounded-full transition-all duration-200"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Enhanced Main Content */}
          <div className="flex-1 p-8 space-y-8 overflow-y-auto flex flex-col">
            {/* Risk Metrics Grid */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <span>Security Metrics</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getMetricIcon('email')}
                      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">Email Volume</span>
                    </div>
                    <div className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded-full">
                      This Week
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">{employee.metrics?.emailVolume || 0}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    {(employee.metrics?.emailVolume || 0) > 100 ? '↑ Above average' : '→ Normal range'}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getMetricIcon('contacts')}
                      <span className="text-sm font-semibold text-green-900 dark:text-green-100">External Contacts</span>
                    </div>
                    <div className="text-xs px-2 py-1 bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200 rounded-full">
                      Unique
                    </div>
                  </div>
                                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">{employee.metrics?.externalContacts || 0}</p>
                <p className="text-sm text-green-700 dark:text-green-200">
                  {(employee.metrics?.externalContacts || 0) > 15 ? '↑ High activity' : '→ Normal activity'}
                </p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getMetricIcon('hours')}
                      <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">After Hours</span>
                    </div>
                    <div className="text-xs px-2 py-1 bg-orange-200 dark:bg-orange-800/50 text-orange-800 dark:text-orange-200 rounded-full">
                      Activity %
                    </div>
                  </div>
                                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">{employee.metrics?.afterHoursActivity || 0}%</p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  {(employee.metrics?.afterHoursActivity || 0) > 50 ? '⚠ Elevated' : '→ Normal pattern'}
                </p>
                </div>
              </div>
            </div>

            {/* Policy Violations */}
            {(employee.violations?.length || 0) > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <span>Security Violations</span>
                  <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                    {employee.violations?.length || 0} Active
                  </span>
                </h2>
                
                <div className="space-y-4">
                  {(employee.violations || []).map((violation) => (
                    <div key={violation.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 rounded-lg p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
                            <h3 className="font-bold text-red-900 dark:text-red-100 text-lg">{violation.type}</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              violation.severity === 'Critical' ? 'bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-100' :
                              violation.severity === 'High' ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-900 dark:text-orange-100' :
                              'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-900 dark:text-yellow-100'
                            }`}>
                              {violation.severity}
                            </span>
                          </div>
                          
                          <p className="text-red-800 dark:text-red-200 mb-3 leading-relaxed">{violation.description}</p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-red-700 dark:text-red-300">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 dark:text-red-300" />
                                <span>{formatTimeAgo(violation.timestamp)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <FileText className="w-4 h-4 dark:text-red-300" />
                                <span>{violation.evidence.length} evidence items</span>
                              </span>
                            </div>
                            
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                              violation.status === 'Active' ? 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200' :
                              violation.status === 'Investigating' ? 'bg-yellow-200 dark:bg-yellow-800/50 text-yellow-800 dark:text-yellow-200' :
                              'bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200'
                            }`}>
                              {violation.status}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Enhanced Behavioral Analysis */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <span>Behavioral Analysis</span>
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                <div className="space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Database className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Data Transfer</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{employee.metrics?.dataTransfer || 0} GB</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Security Events</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{employee.metrics?.securityEvents || 0}</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total events</p>
                    </div>
                  </div>
                  
                  {/* Spacer to push content to fill available space */}
                  <div className="flex-1"></div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Behavior Change</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{employee.metrics?.behaviorChange || 0}%</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">From baseline</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800 flex flex-col min-h-full">
                  <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-4">Risk Assessment Summary</h3>
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-purple-700 dark:text-purple-300">Overall Risk Score</span>
                        <span className="font-bold text-purple-900 dark:text-purple-100">{employee.riskScore}/100</span>
                      </div>
                      <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-4">
                        <div 
                          className={`h-2 rounded-full ${getRiskColor(employee.riskLevel)}`}
                          style={{ width: `${employee.riskScore}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <div className="bg-white dark:bg-gray-800/50 bg-opacity-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Risk Factors</h4>
                        <div className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                          {(employee.metrics?.afterHoursActivity || 0) > 50 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span>High after-hours activity ({employee.metrics?.afterHoursActivity || 0}%)</span>
                            </div>
                          )}
                          {(employee.metrics?.externalContacts || 0) > 15 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>Elevated external contacts ({employee.metrics?.externalContacts || 0})</span>
                            </div>
                          )}
                          {(employee.metrics?.behaviorChange || 0) > 50 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span>Significant behavior change ({employee.metrics?.behaviorChange || 0}%)</span>
                            </div>
                          )}
                          {(employee.violations?.length || 0) > 0 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              <span>Active policy violations ({employee.violations?.length || 0})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                      {employee.riskLevel === 'Critical' ? 'Immediate attention required. Multiple risk factors detected.' :
                       employee.riskLevel === 'High' ? 'Enhanced monitoring recommended. Several concerning patterns.' :
                       employee.riskLevel === 'Medium' ? 'Standard monitoring sufficient. Some elevated activity.' :
                       'Low risk profile. Baseline monitoring appropriate.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {actionError && (
              <div className="pt-4">
                <ErrorMessage
                  message={actionError.message}
                  type="error"
                  onRetry={actionError.retryable ? retryLastAction : undefined}
                  dismissible
                  onDismiss={() => setActionError(null)}
                />
              </div>
            )}

            {/* Enhanced Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 mt-auto">
              <button 
                onClick={() => handleAction('investigate', 'Start Investigation')}
                disabled={!!actionLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
              >
                {actionLoading === 'investigate' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
                <span>{actionLoading === 'investigate' ? 'Starting...' : 'Start Investigation'}</span>
              </button>
              <button 
                onClick={() => handleAction('monitor', 'Monitor Activity')}
                disabled={!!actionLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 dark:bg-yellow-500 text-white rounded-lg hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
              >
                {actionLoading === 'monitor' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
                <span>{actionLoading === 'monitor' ? 'Setting up...' : 'Monitor Activity'}</span>
              </button>
              <button 
                onClick={() => handleAction('report', 'Generate Report')}
                disabled={!!actionLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
              >
                {actionLoading === 'report' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                <span>{actionLoading === 'report' ? 'Generating...' : 'Generate Report'}</span>
              </button>
              <button 
                onClick={() => handleAction('escalate', 'Escalate Threat')}
                disabled={!!actionLoading}
                className="flex items-center space-x-2 px-6 py-3 bg-red-600 dark:bg-red-500 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-w-[160px] justify-center"
              >
                {actionLoading === 'escalate' ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                <span>{actionLoading === 'escalate' ? 'Escalating...' : 'Escalate Threat'}</span>
              </button>
            </div>
          </div>
          
          {/* Enhanced AI Chatbot Sidebar */}
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-800">
            <SecurityChatbot 
              currentEmployee={employee}
              onActionClick={handleChatAction}
            />
          </div>
        </div>
      </div>
    </div>
  );
};