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
  X
} from 'lucide-react';
import { ViolationCard } from '../components/ViolationCard';
import { ViolationStatusBadge } from '../components/ViolationStatusBadge';
import { ViolationStatusManager } from '../components/ViolationStatusManager';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import EmployeeAvatar from '../components/EmployeeAvatar';
import { violationAPI } from '../services/api';

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
  // Violations state (existing)
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
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
    limit: 12, // Better for card grid layout (3 columns × 4 rows)
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

  const handleViewDetails = async (violation: Violation) => {
    try {
      const detailedViolation = await violationAPI.getById(violation.id);
      setSelectedViolation(detailedViolation.violation);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch violation details:', err);
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

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'High': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'Low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
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

      const csvRows = violationsData.map((violation: Violation) => [
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
        ...csvRows.map((row: any[]) => row.join(','))
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
            Manage and investigate security violations
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statistics.summary.total}
                </p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-red-600">
                  {statistics.summary.active}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Investigating</p>
                <p className="text-2xl font-bold text-orange-600">
                  {statistics.summary.investigating}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">False Positive</p>
                <p className="text-2xl font-bold text-gray-600">
                  {statistics.summary.falsePositive}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
                <p className="text-2xl font-bold text-green-600">
                  {statistics.summary.resolved}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search violations..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {severityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split('-');
              setFilters(prev => ({ ...prev, sortBy, sortOrder }));
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="created_at-desc">Newest First</option>
            <option value="created_at-asc">Oldest First</option>
            <option value="severity-desc">Highest Severity</option>
            <option value="severity-asc">Lowest Severity</option>
            <option value="updated_at-desc">Recently Updated</option>
          </select>
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {violations.map((violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                onViewDetails={() => handleViewDetails(violation)}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {/* Pagination */}
          {violations.length > 0 && pagination.totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} results
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
                          page: 1
                        }));
                      }}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value={9}>9</option>
                      <option value={12}>12</option>
                      <option value={18}>18</option>
                      <option value={24}>24</option>
                    </select>
                    <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPagination(prev => ({ ...prev, page: pageNum }))}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            pageNum === pagination.page
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detailed Violation Modal */}
      {showDetailsModal && selectedViolation && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Violation Details
                    </h2>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(selectedViolation.severity)}`}>
                    {selectedViolation.severity}
                  </span>
                  <ViolationStatusBadge status={selectedViolation.status} />
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6 space-y-6">
                {/* Violation Summary */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg p-6 border border-red-100 dark:border-red-800">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {selectedViolation.type}
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        {selectedViolation.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>Created {formatTimeAgo(selectedViolation.createdAt)}</span>
                        </div>
                        {selectedViolation.updatedAt !== selectedViolation.createdAt && (
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>Updated {formatTimeAgo(selectedViolation.updatedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Employee Information */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2 text-gray-500" />
                    Employee Information
                  </h4>
                  <div className="flex items-center space-x-4">
                    <EmployeeAvatar employee={selectedViolation.employee} size="xl" />
                    <div className="flex-1">
                      <h5 className="text-lg font-medium text-gray-900 dark:text-white">
                        {selectedViolation.employee.name}
                      </h5>
                      <p className="text-gray-600 dark:text-gray-400">
                        {selectedViolation.employee.email}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500">
                        {selectedViolation.employee.department}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Evidence */}
                  {selectedViolation.evidence && selectedViolation.evidence.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-gray-500" />
                        Evidence
                      </h4>
                      <div className="space-y-3">
                        {selectedViolation.evidence.map((item, index) => (
                          <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mt-0.5">
                              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                {index + 1}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {item}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Validation */}
                  {selectedViolation.aiValidationStatus && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Bot className="w-5 h-5 mr-2 text-blue-500" />
                        AI Validation
                      </h4>
                      
                      {selectedViolation.aiValidationScore && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Confidence Score
                            </span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${selectedViolation.aiValidationScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                {selectedViolation.aiValidationScore}%
                              </span>
                            </div>
                          </div>
                          
                          {selectedViolation.aiValidationReasoning && (
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                AI Analysis
                              </h5>
                              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 leading-relaxed">
                                {selectedViolation.aiValidationReasoning}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Additional Information */}
                {selectedViolation.metadata && Object.keys(selectedViolation.metadata).length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Additional Information
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 overflow-x-auto">
                      <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedViolation.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Status Management */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
                    Manage Status
                  </h4>
                  <ViolationStatusManager
                    violation={selectedViolation}
                    onStatusChange={handleStatusChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};