import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Bot,
  FileText,
  Calendar,
  User,
  TrendingUp,
  RefreshCw,
  Download,
  MoreVertical,
  Shield,
  Plus,
  Flag
} from 'lucide-react';
import { ViolationStatusBadge } from '../components/ViolationStatusBadge';
import { ViolationStatusManager } from '../components/ViolationStatusManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import { EmailViewModal } from '../components/EmailViewModal';
import { violationAPI } from '../services/api';
import { EmployeeAvatar } from '../components/EmployeeCard';

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

export const ViolationsPage: React.FC = () => {
  // Violations state
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Email Modal state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    severity: '',
    employeeId: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const statusOptions = [
    { value: '', label: 'All Statuses', count: 0 },
    { value: 'Active', label: 'Active', count: 0, color: 'text-red-600' },
    { value: 'Investigating', label: 'Investigating', count: 0, color: 'text-orange-600' },
    { value: 'False Positive', label: 'False Positive', count: 0, color: 'text-gray-600' },
    { value: 'Resolved', label: 'Resolved', count: 0, color: 'text-green-600' }
  ];

  const severityOptions = [
    { value: '', label: 'All Severities' },
    { value: 'Critical', label: 'Critical', color: 'text-red-600' },
    { value: 'High', label: 'High', color: 'text-orange-600' },
    { value: 'Medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'Low', label: 'Low', color: 'text-blue-600' }
  ];

  useEffect(() => {
    fetchViolations();
    fetchStatistics();
  }, [filters, pagination.page, pagination.limit]);

  const fetchViolations = async () => {
    console.log('🔧 Debug: fetchViolations called with filters:', filters, 'pagination:', pagination);
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filters.status && { status: filters.status }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.employeeId && { employeeId: parseInt(filters.employeeId) }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      console.log('🔧 Debug: API call params:', params);
      console.log('🔧 Debug: Raw filter values:', {
        status: filters.status,
        statusLength: filters.status?.length,
        statusType: typeof filters.status
      });
      
      const response = await violationAPI.getAll(params);
      console.log('🔧 Debug: API response:', response);
      
      setViolations(response.violations);
      setPagination(prev => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages
      }));
      
      console.log('🔧 Debug: Updated violations state with', response.violations.length, 'items');
    } catch (err: any) {
      console.error('❌ Debug: fetchViolations error:', err);
      setError(err.response?.data?.error || 'Failed to fetch violations');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const stats = await violationAPI.getStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const handleStatusChange = async (violationId: number, newStatus: string, reason: string) => {
    console.log('🔧 Debug: ViolationsPage handleStatusChange called with:', { violationId, newStatus, reason });
    
    try {
      console.log('🔧 Debug: Calling violationAPI.updateStatus...');
      const updateResult = await violationAPI.updateStatus(violationId, newStatus, reason);
      console.log('🔧 Debug: violationAPI.updateStatus completed with result:', updateResult);
      
      // Force a complete refresh by updating both violations and stats
      console.log('🔧 Debug: Forcing complete data refresh...');
      
      // Update the specific violation in the current list immediately
      setViolations(prev => prev.map(v => 
        v.id === violationId 
          ? { ...v, status: newStatus as any, updatedAt: new Date().toISOString() }
          : v
      ));
      
      // Then fetch fresh data from server to ensure consistency
      setTimeout(async () => {
        console.log('🔧 Debug: Fetching fresh data from server...');
        await Promise.all([
          fetchViolations(),
          fetchStatistics()
        ]);
        console.log('🔧 Debug: Fresh data loaded');
      }, 100);
      
      console.log('🔧 Debug: Status change completed successfully');
      
      // Show success message
      alert(`✅ Status successfully changed to "${newStatus}"`);
      
    } catch (err: any) {
      console.error('❌ Debug: handleStatusChange error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update status';
      console.error('❌ Full error details:', err);
      alert(`❌ Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  };

  const handleAIValidation = async (violationId: number, additionalContext?: string) => {
    console.log('🤖 AI Validation requested for violation:', violationId, 'with context:', additionalContext);
    
    try {
      console.log('🔄 Calling violationAPI.requestAIValidation...');
      const result = await violationAPI.requestAIValidation(violationId, 'evidence_validation', additionalContext);
      console.log('✅ AI validation API response:', result);
      
      // Show success message and refresh data
      alert('🤖 AI validation request submitted successfully. Results will be available shortly.');
      
      // Refresh the violation data to show any updates
      setTimeout(async () => {
        await fetchViolations();
        await fetchStatistics();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ AI validation error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to request AI validation';
      alert(`❌ AI Validation Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  };

  const handleViewDetails = async (violation: Violation) => {
    try {
      const detailedViolation = await violationAPI.getById(violation.id);
      setSelectedViolation(detailedViolation.violation);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch violation details:', err);
    }
  };

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'High': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

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

  const exportViolations = async () => {
    try {
      console.log('🔄 Exporting violations data...');
      
      // Get all violations (no pagination limit for export)
      const exportParams = {
        page: 1,
        limit: 1000, // Get a large number for export
        ...(filters.status && { status: filters.status }),
        ...(filters.severity && { severity: filters.severity }),
        ...(filters.employeeId && { employeeId: parseInt(filters.employeeId) }),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await violationAPI.getAll(exportParams);
      const violationsData = response.violations;

      // Convert to CSV format
      const csvHeaders = [
        'ID',
        'Type',
        'Severity', 
        'Status',
        'Description',
        'Employee Name',
        'Employee Email',
        'Department',
        'AI Validation Status',
        'AI Confidence Score',
        'Created Date',
        'Updated Date'
      ];

      const csvRows = violationsData.map(violation => [
        violation.id,
        violation.type,
        violation.severity,
        violation.status,
        `"${violation.description.replace(/"/g, '""')}"`, // Escape quotes
        violation.employee.name,
        violation.employee.email,
        violation.employee.department,
        violation.aiValidationStatus || 'Not validated',
        violation.aiValidationScore || 'N/A',
        new Date(violation.createdAt).toLocaleDateString(),
        new Date(violation.updatedAt).toLocaleDateString()
      ]);

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `violations-export-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      console.log('✅ Export completed successfully');
      alert(`✅ Exported ${violationsData.length} violations to CSV file`);

    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('❌ Failed to export violations. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="w-8 h-8 mr-3 text-red-600" />
            Security Violations
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage all security violations and incidents
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('🔧 Manual refresh triggered');
              fetchViolations();
              fetchStatistics();
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={exportViolations}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Total Violations</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {statistics.summary.total}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">All time</p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Active Issues</p>
                <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {statistics.summary.active}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">Needs attention</p>
              </div>
              <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-xl shadow-sm border border-orange-200 dark:border-orange-800 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Under Investigation</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {statistics.summary.investigating}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">In progress</p>
              </div>
              <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-700/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">False Positives</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  {statistics.summary.falsePositive}
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">Dismissed</p>
              </div>
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Resolved</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {statistics.summary.resolved}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Completed</p>
              </div>
              <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
            <Filter className="w-5 h-5 mr-2 text-blue-500" />
            Filters & Search
          </h3>
          <button
            onClick={() => setFilters({ search: '', status: '', severity: '', employeeId: '', sortBy: 'created_at', sortOrder: 'desc' })}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1"
          >
            <XCircle className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Enhanced Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Violations</label>
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by type, description, or employee..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Severity</label>
            <select
              value={filters.severity}
              onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {severityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="severity-desc">Highest Severity</option>
              <option value="severity-asc">Lowest Severity</option>
              <option value="updated_at-desc">Recently Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Violations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : error ? (
        <ErrorMessage message={error} />
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" key={`violations-table-${violations.length}-${Date.now()}`}>
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Violation Details</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Employee</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>Status</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Created</span>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {violations.map((violation) => (
                  <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${getRiskColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            {/* Enhanced Type Display with Category Detection Indicator */}
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {violation.source === 'category_detection' && (
                                <span className="inline-flex items-center space-x-1 mr-2">
                                  <Bot className="w-4 h-4 text-purple-500" />
                                  <span className="text-purple-600 dark:text-purple-400 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded-full">
                                    AI Category
                                  </span>
                                </span>
                              )}
                              <span className="text-gray-900 dark:text-white">
                                {violation.source === 'category_detection' 
                                  ? (violation.metadata?.categoryName || violation.type.replace('category_detection_', '').replace(/_/g, ' '))
                                  : violation.type
                                }
                              </span>
                            </div>
                            {/* Category Detection Details */}
                            {violation.source === 'category_detection' && violation.metadata && (
                              <div className="flex items-center space-x-2">
                                {violation.metadata.riskScore && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                    {violation.metadata.riskScore}% Risk
                                  </span>
                                )}
                                {violation.metadata.analysisMethod && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    {violation.metadata.analysisMethod}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                            {violation.description}
                          </div>
                          {/* Show Category Detection Context */}
                          {violation.source === 'category_detection' && violation.metadata?.reasoning && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 mt-2 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                              💡 {violation.metadata.reasoning}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <EmployeeAvatar employee={violation.employee} size="md" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {violation.employee.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {violation.employee.department}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <ViolationStatusManager
                        violation={violation}
                        onStatusChange={handleStatusChange}
                        onAIValidate={handleAIValidation}
                        canEdit={true}
                      />
                    </td>

                    <td className="px-6 py-5">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {formatTimeAgo(violation.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(violation.createdAt).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleViewDetails(violation)}
                        className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors group-hover:shadow-md"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Enhanced Pagination */}
          {pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
                <div className="flex items-center space-x-6">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
                    <span className="font-medium">{pagination.total}</span> violations
                  </div>
                  
                  {/* Page Size Selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Show:</span>
                    <select
                      value={pagination.limit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value);
                        setPagination(prev => ({ 
                          ...prev, 
                          limit: newLimit, 
                          page: 1 // Reset to first page when changing page size
                        }));
                      }}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {/* First Page */}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center space-x-1"
                    title="First page"
                  >
                    <span>First</span>
                  </button>

                  {/* Previous Page */}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const currentPage = pagination.page;
                      const totalPages = pagination.totalPages;
                      const pages = [];
                      
                      // Always show first page
                      if (currentPage > 3) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            1
                          </button>
                        );
                        if (currentPage > 4) {
                          pages.push(<span key="ellipsis1" className="px-2 text-gray-500">...</span>);
                        }
                      }

                      // Show pages around current page
                      for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => setPagination(prev => ({ ...prev, page: i }))}
                            className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                              i === currentPage
                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }

                      // Always show last page
                      if (currentPage < totalPages - 2) {
                        if (currentPage < totalPages - 3) {
                          pages.push(<span key="ellipsis2" className="px-2 text-gray-500">...</span>);
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => setPagination(prev => ({ ...prev, page: totalPages }))}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            {totalPages}
                          </button>
                        );
                      }

                      return pages;
                    })()}
                  </div>

                  {/* Next Page */}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Next
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    title="Last page"
                  >
                    Last
                  </button>

                  {/* Page Input */}
                  <div className="flex items-center space-x-2 ml-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Go to:</span>
                    <input
                      type="number"
                      min={1}
                      max={pagination.totalPages}
                      value={pagination.page}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= pagination.totalPages) {
                          setPagination(prev => ({ ...prev, page }));
                        }
                      }}
                      className="w-20 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Enhanced Detailed Violation Modal */}
      {showDetailsModal && selectedViolation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Enhanced Header */}
            <div className="relative bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 p-8 border-b border-gray-200 dark:border-gray-700">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10"></div>
              
              <div className="relative flex items-start justify-between">
                <div className="flex items-start space-x-6">
                  {/* Violation Icon */}
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                    selectedViolation.severity === 'Critical' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                    selectedViolation.severity === 'High' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                    selectedViolation.severity === 'Medium' ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-br from-blue-500 to-blue-600'
                  }`}>
                    <AlertTriangle className="w-8 h-8 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${getRiskColor(selectedViolation.severity)} shadow-sm`}>
                        {selectedViolation.severity} Severity
                      </span>
                      <ViolationStatusBadge status={selectedViolation.status} />
                      {selectedViolation.source === 'category_detection' && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium rounded-full">
                          <Bot className="w-4 h-4" />
                          <span>AI Detection</span>
                        </span>
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {selectedViolation.source === 'category_detection' 
                        ? (selectedViolation.metadata?.categoryName || selectedViolation.type.replace('category_detection_', '').replace(/_/g, ' '))
                        : selectedViolation.type
                      }
                    </h2>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed max-w-2xl">
                      {selectedViolation.description}
                    </p>
                    
                    <div className="flex items-center space-x-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Created {formatTimeAgo(selectedViolation.createdAt)}</span>
                      </div>
                      {selectedViolation.updatedAt !== selectedViolation.createdAt && (
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Updated {formatTimeAgo(selectedViolation.updatedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Enhanced Content */}
            <div className="p-8 overflow-y-auto max-h-[calc(95vh-200px)] space-y-8">
              
              {/* Employee Information Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <User className="w-5 h-5 text-blue-500 mr-2" />
                  Employee Information
                </h3>
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <EmployeeAvatar employee={selectedViolation.employee} size="lg" />
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedViolation.employee.name}
                    </div>
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      {selectedViolation.employee.email}
                    </div>
                    <div className="text-gray-600 dark:text-gray-300">
                      {selectedViolation.employee.department}
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Section */}
              {selectedViolation.evidence && selectedViolation.evidence.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 text-amber-500 mr-2" />
                    Evidence ({selectedViolation.evidence.length} items)
                  </h3>
                  <div className="grid gap-3">
                    {selectedViolation.evidence.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Category Detection Details */}
              {selectedViolation.source === 'category_detection' && selectedViolation.metadata && (
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Category Detection Analysis</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {selectedViolation.metadata.categoryName && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Threat Category</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedViolation.metadata.categoryName}
                        </div>
                      </div>
                    )}
                    
                    {selectedViolation.metadata.riskScore && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Risk Score</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedViolation.metadata.riskScore}%
                        </div>
                      </div>
                    )}
                    
                    {selectedViolation.metadata.confidence && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">AI Confidence</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedViolation.metadata.confidence}%
                        </div>
                      </div>
                    )}
                    
                    {selectedViolation.metadata.analysisMethod && (
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                        <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Analysis Method</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedViolation.metadata.analysisMethod}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedViolation.metadata.reasoning && (
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700 mb-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-2">AI Analysis Reasoning</div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedViolation.metadata.reasoning}
                      </p>
                    </div>
                  )}
                  
                  {selectedViolation.metadata.detectedPatterns && selectedViolation.metadata.detectedPatterns.length > 0 && (
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700 mb-4">
                      <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-3">Detected Threat Patterns</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedViolation.metadata.detectedPatterns.map((pattern, index) => (
                          <span key={index} className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800">
                            {pattern}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Email Evidence Button */}
                  {selectedViolation.metadata.emailId && (
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">Email Evidence Available</div>
                          <div className="text-gray-600 dark:text-gray-300 text-sm">
                            {selectedViolation.metadata.emailSubject || 'Email evidence detected'}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedEmailId(selectedViolation.metadata.emailId);
                            setShowEmailModal(true);
                          }}
                          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View Email</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI Validation Section */}
              {selectedViolation.aiValidationStatus && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Validation Results</h3>
                  </div>
                  
                  {selectedViolation.aiValidationScore && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Confidence Score</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {selectedViolation.aiValidationScore}%
                        </div>
                      </div>
                      
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                        <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">Validation Status</div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {selectedViolation.aiValidationStatus}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {selectedViolation.aiValidationReasoning && (
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                      <div className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-2">AI Analysis</div>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedViolation.aiValidationReasoning}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Metadata (for non-category violations) */}
              {selectedViolation.source !== 'category_detection' && selectedViolation.metadata && Object.keys(selectedViolation.metadata).length > 0 && (
                <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700 dark:to-slate-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 text-gray-500 mr-2" />
                    Additional Information
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedViolation.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Status Management Section */}
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Shield className="w-5 h-5 text-indigo-500 mr-2" />
                  Violation Management
                </h3>
                <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                  <ViolationStatusManager
                    violation={selectedViolation}
                    onStatusChange={handleStatusChange}
                    onAIValidate={handleAIValidation}
                    canEdit={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email View Modal */}
      {selectedEmailId && (
        <EmailViewModal
          emailId={selectedEmailId}
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            setSelectedEmailId(null);
          }}
        />
      )}
    </div>
  );
};