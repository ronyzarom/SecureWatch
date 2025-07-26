import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Search,
  Eye,
  Activity,
  Shield,
  Mail,
  Clock,
  Database,
  Zap
} from 'lucide-react';
import { activityReportsAPI } from '../services/api';

interface ActivityOverview {
  total_employees: number;
  high_risk_employees: number;
  total_violations: number;
  critical_violations: number;
  total_emails: number;
  flagged_emails: number;
  avg_risk_score: number;
  avg_email_volume: number;
  avg_external_contacts: number;
  avg_after_hours_activity: number;
  avg_data_transfer: number;
}

interface Department {
  department: string;
  employee_count: number;
  violation_count: number;
  avg_risk_score: number;
  high_risk_count: number;
}

interface TrendingViolation {
  type: string;
  count: number;
  severity: string;
  avg_hours_ago: number;
}

interface Anomaly {
  id: number;
  name: string;
  department: string;
  anomaly_type: string;
  recent_value?: number;
  avg_value?: number;
  current_emails?: number;
  avg_email_volume?: number;
  current_risk?: number;
  recent_violations?: number;
  z_score?: number;
}

interface ComparisonEmployee {
  id: number;
  name: string;
  department: string;
  risk_score: number;
  risk_level: string;
  violation_count: number;
  email_count: number;
  flagged_email_count: number;
  avg_email_volume: number;
  avg_external_contacts: number;
  avg_after_hours_activity: number;
  avg_data_transfer: number;
}

interface ComparisonDepartment {
  department: string;
  employee_count: number;
  avg_risk_score: number;
  total_violations: number;
  critical_violations: number;
  total_emails: number;
  flagged_emails: number;
  avg_email_volume: number;
  avg_external_contacts: number;
  avg_after_hours_activity: number;
  avg_data_transfer: number;
}

interface ComparisonData {
  type: 'employees' | 'departments';
  comparison: ComparisonEmployee[] | ComparisonDepartment[];
  period: { days: number };
}

interface ViolationTrend {
  period: string;
  violation_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
}

interface EmailTrend {
  period: string;
  email_count: number;
  flagged_count: number;
  avg_risk_score: number;
  external_count: number;
}

interface MetricsTrend {
  period: string;
  avg_email_volume: number;
  avg_external_contacts: number;
  avg_after_hours_activity: number;
  avg_data_transfer: number;
  avg_security_events: number;
  avg_behavior_change: number;
}

interface RiskPattern {
  department: string;
  risk_level: string;
  employee_count: number;
  avg_risk_score: number;
  violation_count: number;
}

interface TrendsData {
  violationTrends: ViolationTrend[];
  emailTrends: EmailTrend[];
  metricsTrends: MetricsTrend[];
  riskPatterns: RiskPattern[];
  period: {
    days: number;
    groupBy: 'day' | 'week' | 'month';
  };
}

export const ActivityReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'anomalies' | 'comparison'>('overview');
  
  // Overview data
  const [overview, setOverview] = useState<ActivityOverview | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [trendingViolations, setTrendingViolations] = useState<TrendingViolation[]>([]);
  
  // Anomalies data
  const [anomalies, setAnomalies] = useState<{
    emailAnomalies: Anomaly[];
    afterHoursAnomalies: Anomaly[];
    riskAnomalies: Anomaly[];
  } | null>(null);

  // Trends data
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  
  // Comparison data
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<Array<{id: number, name: string, department: string}>>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  
  // Comparison filters (only non-time filters)
  const [comparisonFilters, setComparisonFilters] = useState({
    type: 'departments' as 'employees' | 'departments',
    selectedEmployees: [] as number[],
    selectedDepartments: [] as string[]
  });

  // Unified filters for ALL tabs
  const [filters, setFilters] = useState({
    days: 7, // Start with 7 days to match what user expects
    department: '',
    groupBy: 'day' as 'day' | 'week' | 'month'
  });

  useEffect(() => {
    fetchOverviewData();
  }, [filters.days, filters.department]);

  useEffect(() => {
    if (activeTab === 'anomalies') {
      fetchAnomalies();
    }
  }, [activeTab, filters.days]);

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await activityReportsAPI.getOverview({
        days: filters.days,
        department: filters.department || undefined
      });
      
      setOverview(data.overview);
      setDepartments(data.departments);
      setTrendingViolations(data.trendingViolations);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch activity overview');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const data = await activityReportsAPI.getAnomalies({
        days: 7, // Anomalies are typically checked over shorter periods
        threshold: 2.0
      });
      
      setAnomalies(data);
    } catch (err: any) {
      console.error('Failed to fetch anomalies:', err);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      // Fetch employees for comparison selection
      const employeesResponse = await fetch('/api/employees');
      const employeesData = await employeesResponse.json();
      if (employeesData.employees) {
        setAvailableEmployees(employeesData.employees.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          department: emp.department
        })));
        
        // Extract unique departments
        const depts = [...new Set(employeesData.employees.map((emp: any) => emp.department))];
        setAvailableDepartments(depts);
      }
    } catch (err: any) {
      console.error('Failed to fetch available options:', err);
    }
  };

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      
      let queryParams: any = {
        type: comparisonFilters.type,
        days: filters.days // Use the unified filters.days
      };
      
      if (comparisonFilters.type === 'employees' && comparisonFilters.selectedEmployees.length > 0) {
        queryParams.ids = comparisonFilters.selectedEmployees.join(',');
      } else if (comparisonFilters.type === 'departments' && comparisonFilters.selectedDepartments.length > 0) {
        queryParams.departments = comparisonFilters.selectedDepartments.join(',');
      }
      
      const data = await activityReportsAPI.getComparison(queryParams);
      setComparisonData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch comparison data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await activityReportsAPI.getTrends({
        days: filters.days, // Use the unified filters.days
        groupBy: filters.groupBy
      });
      
      setTrendsData(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchAvailableOptions();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'comparison' && 
        ((comparisonFilters.type === 'employees' && comparisonFilters.selectedEmployees.length > 0) ||
         (comparisonFilters.type === 'departments'))) {
      fetchComparisonData();
    }
  }, [activeTab, comparisonFilters, filters.days]); // Added filters.days to dependency array

  useEffect(() => {
    if (activeTab === 'trends') {
      fetchTrendsData();
    }
  }, [activeTab, filters.days, filters.groupBy]); // Added filters.days and filters.groupBy to dependency array

  const exportReport = async () => {
    try {
      // Create comprehensive report data
      const reportData = {
        overview,
        departments,
        trendingViolations,
        anomalies,
        generatedAt: new Date().toISOString(),
        period: `${filters.days} days`,
        department: filters.department || 'All Departments'
      };

      // Convert to CSV format
      const csvHeaders = [
        'Metric Type',
        'Department',
        'Value',
        'Description',
        'Risk Level',
        'Timestamp'
      ];

      const csvRows: string[][] = [];

      // Add overview metrics
      if (overview) {
        csvRows.push(['Overview', 'All', overview.total_employees.toString(), 'Total Employees', 'Info', new Date().toISOString()]);
        csvRows.push(['Overview', 'All', overview.high_risk_employees.toString(), 'High Risk Employees', 'High', new Date().toISOString()]);
        csvRows.push(['Overview', 'All', overview.total_violations.toString(), 'Total Violations', 'Warning', new Date().toISOString()]);
        csvRows.push(['Overview', 'All', overview.critical_violations.toString(), 'Critical Violations', 'Critical', new Date().toISOString()]);
      }

      // Add department data
      departments.forEach(dept => {
        csvRows.push([
          'Department',
          dept.department,
          dept.avg_risk_score.toString(),
          `Average Risk Score (${dept.employee_count} employees)`,
          dept.avg_risk_score > 70 ? 'High' : dept.avg_risk_score > 40 ? 'Medium' : 'Low',
          new Date().toISOString()
        ]);
      });

      // Create CSV content
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `activity-report-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert('✅ Activity report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Failed to export report');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.total_employees)}
                </p>
                <p className="text-sm text-orange-600">
                  {overview.high_risk_employees} high risk
                </p>
              </div>
              <Users className="w-12 h-12 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Violations</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.total_violations)}
                </p>
                <p className="text-sm text-red-600">
                  {overview.critical_violations} critical
                </p>
              </div>
              <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email Activity</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatNumber(overview.total_emails)}
                </p>
                <p className="text-sm text-yellow-600">
                  {overview.flagged_emails} flagged
                </p>
              </div>
              <Mail className="w-12 h-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Risk Score</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {overview.avg_risk_score}
                </p>
                <p className="text-sm text-gray-500">
                  out of 100
                </p>
              </div>
              <Shield className="w-12 h-12 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Department Risk Analysis
          </h3>
          <div className="space-y-4">
            {departments.slice(0, 5).map((dept, index) => (
              <div key={dept.department} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {dept.department}
                    </span>
                    <span className="text-sm text-gray-500">
                      {dept.employee_count} employees
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        dept.avg_risk_score > 70 ? 'bg-red-500' :
                        dept.avg_risk_score > 40 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(dept.avg_risk_score, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      Risk: {dept.avg_risk_score}
                    </span>
                    <span className="text-xs text-red-500">
                      {dept.violation_count} violations
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trending Violations
          </h3>
          <div className="space-y-3">
            {trendingViolations.slice(0, 6).map((violation, index) => (
              <div key={`${violation.type}-${violation.severity}`} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(violation.severity)}`}>
                      {violation.severity}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {violation.type}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {violation.count} occurrences
                    </span>
                    <span className="text-xs text-gray-500">
                      ~{Math.round(violation.avg_hours_ago)}h ago
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity Metrics */}
      {overview && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Average Activity Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg mx-auto mb-2">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(overview.avg_email_volume || 0)}
              </p>
              <p className="text-sm text-gray-500">Emails/day</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg mx-auto mb-2">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(overview.avg_external_contacts || 0)}
              </p>
              <p className="text-sm text-gray-500">External contacts</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg mx-auto mb-2">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(overview.avg_after_hours_activity || 0)}%
              </p>
              <p className="text-sm text-gray-500">After hours</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg mx-auto mb-2">
                <Database className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {(overview.avg_data_transfer || 0).toFixed(1)}
              </p>
              <p className="text-sm text-gray-500">GB transferred</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg mx-auto mb-2">
                <Zap className="w-6 h-6 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.avg_risk_score}
              </p>
              <p className="text-sm text-gray-500">Risk score</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderAnomaliesTab = () => (
    <div className="space-y-6">
      {anomalies && (
        <>
          {/* Email Volume Anomalies */}
          {anomalies.emailAnomalies.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📧 Email Volume Anomalies
              </h3>
              <div className="space-y-3">
                {(anomalies.emailAnomalies || []).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {anomaly.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {anomaly.department} • Z-score: {anomaly.z_score}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-orange-600">
                        {anomaly.current_emails} emails
                      </p>
                      <p className="text-xs text-gray-500">
                        Avg: {anomaly.avg_email_volume}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* After Hours Anomalies */}
          {anomalies.afterHoursAnomalies.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🌙 After Hours Activity Anomalies
              </h3>
              <div className="space-y-3">
                {(anomalies.afterHoursAnomalies || []).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {anomaly.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {anomaly.department} • Z-score: {anomaly.z_score}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-purple-600">
                        {anomaly.recent_value}% activity
                      </p>
                      <p className="text-xs text-gray-500">
                        Avg: {anomaly.avg_value}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk Spikes */}
          {anomalies.riskAnomalies.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                ⚠️ Risk Score Spikes
              </h3>
              <div className="space-y-3">
                {(anomalies.riskAnomalies || []).map((anomaly) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {anomaly.name}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {anomaly.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        Risk: {anomaly.current_risk}
                      </p>
                      <p className="text-xs text-gray-500">
                        {anomaly.recent_violations} recent violations
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Anomalies */}
          {anomalies.emailAnomalies.length === 0 && 
           anomalies.afterHoursAnomalies.length === 0 && 
           anomalies.riskAnomalies.length === 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Anomalies Detected
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All employee activities are within normal patterns for the past 7 days.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Simple chart component for trends visualization
  const SimpleChart = ({ data, dataKey, title, color = '#3B82F6' }: {
    data: any[];
    dataKey: string;
    title: string;
    color?: string;
  }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(item => item[dataKey] || 0));
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">{title}</h4>
        <div className="space-y-2">
          {data.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-20 flex-shrink-0">
                {item.period}
              </span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: color,
                    width: `${maxValue > 0 ? (item[dataKey] / maxValue) * 100 : 0}%`
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-900 dark:text-white w-12 text-right">
                {typeof item[dataKey] === 'number' ? item[dataKey].toFixed(0) : item[dataKey]}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrendsTab = () => {
    return (
      <div className="space-y-6">
        {/* Trends Controls */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Group By
              </label>
              <select
                value={filters.groupBy}
                onChange={(e) => setFilters(prev => ({ ...prev, groupBy: e.target.value as 'day' | 'week' | 'month' }))}
                className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchTrendsData}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">Loading trends data...</p>
          </div>
        )}

        {!loading && trendsData && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-300">
                      Total Violations
                    </p>
                    <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                      {trendsData.violationTrends.reduce((sum, trend) => sum + trend.violation_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Mail className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">
                      Total Emails
                    </p>
                    <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                      {trendsData.emailTrends.reduce((sum, trend) => sum + trend.email_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Flagged Emails
                    </p>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                      {trendsData.emailTrends.reduce((sum, trend) => sum + trend.flagged_count, 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-900 dark:text-green-300">
                      Avg Risk Score
                    </p>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                      {trendsData.emailTrends.length > 0 
                        ? (trendsData.emailTrends.reduce((sum, trend) => sum + trend.avg_risk_score, 0) / trendsData.emailTrends.length).toFixed(1)
                        : '0.0'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SimpleChart
                data={trendsData.violationTrends}
                dataKey="violation_count"
                title="Violation Trends"
                color="#DC2626"
              />
              
              <SimpleChart
                data={trendsData.emailTrends}
                dataKey="email_count"
                title="Email Activity Trends"
                color="#2563EB"
              />
              
              <SimpleChart
                data={trendsData.emailTrends}
                dataKey="flagged_count"
                title="Flagged Email Trends"
                color="#D97706"
              />
              
              <SimpleChart
                data={trendsData.metricsTrends}
                dataKey="avg_after_hours_activity"
                title="After Hours Activity"
                color="#7C2D12"
              />
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Violation Severity Breakdown */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Violation Severity Trends
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Period
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Critical
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          High
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Medium
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Low
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {trendsData.violationTrends.slice(0, 10).map((trend, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {trend.period}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                            {trend.critical_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400">
                            {trend.high_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600 dark:text-yellow-400">
                            {trend.medium_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                            {trend.low_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Risk Patterns by Department */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Risk Patterns by Department
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Risk Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Employees
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Avg Risk
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Violations
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {trendsData.riskPatterns.slice(0, 10).map((pattern, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {pattern.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              pattern.risk_level === 'Critical' ? 'bg-red-100 text-red-800' :
                              pattern.risk_level === 'High' ? 'bg-orange-100 text-orange-800' :
                              pattern.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {pattern.risk_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {pattern.employee_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {pattern.avg_risk_score.toFixed(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {pattern.violation_count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-4">
                Key Insights
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Peak Activity</h4>
                  {(() => {
                    const peakViolations = trendsData.violationTrends.reduce((max, trend) => 
                      trend.violation_count > max.violation_count ? trend : max, trendsData.violationTrends[0]);
                    return (
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        Highest violation activity on {peakViolations?.period} with {peakViolations?.violation_count} violations
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2">Email Security</h4>
                  {(() => {
                    const totalEmails = trendsData.emailTrends.reduce((sum, trend) => sum + trend.email_count, 0);
                    const totalFlagged = trendsData.emailTrends.reduce((sum, trend) => sum + trend.flagged_count, 0);
                    const flaggedPercentage = totalEmails > 0 ? ((totalFlagged / totalEmails) * 100).toFixed(1) : '0';
                    return (
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        {flaggedPercentage}% of emails flagged for security review ({totalFlagged} out of {totalEmails})
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !trendsData && (
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Trends Data Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Select time period and grouping options to view trends analysis.
            </p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading activity reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Reports
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchOverviewData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Employee Activity Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive analysis of employee behavior and security metrics
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchOverviewData}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportReport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={filters.days}
              onChange={(e) => setFilters(prev => ({ ...prev, days: parseInt(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filters.department}
              onChange={(e) => setFilters(prev => ({ ...prev, department: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.department} value={dept.department}>
                  {dept.department}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'trends', name: 'Trends', icon: TrendingUp },
              { id: 'anomalies', name: 'Anomalies', icon: AlertTriangle },
              { id: 'comparison', name: 'Comparison', icon: Users },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'anomalies' && renderAnomaliesTab()}
          {activeTab === 'trends' && renderTrendsTab()}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              {/* Comparison Controls */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Comparison Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Compare Type
                    </label>
                    <select
                      value={comparisonFilters.type}
                      onChange={(e) => setComparisonFilters({
                        ...comparisonFilters,
                        type: e.target.value as 'employees' | 'departments',
                        selectedEmployees: [],
                        selectedDepartments: []
                      })}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="departments">Departments</option>
                      <option value="employees">Employees</option>
                    </select>
                  </div>

                  {/* Employee Selection (if type is employees) */}
                  {comparisonFilters.type === 'employees' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Employees (up to 5)
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableEmployees.slice(0, 20).map(employee => (
                          <label key={employee.id} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={comparisonFilters.selectedEmployees.includes(employee.id)}
                              onChange={(e) => {
                                const selected = comparisonFilters.selectedEmployees;
                                if (e.target.checked && selected.length < 5) {
                                  setComparisonFilters({
                                    ...comparisonFilters,
                                    selectedEmployees: [...selected, employee.id]
                                  });
                                } else if (!e.target.checked) {
                                  setComparisonFilters({
                                    ...comparisonFilters,
                                    selectedEmployees: selected.filter(id => id !== employee.id)
                                  });
                                }
                              }}
                              disabled={!comparisonFilters.selectedEmployees.includes(employee.id) && comparisonFilters.selectedEmployees.length >= 5}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {employee.name} ({employee.department})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Department Selection (if type is departments) */}
                  {comparisonFilters.type === 'departments' && (
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Departments (optional - leave empty for all)
                      </label>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {availableDepartments.map(department => (
                          <label key={department} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={comparisonFilters.selectedDepartments.includes(department)}
                              onChange={(e) => {
                                const selected = comparisonFilters.selectedDepartments;
                                if (e.target.checked) {
                                  setComparisonFilters({
                                    ...comparisonFilters,
                                    selectedDepartments: [...selected, department]
                                  });
                                } else {
                                  setComparisonFilters({
                                    ...comparisonFilters,
                                    selectedDepartments: selected.filter(dept => dept !== department)
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                              {department}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comparison Results */}
              {loading && (
                <div className="text-center py-8">
                  <RefreshCw className="w-8 h-8 text-blue-600 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">Loading comparison data...</p>
                </div>
              )}

              {!loading && comparisonData && comparisonData.comparison.length > 0 && (
                <div className="space-y-6">
                  {/* Comparison Summary */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 dark:text-blue-300 mb-2">
                      Comparison Results
                    </h3>
                    <p className="text-blue-700 dark:text-blue-400">
                      Comparing {comparisonData.comparison.length} {comparisonData.type} over the last {comparisonData.period.days} days
                    </p>
                  </div>

                  {/* Comparison Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            {comparisonData.type === 'employees' ? (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employee</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Risk Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Violations</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Emails</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Flagged</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">After Hours</th>
                              </>
                            ) : (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Employees</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Avg Risk</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Violations</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Critical</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Emails</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Flagged</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {comparisonData.comparison.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              {comparisonData.type === 'employees' ? (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {(item as ComparisonEmployee).name}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      {(item as ComparisonEmployee).risk_level}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonEmployee).department}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      (item as ComparisonEmployee).risk_score >= 70 ? 'bg-red-100 text-red-800' :
                                      (item as ComparisonEmployee).risk_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {(item as ComparisonEmployee).risk_score.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonEmployee).violation_count}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonEmployee).email_count}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonEmployee).flagged_email_count}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonEmployee).avg_after_hours_activity.toFixed(1)}%
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                    {(item as ComparisonDepartment).department}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonDepartment).employee_count}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                      (item as ComparisonDepartment).avg_risk_score >= 70 ? 'bg-red-100 text-red-800' :
                                      (item as ComparisonDepartment).avg_risk_score >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {(item as ComparisonDepartment).avg_risk_score.toFixed(1)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonDepartment).total_violations}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                                    {(item as ComparisonDepartment).critical_violations}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonDepartment).total_emails}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {(item as ComparisonDepartment).flagged_emails}
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Quick Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {comparisonData.type === 'departments' && (
                      <>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">Highest Risk</h4>
                          {(() => {
                            const highest = (comparisonData.comparison as ComparisonDepartment[])
                              .reduce((max, dept) => dept.avg_risk_score > max.avg_risk_score ? dept : max);
                            return (
                              <div>
                                <p className="text-lg font-semibold text-red-800 dark:text-red-300">{highest.department}</p>
                                <p className="text-sm text-red-600 dark:text-red-400">Risk: {highest.avg_risk_score.toFixed(1)}</p>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-300 mb-2">Most Violations</h4>
                          {(() => {
                            const highest = (comparisonData.comparison as ComparisonDepartment[])
                              .reduce((max, dept) => dept.total_violations > max.total_violations ? dept : max);
                            return (
                              <div>
                                <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">{highest.department}</p>
                                <p className="text-sm text-yellow-600 dark:text-yellow-400">{highest.total_violations} violations</p>
                              </div>
                            );
                          })()}
                        </div>
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                          <h4 className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">Lowest Risk</h4>
                          {(() => {
                            const lowest = (comparisonData.comparison as ComparisonDepartment[])
                              .reduce((min, dept) => dept.avg_risk_score < min.avg_risk_score ? dept : min);
                            return (
                              <div>
                                <p className="text-lg font-semibold text-green-800 dark:text-green-300">{lowest.department}</p>
                                <p className="text-sm text-green-600 dark:text-green-400">Risk: {lowest.avg_risk_score.toFixed(1)}</p>
                              </div>
                            );
                          })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {!loading && comparisonData && comparisonData.comparison.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Data Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {comparisonFilters.type === 'employees' 
                      ? 'Please select employees to compare.'
                      : 'No department data available for the selected period.'
                    }
                  </p>
                </div>
              )}

              {!loading && !comparisonData && comparisonFilters.type === 'departments' && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Department Comparison
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ready to compare departments. Data will load automatically.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 