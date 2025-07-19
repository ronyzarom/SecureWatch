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
import { violationAPI, complianceAPI } from '../services/api';
import { ComplianceIncident } from '../types';

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

type TabType = 'violations' | 'incidents';

export const ViolationsPage: React.FC = () => {
  // Tab management
  const [activeTab, setActiveTab] = useState<TabType>('violations');
  
  // Violations state (existing)
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  // Compliance Incidents state (new)
  const [incidents, setIncidents] = useState<ComplianceIncident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<ComplianceIncident | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showCreateIncidentModal, setShowCreateIncidentModal] = useState(false);

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
    if (activeTab === 'violations') {
      fetchViolations();
      fetchStatistics();
    } else if (activeTab === 'incidents') {
      fetchIncidents();
    }
  }, [filters, pagination.page, pagination.limit, activeTab]);

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

  const fetchIncidents = async () => {
    console.log('🔧 Debug: fetchIncidents called');
    setIncidentsLoading(true);
    setIncidentsError(null);

    try {
      const response = await complianceAPI.incidents.getAll();
      console.log('🔧 Debug: Incidents API response:', response);
      
      setIncidents(response.incidents || []);
      console.log('🔧 Debug: Updated incidents state with', (response.incidents || []).length, 'items');
    } catch (err: any) {
      console.error('❌ Debug: fetchIncidents error:', err);
      setIncidentsError(err.response?.data?.error || 'Failed to fetch compliance incidents');
    } finally {
      setIncidentsLoading(false);
    }
  };

  const handleCreateIncident = async (data: any) => {
    try {
      await complianceAPI.incidents.create(data);
      setShowCreateIncidentModal(false);
      fetchIncidents();
    } catch (err) {
      console.error('Error creating incident:', err);
      setIncidentsError('Failed to create incident');
    }
  };

  const handleUpdateIncidentStatus = async (incident: ComplianceIncident, status: string) => {
    try {
      await complianceAPI.incidents.update(incident.id, { status });
      fetchIncidents();
    } catch (err) {
      console.error('Error updating incident status:', err);
      setIncidentsError('Failed to update incident status');
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
            Violations & Incidents
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage security violations and compliance incidents
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              console.log('🔧 Manual refresh triggered');
              if (activeTab === 'violations') {
                fetchViolations();
                fetchStatistics();
              } else {
                fetchIncidents();
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          {activeTab === 'incidents' && (
            <button
              onClick={() => setShowCreateIncidentModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Incident</span>
            </button>
          )}
          <button 
            onClick={exportViolations}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('violations')}
            className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'violations'
                ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <XCircle className="w-5 h-5 mr-2" />
            Security Violations
          </button>
          <button
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === 'incidents'
                ? 'border-orange-600 text-orange-600 bg-orange-50 dark:bg-orange-900/20'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <Shield className="w-5 h-5 mr-2" />
            Compliance Incidents
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

      {/* Tab Content */}
      {activeTab === 'violations' ? (
        <>
          {/* Violations List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <ErrorMessage message={error} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" key={`violations-table-${violations.length}-${Date.now()}`}>
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Violation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        AI Validation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {violations.map((violation) => (
                      <tr key={violation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(violation.severity)}`}>
                              {violation.severity}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {violation.type}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {violation.description}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={violation.employee.photo}
                              alt={violation.employee.name}
                              className="w-8 h-8 rounded-full"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {violation.employee.name}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {violation.employee.department}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <ViolationStatusManager
                            violation={violation}
                            onStatusChange={handleStatusChange}
                            onAIValidate={handleAIValidation}
                            canEdit={true}
                          />
                        </td>

                        <td className="px-6 py-4">
                          {violation.aiValidationStatus && violation.aiValidationScore ? (
                            <div className="flex items-center space-x-2">
                              <Bot className="w-4 h-4 text-blue-500" />
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {violation.aiValidationScore}% confidence
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">Not validated</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(violation.createdAt)}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewDetails(violation)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white dark:bg-gray-800 px-6 py-3 border-t border-gray-200 dark:border-gray-700">
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
                              page: 1 // Reset to first page when changing page size
                            }));
                          }}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                        </select>
                        <span className="text-sm text-gray-600 dark:text-gray-400">per page</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* First Page */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: 1 }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="First page"
                      >
                        ⇤
                      </button>

                      {/* Previous Page */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        ← Previous
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
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
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
                                className={`px-3 py-1 border rounded text-sm ${
                                  i === currentPage
                                    ? 'bg-blue-600 text-white border-blue-600'
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
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
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
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Next →
                      </button>

                      {/* Last Page */}
                      <button
                        onClick={() => setPagination(prev => ({ ...prev, page: pagination.totalPages }))}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                        title="Last page"
                      >
                        ⇥
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
                          className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Compliance Incidents List */}
          {incidentsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : incidentsError ? (
            <ErrorMessage message={incidentsError} />
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Incident
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {incidents.map((incident) => (
                      <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div className="flex items-start space-x-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              incident.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                              incident.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                              incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            }`}>
                              {incident.severity}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {incident.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {incident.incident_type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            incident.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            incident.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' :
                            incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            incident.status === 'open' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            incident.status === 'investigating' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            incident.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                          }`}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(incident.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setSelectedIncident(incident);
                                setShowIncidentModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <select
                              value={incident.status}
                              onChange={(e) => handleUpdateIncidentStatus(incident, e.target.value)}
                              className="text-xs border rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
                            >
                              <option value="open">Open</option>
                              <option value="investigating">Investigating</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {incidents.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No compliance incidents found
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Detailed Violation Modal */}
      {showDetailsModal && selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Violation Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Violation Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(selectedViolation.severity)}`}>
                      {selectedViolation.severity}
                    </span>
                    <ViolationStatusBadge status={selectedViolation.status} />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {selectedViolation.type}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedViolation.description}
                  </p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Employee</h4>
                <div className="flex items-center space-x-3">
                  <img
                    src={selectedViolation.employee.photo}
                    alt={selectedViolation.employee.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {selectedViolation.employee.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedViolation.employee.email} • {selectedViolation.employee.department}
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              {selectedViolation.evidence && selectedViolation.evidence.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Evidence</h4>
                  <div className="space-y-2">
                    {selectedViolation.evidence.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="w-4 h-4" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Validation */}
              {selectedViolation.aiValidationStatus && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <Bot className="w-5 h-5 text-blue-500" />
                    <h4 className="font-medium text-gray-900 dark:text-white">AI Validation</h4>
                  </div>
                  
                  {selectedViolation.aiValidationScore && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Confidence Score</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedViolation.aiValidationScore}%
                        </span>
                      </div>
                      
                      {selectedViolation.aiValidationReasoning && (
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400 block mb-1">Analysis</span>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {selectedViolation.aiValidationReasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Metadata */}
              {selectedViolation.metadata && Object.keys(selectedViolation.metadata).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Additional Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(selectedViolation.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Status Management */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Manage Status</h4>
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
      )}
    </div>
  );
};