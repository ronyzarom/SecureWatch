import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Users, 
  FileText, 
  BookOpen,
  TrendingUp,
  AlertCircle,
  Calendar,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface ComplianceDashboardData {
  regulations: {
    total: number;
    active: number;
  };
  policies: {
    total: number;
    active: number;
  };
  profiles: {
    total: number;
  };
  employees: {
    total: number;
    assignedProfile: number;
    neverReviewed: number;
    retentionOverdue: number;
  };
  incidents: {
    total: number;
    open: number;
    critical: number;
    notificationOverdue: number;
  };
  complianceScore: {
    overall: number;
    trend: string;
  };
}

interface ComplianceEmployee {
  id: number;
  name: string;
  email: string;
  department: string;
  compliance_profile: string;
  retention_status: string;
  review_status: string;
}

interface ComplianceIncident {
  id: number;
  incident_type: string;
  severity: string;
  title: string;
  employee_name?: string;
  discovered_at: string;
  notification_status: string;
}

export const ComplianceDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<ComplianceDashboardData | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<ComplianceIncident[]>([]);
  const [employeesNeedingAttention, setEmployeesNeedingAttention] = useState<ComplianceEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/compliance/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch compliance dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    }
  };

  const fetchRecentIncidents = async () => {
    try {
      const response = await fetch('/api/compliance/incidents?limit=5', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch compliance incidents');
      }

      const data = await response.json();
      setRecentIncidents(data.incidents || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
    }
  };

  const fetchEmployeesNeedingAttention = async () => {
    try {
      const response = await fetch('/api/compliance/employees/status?status=needs_attention&limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch employees needing attention');
      }

      const data = await response.json();
      setEmployeesNeedingAttention(data.employees || []);
    } catch (err) {
      console.error('Error fetching employees needing attention:', err);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      fetchRecentIncidents(),
      fetchEmployeesNeedingAttention()
    ]);
    setRefreshing(false);
  };

  const refreshComplianceEngine = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/compliance/refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh compliance engine');
      }

      // Refresh all data after engine refresh
      await refreshData();
    } catch (err) {
      console.error('Error refreshing compliance engine:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh compliance engine');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchDashboardData(),
        fetchRecentIncidents(),
        fetchEmployeesNeedingAttention()
      ]);
      
      setLoading(false);
    };

    loadData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'compliant': return 'text-green-600';
      case 'overdue': return 'text-red-600';
      case 'due_soon': return 'text-orange-600';
      case 'never_reviewed': return 'text-gray-600';
      default: return 'text-yellow-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={refreshData} />;
  }

  if (!dashboardData) {
    return <ErrorMessage message="No compliance data available" onRetry={refreshData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Monitor regulatory compliance and organizational policies
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
          <button
            onClick={refreshComplianceEngine}
            disabled={refreshing}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Refresh Engine
          </button>
        </div>
      </div>

      {/* Compliance Score Card */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Overall Compliance Score</h2>
            <div className="flex items-center space-x-4">
              <span className="text-4xl font-bold">{dashboardData.complianceScore.overall}%</span>
              <div className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-1" />
                <span className="text-sm">{dashboardData.complianceScore.trend}</span>
              </div>
            </div>
          </div>
          <Shield className="w-16 h-16 opacity-20" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Active Regulations"
          value={`${dashboardData.regulations.active}/${dashboardData.regulations.total}`}
          icon={BookOpen}
          color="text-blue-600"
        />
        <MetricsCard
          title="Active Policies"
          value={`${dashboardData.policies.active}/${dashboardData.policies.total}`}
          icon={FileText}
          color="text-green-600"
        />
        <MetricsCard
          title="Employees with Profiles"
          value={`${dashboardData.employees.assignedProfile}/${dashboardData.employees.total}`}
          icon={Users}
          color="text-purple-600"
        />
        <MetricsCard
          title="Open Incidents"
          value={dashboardData.incidents.open}
          icon={AlertTriangle}
          color="text-red-600"
        />
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Compliance Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Employee Compliance Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Never Reviewed</span>
              <span className="font-medium text-red-600">{dashboardData.employees.neverReviewed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Retention Overdue</span>
              <span className="font-medium text-orange-600">{dashboardData.employees.retentionOverdue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Compliant</span>
              <span className="font-medium text-green-600">
                {dashboardData.employees.total - dashboardData.employees.neverReviewed - dashboardData.employees.retentionOverdue}
              </span>
            </div>
          </div>
        </div>

        {/* Incident Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Incident Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Critical Incidents</span>
              <span className="font-medium text-red-600">{dashboardData.incidents.critical}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Open Incidents</span>
              <span className="font-medium text-orange-600">{dashboardData.incidents.open}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">Notification Overdue</span>
              <span className="font-medium text-red-600">{dashboardData.incidents.notificationOverdue}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity and Attention Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Incidents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-blue-600" />
            Recent Incidents
          </h3>
          <div className="space-y-3">
            {recentIncidents.length > 0 ? (
              recentIncidents.map((incident) => (
                <div key={incident.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {incident.incident_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                      {incident.title}
                    </p>
                    {incident.employee_name && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Employee: {incident.employee_name}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(incident.discovered_at).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                No recent incidents
              </p>
            )}
          </div>
        </div>

        {/* Employees Needing Attention */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            Employees Needing Attention
          </h3>
          <div className="space-y-3">
            {employeesNeedingAttention.length > 0 ? (
              employeesNeedingAttention.slice(0, 5).map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {employee.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {employee.department} • {employee.compliance_profile || 'No profile'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <span className={`text-xs font-medium ${getStatusColor(employee.retention_status)}`}>
                      {employee.retention_status.replace('_', ' ')}
                    </span>
                    <span className={`text-xs font-medium ${getStatusColor(employee.review_status)}`}>
                      {employee.review_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                All employees are compliant
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <Settings className="w-5 h-5 mr-2" />
            Manage Regulations
          </button>
          <button className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <FileText className="w-5 h-5 mr-2" />
            Manage Policies
          </button>
          <button className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <Eye className="w-5 h-5 mr-2" />
            View All Incidents
          </button>
        </div>
      </div>
    </div>
  );
}; 