import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, AlertTriangle, TrendingUp, Activity, Shield, Mail, Users, Clock, Database, Eye, FileText, Zap, Target
} from 'lucide-react';
import { Employee, PolicyViolation } from '../types';
import { getRiskColor, getRiskTextColor, formatTimeAgo } from '../utils/riskUtils';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { EmailViewModal } from './EmailViewModal';
import { ViolationStatusManager } from './ViolationStatusManager';
import { employeeAPI, categoryDetectionAPI } from '../services/api';
import { withErrorHandling, createError, ErrorType, logError } from '../utils/errorUtils';
import { AppError, CategoryDetectionSummary } from '../types';

interface EmployeeDetailsModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
}

// Avatar component for employee details modal
const ModalAvatar: React.FC<{ employee: Employee }> = ({ employee }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

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
        className="w-full h-full flex items-center justify-center text-white font-bold text-2xl"
        style={{ backgroundColor }}
        title={`${employee.name} (${initials})`}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {imageLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-white font-bold text-2xl animate-pulse"
          style={{ backgroundColor }}
        >
          {initials}
        </div>
      )}
      <img 
        src={photoUrl}
        alt={employee.name}
        className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onError={() => {
          console.log(`Modal avatar failed to load for ${employee.name}: ${photoUrl}`);
          setImageError(true);
          setImageLoading(false);
        }}
        onLoad={() => {
          console.log(`Modal avatar loaded successfully for ${employee.name}`);
          setImageLoading(false);
        }}
      />
    </div>
  );
};

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ employee, isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [detailedEmployee, setDetailedEmployee] = useState<Employee | null>(null);
  const [violations, setViolations] = useState<PolicyViolation[]>([]);
  const [categoryDetections, setCategoryDetections] = useState<CategoryDetectionSummary | null>(null);
  const [categoryDetectionsLoading, setCategoryDetectionsLoading] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  useEffect(() => {
    if (employee && isOpen) {
      fetchEmployeeDetails();
    }
  }, [employee, isOpen]);

  const fetchEmployeeDetails = async () => {
    if (!employee) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching detailed employee data for:', employee.name);
      
      const { data, error: fetchError } = await withErrorHandling(
        () => employeeAPI.getById(Number(employee.id)),
        'EmployeeDetailsModal.fetchEmployeeDetails'
      );

      if (fetchError) {
        throw fetchError;
      }

      console.log('✅ Employee details fetched:', data);
      
      if (data.employee) {
        setDetailedEmployee({
          ...employee,
          ...data.employee
        });
      }
      
      if (data.violations) {
        setViolations(data.violations);
      }
      
      // Fetch category detection results
      fetchCategoryDetections();
      
    } catch (error) {
      const appError = error instanceof Error 
        ? createError(ErrorType.SERVER, 'Failed to load employee details. Please try again.', error, undefined, true)
        : error as AppError;
      
      setError(appError);
      logError(appError, 'EmployeeDetailsModal');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryDetections = async () => {
    if (!employee) return;

    setCategoryDetectionsLoading(true);

    try {
      console.log('🎯 Fetching category detection results for:', employee.name);
      
      const detectionData = await categoryDetectionAPI.getEmployeeCategoryDetections(
        Number(employee.id), 
        30 // Last 30 days
      );

      console.log('✅ Category detections fetched:', detectionData);
      setCategoryDetections(detectionData);
      
    } catch (error) {
      console.error('❌ Failed to fetch category detections:', error);
      // Don't show error for category detections, just log it
    } finally {
      setCategoryDetectionsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchEmployeeDetails();
  };

  if (!isOpen) {
    return null;
  }

  if (loading && !detailedEmployee) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-black dark:bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 dark:bg-black dark:bg-opacity-80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
        <ErrorMessage
          message={error.message}
          type="error"
          onRetry={error.retryable ? () => fetchEmployeeDetails() : undefined}
          dismissible
          onDismiss={() => setError(null)}
        />
      </div>
    );
  }

  if (!detailedEmployee) {
    return null; // Should not happen if loading and error are handled
  }

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
                  <ModalAvatar employee={detailedEmployee} />
                </div>
                <div className={`absolute -top-2 -right-2 w-10 h-10 ${getRiskColor(detailedEmployee.riskLevel)} rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-600`}>
                  <span className="text-white text-sm font-bold">{detailedEmployee.riskScore}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{detailedEmployee.name}</h1>
                  <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getRiskColor(detailedEmployee.riskLevel)} bg-opacity-10 border border-current border-opacity-20`}>
                    {getRiskLevelIcon(detailedEmployee.riskLevel)}
                    <span className={`text-sm font-semibold ${getRiskTextColor(detailedEmployee.riskLevel)}`}>
                      {detailedEmployee.riskLevel} Risk
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1 mb-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">{detailedEmployee.role}</p>
                  <p className="text-gray-600 dark:text-gray-400">{detailedEmployee.department} Department</p>
                  <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">{detailedEmployee.email}</p>
                </div>
                
                <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4 dark:text-gray-400" />
                  <span>Last activity: {formatTimeAgo(detailedEmployee.lastActivity)}</span>
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
        
        {/* Enhanced Main Content */}
        <div className="flex-1 p-8 space-y-8 overflow-y-auto flex flex-col">
            {/* Category Detection Results Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                <Target className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <span>AI Threat Analysis</span>
                {categoryDetectionsLoading && <LoadingSpinner size="sm" />}
              </h2>
              
              {categoryDetections ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Total Detections */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-3">
                      <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded-full">
                        30 Days
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                      {categoryDetections.summary.totalDetections}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-200">Total Detections</p>
                  </div>

                  {/* Unique Categories */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between mb-3">
                      <AlertTriangle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800/50 text-purple-800 dark:text-purple-200 rounded-full">
                        Categories
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                      {categoryDetections.summary.uniqueCategories}
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-200">Threat Categories</p>
                  </div>

                  {/* Max Risk Score */}
                  <div className={`bg-gradient-to-br p-6 rounded-xl border ${
                    categoryDetections.summary.maxRiskScore >= 80 
                      ? 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
                      : categoryDetections.summary.maxRiskScore >= 60
                      ? 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800'
                      : 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <TrendingUp className={`w-6 h-6 ${
                        categoryDetections.summary.maxRiskScore >= 80 ? 'text-red-600 dark:text-red-400'
                        : categoryDetections.summary.maxRiskScore >= 60 ? 'text-orange-600 dark:text-orange-400'
                        : 'text-green-600 dark:text-green-400'
                      }`} />
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        categoryDetections.summary.maxRiskScore >= 80 
                          ? 'bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200'
                          : categoryDetections.summary.maxRiskScore >= 60
                          ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-800 dark:text-orange-200'
                          : 'bg-green-200 dark:bg-green-800/50 text-green-800 dark:text-green-200'
                      }`}>
                        Risk
                      </span>
                    </div>
                    <p className={`text-3xl font-bold mb-1 ${
                      categoryDetections.summary.maxRiskScore >= 80 ? 'text-red-900 dark:text-red-100'
                      : categoryDetections.summary.maxRiskScore >= 60 ? 'text-orange-900 dark:text-orange-100'
                      : 'text-green-900 dark:text-green-100'
                    }`}>
                      {categoryDetections.summary.maxRiskScore}%
                    </p>
                    <p className={`text-sm ${
                      categoryDetections.summary.maxRiskScore >= 80 ? 'text-red-700 dark:text-red-200'
                      : categoryDetections.summary.maxRiskScore >= 60 ? 'text-orange-700 dark:text-orange-200'
                      : 'text-green-700 dark:text-green-200'
                    }`}>
                      Max Risk Score
                    </p>
                  </div>

                  {/* Critical Detections */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-between mb-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      <span className="text-xs px-2 py-1 bg-red-200 dark:bg-red-800/50 text-red-800 dark:text-red-200 rounded-full">
                        Critical
                      </span>
                    </div>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100 mb-1">
                      {categoryDetections.summary.criticalDetections}
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-200">Critical Threats</p>
                  </div>
                </div>
              ) : categoryDetectionsLoading ? (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8 text-center mb-8">
                  <LoadingSpinner size="md" />
                  <p className="text-gray-600 dark:text-gray-400 mt-2">Loading threat analysis...</p>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center mb-8 border border-green-200 dark:border-green-800">
                  <Shield className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <p className="text-green-800 dark:text-green-200 font-medium">No threat categories detected</p>
                  <p className="text-green-600 dark:text-green-400 text-sm">This employee shows clean AI analysis results</p>
                </div>
              )}

              {/* Top Categories */}
              {categoryDetections && categoryDetections.topCategories.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Threat Categories</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categoryDetections.topCategories.slice(0, 4).map((category, index) => (
                      <div key={category.categoryId} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">{category.categoryName}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            category.severity === 'Critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            category.severity === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            category.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {category.severity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>{category.detectionCount} detections</span>
                          <span>Avg: {category.avgRiskScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-1">{detailedEmployee.metrics?.emailVolume || 0}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-200">
                    {(detailedEmployee.metrics?.emailVolume || 0) > 100 ? '↑ Above average' : '→ Normal range'}
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
                                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 mb-1">{detailedEmployee.metrics?.externalContacts || 0}</p>
                <p className="text-sm text-green-700 dark:text-green-200">
                  {(detailedEmployee.metrics?.externalContacts || 0) > 15 ? '↑ High activity' : '→ Normal activity'}
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
                                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mb-1">{detailedEmployee.metrics?.afterHoursActivity || 0}%</p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  {(detailedEmployee.metrics?.afterHoursActivity || 0) > 50 ? '⚠ Elevated' : '→ Normal pattern'}
                </p>
                </div>
              </div>
            </div>

            {/* Policy Violations */}
            {(violations?.length || 0) > 0 && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center space-x-2">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <span>Security Violations</span>
                  <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
                    {violations?.length || 0} Active
                  </span>
                </h2>
                
                <div className="space-y-4">
                  {(violations || []).map((violation) => (
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
                          
                          <p className="text-red-800 dark:text-red-200 mb-3 leading-relaxed">
                            {violation.metadata?.emailSubject ? 
                              `High-risk email detected: "${violation.metadata.emailSubject}"` : 
                              violation.description
                            }
                          </p>
                          
                          {/* Evidence Details */}
                          {violation.metadata && (
                            <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3 mb-3">
                              <h5 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-2">
                                Email Evidence Details
                              </h5>
                              <div className="space-y-1 text-sm">
                                {violation.metadata.emailSubject && (
                                  <div className="flex items-start space-x-2">
                                    <span className="font-medium text-red-800 dark:text-red-200 min-w-0">Subject:</span>
                                    <span className="text-red-700 dark:text-red-300 break-words">
                                      {violation.metadata.emailSubject}
                                    </span>
                                  </div>
                                )}
                                {(() => {
                                  const risk = violation.metadata.riskScore ?? violation.metadata.complianceRiskScore;
                                  if (risk === undefined) return null;
                                  return (
                                    <div className="flex items-center space-x-2">
                                      <span className="font-medium text-red-800 dark:text-red-200">Risk Score:</span>
                                      <span className={`font-bold ${
                                        risk >= 90 ? 'text-red-600 dark:text-red-400' :
                                        risk >= 70 ? 'text-orange-600 dark:text-orange-400' :
                                        'text-yellow-600 dark:text-yellow-400'
                                      }`}>
                                        {risk}%
                                      </span>
                                    </div>
                                  );
                                })()}
                                {violation.metadata.regulationCode && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-red-800 dark:text-red-200">Regulation:</span>
                                    <span className="text-red-700 dark:text-red-300">
                                      {violation.metadata.regulationCode}
                                    </span>
                                  </div>
                                )}
                                {violation.metadata.article && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-red-800 dark:text-red-200">Article:</span>
                                    <span className="text-red-700 dark:text-red-300">
                                      {violation.metadata.article}
                                    </span>
                                  </div>
                                )}
                                {violation.metadata.policySection && (
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-red-800 dark:text-red-200">Policy:</span>
                                    <span className="text-red-700 dark:text-red-300">
                                      {violation.metadata.policySection}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {/* View Email Button */}
                              {violation.metadata?.emailId && (
                                <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                  <button
                                    onClick={() => {
                                      setSelectedEmailId(violation.metadata.emailId);
                                      setEmailModalOpen(true);
                                    }}
                                    className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                                  >
                                    <Eye className="w-4 h-4" />
                                    <span>View Email</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4 text-sm text-red-700 dark:text-red-300">
                              <span className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4 dark:text-red-300" />
                                <span>{formatTimeAgo(violation.timestamp)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <FileText className="w-4 h-4 dark:text-red-300" />
                                <span>
                                  {violation.evidence?.length ? 
                                    `${violation.evidence.length} evidence items` : 
                                    violation.metadata?.emailId ? 
                                      `Email Evidence - Risk: ${(
                                        violation.metadata.riskScore ?? violation.metadata.complianceRiskScore ?? 'N/A'
                                      )}%` :
                                      'No evidence'
                                  }
                                </span>
                              </span>
                              {violation.metadata?.emailSubject && (
                                <span className="flex items-center space-x-1">
                                  <Mail className="w-4 h-4 dark:text-red-300" />
                                  <span className="truncate max-w-48" title={violation.metadata.emailSubject}>
                                    {violation.metadata.emailSubject}
                                  </span>
                                </span>
                              )}
                            </div>
                            
                            <ViolationStatusManager
                              violation={violation}
                              onStatusChange={(newStatus) => {
                                // This function will be implemented in ViolationStatusManager
                                console.log('Status changed to:', newStatus);
                              }}
                              onAIDecision={(decision) => {
                                // This function will be implemented in ViolationStatusManager
                                console.log('AI decision:', decision);
                              }}
                            />
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
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{detailedEmployee.metrics?.dataTransfer || 0} GB</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">This week</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Security Events</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{detailedEmployee.metrics?.securityEvents || 0}</span>
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
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{detailedEmployee.metrics?.behaviorChange || 0}%</span>
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
                        <span className="font-bold text-purple-900 dark:text-purple-100">{detailedEmployee.riskScore}/100</span>
                      </div>
                      <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2 mb-4">
                        <div 
                          className={`h-2 rounded-full ${getRiskColor(detailedEmployee.riskLevel)}`}
                          style={{ width: `${detailedEmployee.riskScore}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="mt-auto">
                      <div className="bg-white dark:bg-gray-800/50 bg-opacity-50 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Risk Factors</h4>
                        <div className="space-y-1 text-sm text-purple-700 dark:text-purple-300">
                          {(detailedEmployee.metrics?.afterHoursActivity || 0) > 50 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span>High after-hours activity ({detailedEmployee.metrics?.afterHoursActivity || 0}%)</span>
                            </div>
                          )}
                          {(detailedEmployee.metrics?.externalContacts || 0) > 15 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span>Elevated external contacts ({detailedEmployee.metrics?.externalContacts || 0})</span>
                            </div>
                          )}
                          {(detailedEmployee.metrics?.behaviorChange || 0) > 50 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                              <span>Significant behavior change ({detailedEmployee.metrics?.behaviorChange || 0}%)</span>
                            </div>
                          )}
                          {(violations?.length || 0) > 0 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                              <span>Active policy violations ({violations?.length || 0})</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-sm text-purple-700 dark:text-purple-300 leading-relaxed">
                      {detailedEmployee.riskLevel === 'Critical' ? 'Immediate attention required. Multiple risk factors detected.' :
                       detailedEmployee.riskLevel === 'High' ? 'Enhanced monitoring recommended. Several concerning patterns.' :
                       detailedEmployee.riskLevel === 'Medium' ? 'Standard monitoring sufficient. Some elevated activity.' :
                       'Low risk profile. Baseline monitoring appropriate.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="pt-4">
                <ErrorMessage
                  message={error.message}
                  type="error"
                  onRetry={error.retryable ? () => fetchEmployeeDetails() : undefined}
                  dismissible
                  onDismiss={() => setError(null)}
                />
              </div>
            )}
        </div>
      </div>
      
      {/* Email View Modal */}
      {selectedEmailId && (
        <EmailViewModal
          emailId={selectedEmailId}
          isOpen={emailModalOpen}
          onClose={() => {
            setEmailModalOpen(false);
            setSelectedEmailId(null);
          }}
        />
      )}
    </div>
  );
};