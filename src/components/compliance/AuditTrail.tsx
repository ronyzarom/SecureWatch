import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  User, 
  Shield, 
  FileText, 
  Settings, 
  Eye,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  ChevronRight,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ArrowUpDown
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { ComplianceAuditLog } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface AuditLogEntryProps {
  entry: ComplianceAuditLog;
}

const AuditLogEntry: React.FC<AuditLogEntryProps> = ({ entry }) => {
  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'update':
      case 'updated':
      case 'modified':
        return <Settings className="w-4 h-4 text-blue-600" />;
      case 'delete':
      case 'deleted':
      case 'removed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'view':
      case 'viewed':
      case 'accessed':
        return <Eye className="w-4 h-4 text-gray-600" />;
      case 'assign':
      case 'assigned':
        return <User className="w-4 h-4 text-purple-600" />;
      case 'activate':
      case 'activated':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'deactivate':
      case 'deactivated':
        return <XCircle className="w-4 h-4 text-orange-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType.toLowerCase()) {
      case 'regulation':
      case 'regulations':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'policy':
      case 'policies':
        return <FileText className="w-4 h-4 text-green-600" />;
      case 'profile':
      case 'profiles':
        return <Shield className="w-4 h-4 text-purple-600" />;
      case 'employee':
      case 'employees':
        return <User className="w-4 h-4 text-indigo-600" />;
      case 'incident':
      case 'incidents':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const getActionDescription = (entry: ComplianceAuditLog) => {
    const { action, entity_type, entity_id, metadata } = entry;
    const entityName = metadata?.entity_name || `${entity_type} #${entity_id}`;
    
    switch (action.toLowerCase()) {
      case 'create':
      case 'created':
        return `Created ${entity_type.toLowerCase()} "${entityName}"`;
      case 'update':
      case 'updated':
      case 'modified':
        const changes = metadata?.changes ? Object.keys(metadata.changes).join(', ') : 'unknown fields';
        return `Updated ${entity_type.toLowerCase()} "${entityName}" (${changes})`;
      case 'delete':
      case 'deleted':
      case 'removed':
        return `Deleted ${entity_type.toLowerCase()} "${entityName}"`;
      case 'view':
      case 'viewed':
      case 'accessed':
        return `Viewed ${entity_type.toLowerCase()} "${entityName}"`;
      case 'assign':
      case 'assigned':
        const assignedTo = metadata?.assigned_to || 'user';
        return `Assigned ${entity_type.toLowerCase()} "${entityName}" to ${assignedTo}`;
      case 'activate':
      case 'activated':
        return `Activated ${entity_type.toLowerCase()} "${entityName}"`;
      case 'deactivate':
      case 'deactivated':
        return `Deactivated ${entity_type.toLowerCase()} "${entityName}"`;
      default:
        return `${action} ${entity_type.toLowerCase()} "${entityName}"`;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-3">
        {/* Icons */}
        <div className="flex items-center space-x-1 flex-shrink-0">
          {getEntityIcon(entry.entity_type)}
          <ChevronRight className="w-3 h-3 text-gray-400" />
          {getActionIcon(entry.action)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getActionDescription(entry)}
              </p>
              
              {/* User and timestamp */}
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{entry.performed_by || 'System'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(entry.timestamp)}</span>
                </div>
              </div>
            </div>
            
            {/* Timestamp detail */}
            <div className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </div>
          </div>
          
          {/* Changes detail */}
          {entry.metadata?.changes && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Changes:</div>
              <div className="space-y-1">
                {Object.entries(entry.metadata.changes).map(([field, change]: [string, any]) => (
                  <div key={field} className="flex items-center space-x-2">
                    <span className="font-medium text-gray-600 dark:text-gray-400">{field}:</span>
                    {change.old !== undefined && (
                      <span className="text-red-600 dark:text-red-400 line-through">
                        {String(change.old)}
                      </span>
                    )}
                    <ArrowUpDown className="w-3 h-3 text-gray-400" />
                    <span className="text-green-600 dark:text-green-400">
                      {String(change.new)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Additional metadata */}
          {entry.metadata?.reason && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium">Reason:</span> {entry.metadata.reason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineGroup: React.FC<{
  date: string;
  entries: ComplianceAuditLog[];
}> = ({ date, entries }) => {
  return (
    <div className="space-y-4">
      {/* Date header */}
      <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-2 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          {date}
          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
            ({entries.length} activities)
          </span>
        </h3>
      </div>
      
      {/* Entries */}
      <div className="space-y-3 ml-6">
        {entries.map((entry) => (
          <AuditLogEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
};

export const AuditTrail: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<ComplianceAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateRange, setDateRange] = useState('7'); // Days

  const fetchAuditLogs = async () => {
    try {
      setError(null);
      const response = await complianceAPI.auditLogs.getAll({
        days: parseInt(dateRange),
        action: actionFilter,
        entity_type: entityFilter,
        performed_by: userFilter
      });
      setAuditLogs(response.auditLogs || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Failed to load audit trail');
    } finally {
      setLoading(false);
    }
  };

  const handleExportLogs = () => {
    // TODO: Implement export functionality
    console.log('Export audit logs');
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [dateRange, actionFilter, entityFilter, userFilter]);

  const filteredLogs = auditLogs.filter(log => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
                         log.action.toLowerCase().includes(searchLower) ||
                         log.entity_type.toLowerCase().includes(searchLower) ||
                         (log.performed_by && log.performed_by.toLowerCase().includes(searchLower)) ||
                         (log.metadata?.entity_name && log.metadata.entity_name.toLowerCase().includes(searchLower));
    
    return matchesSearch;
  });

  // Group logs by date
  const groupedLogs = filteredLogs.reduce((groups, log) => {
    const date = new Date(log.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(log);
    return groups;
  }, {} as Record<string, ComplianceAuditLog[]>);

  const sortedDates = Object.keys(groupedLogs).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  const auditStats = {
    total: auditLogs.length,
    today: auditLogs.filter(log => {
      const today = new Date().toDateString();
      return new Date(log.timestamp).toDateString() === today;
    }).length,
    users: new Set(auditLogs.map(log => log.performed_by).filter(Boolean)).size,
    entities: new Set(auditLogs.map(log => log.entity_type)).size
  };

  const actions = Array.from(new Set(auditLogs.map(log => log.action).filter(Boolean)));
  const entityTypes = Array.from(new Set(auditLogs.map(log => log.entity_type).filter(Boolean)));
  const users = Array.from(new Set(auditLogs.map(log => log.performed_by).filter(Boolean)));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <Clock className="w-6 h-6 mr-3 text-indigo-600" />
            Compliance Audit Trail
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track all compliance-related activities and changes
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchAuditLogs}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={handleExportLogs}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
              <Database className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditStats.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Activities</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditStats.today}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Today's Activities</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditStats.users}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Users</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{auditStats.entities}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Entity Types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Actions</option>
            {actions.map(action => (
              <option key={action} value={action}>
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Entities</option>
            {entityTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Users</option>
            {users.map(user => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} onRetry={fetchAuditLogs} />}

      {/* Audit Timeline */}
      {sortedDates.length > 0 ? (
        <div className="space-y-8">
          {sortedDates.map((date) => (
            <TimelineGroup
              key={date}
              date={date}
              entries={groupedLogs[date]}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'No activities match your search' : 'No audit logs found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {searchTerm 
              ? 'Try adjusting your search criteria or date range'
              : 'Compliance activities will appear here once they occur'
            }
          </p>
        </div>
      )}

      {/* Load more */}
      {filteredLogs.length >= 50 && (
        <div className="text-center">
          <button className="px-6 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
}; 