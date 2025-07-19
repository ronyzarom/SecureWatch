import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Plus, 
  Eye, 
  Edit, 
  Check, 
  X, 
  Clock,
  User,
  Calendar,
  Filter,
  Search,
  Download,
  RefreshCw,
  MessageSquare,
  ExternalLink,
  Flag,
  Shield,
  FileText
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { ComplianceIncident } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface IncidentCardProps {
  incident: ComplianceIncident;
  onViewDetails: (incident: ComplianceIncident) => void;
  onUpdateStatus: (incident: ComplianceIncident, status: string) => void;
  onAssignInvestigator: (incident: ComplianceIncident) => void;
}

const IncidentCard: React.FC<IncidentCardProps> = ({ 
  incident, 
  onViewDetails, 
  onUpdateStatus, 
  onAssignInvestigator 
}) => {
  const getSeverityColor = (severity: string) => {
    if (!severity) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200';
    
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    
    switch (status.toLowerCase()) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'investigating': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getDaysOpen = () => {
    const now = new Date();
    const created = new Date(incident.created_at);
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const daysOpen = getDaysOpen();
  const isOverdue = daysOpen > 30 && incident.status !== 'resolved' && incident.status !== 'closed';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md ${
      isOverdue ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                INC-{incident.id.toString().padStart(4, '0')}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(incident.severity)}`}>
                {incident.severity}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                {incident.status}
              </span>
              {isOverdue && (
                <span className="px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full text-xs font-medium">
                  Overdue
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {incident.incident_type} • {incident.compliance_category}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {incident.description}
        </p>

        {/* Regulatory Information */}
        {incident.regulatory_impact && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Regulatory Impact
              </span>
            </div>
            <div className="space-y-1">
              {incident.regulatory_impact.regulations && (
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Regulations: {incident.regulatory_impact.regulations.join(', ')}
                </p>
              )}
              {incident.regulatory_impact.notification_required && (
                <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Notification required within {incident.notification_timeline_hours}h
                </p>
              )}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Created {daysOpen} days ago</span>
          </div>
          
          {incident.assigned_to && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <User className="w-4 h-4 mr-2" />
              <span>Assigned to {incident.assigned_to}</span>
            </div>
          )}

          {incident.resolved_at && (
            <div className="flex items-center text-sm text-green-600 dark:text-green-400">
              <Check className="w-4 h-4 mr-2" />
              <span>Resolved {Math.floor((Date.now() - new Date(incident.resolved_at).getTime()) / (1000 * 60 * 60 * 24))} days ago</span>
            </div>
          )}
        </div>

        {/* Evidence */}
        {incident.evidence && incident.evidence.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Evidence</h4>
            <div className="flex flex-wrap gap-2">
              {incident.evidence.slice(0, 3).map((evidence, index) => (
                <div key={index} className="flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                  <FileText className="w-3 h-3 mr-1" />
                  {evidence.substring(evidence.lastIndexOf('/') + 1)}
                </div>
              ))}
              {incident.evidence.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{incident.evidence.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onViewDetails(incident)}
              className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              Details
            </button>
            
            <button
              onClick={() => onAssignInvestigator(incident)}
              className="flex items-center px-3 py-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
            >
              <User className="w-4 h-4 mr-1" />
              Assign
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            {incident.status === 'open' && (
              <button
                onClick={() => onUpdateStatus(incident, 'investigating')}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Start Investigation
              </button>
            )}
            {incident.status === 'investigating' && (
              <button
                onClick={() => onUpdateStatus(incident, 'resolved')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
              >
                Mark Resolved
              </button>
            )}
            {incident.status === 'resolved' && (
              <button
                onClick={() => onUpdateStatus(incident, 'closed')}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface IncidentFormData {
  incident_type: string;
  description: string;
  severity: string;
  compliance_category: string;
  employee_id?: number;
  regulatory_impact?: {
    regulations: string[];
    notification_required: boolean;
    potential_fine: number;
  };
  notification_timeline_hours?: number;
  evidence: string[];
}

const CreateIncidentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: IncidentFormData) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<IncidentFormData>({
    incident_type: 'policy_violation',
    description: '',
    severity: 'medium',
    compliance_category: 'general',
    regulatory_impact: {
      regulations: [],
      notification_required: false,
      potential_fine: 0
    },
    notification_timeline_hours: 72,
    evidence: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Create New Incident
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Incident Type
                </label>
                <select
                  value={formData.incident_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, incident_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="policy_violation">Policy Violation</option>
                  <option value="data_breach">Data Breach</option>
                  <option value="unauthorized_access">Unauthorized Access</option>
                  <option value="regulatory_violation">Regulatory Violation</option>
                  <option value="security_incident">Security Incident</option>
                  <option value="compliance_failure">Compliance Failure</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity
                </label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Compliance Category
              </label>
              <select
                value={formData.compliance_category}
                onChange={(e) => setFormData(prev => ({ ...prev, compliance_category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="general">General</option>
                <option value="privacy">Privacy</option>
                <option value="financial">Financial</option>
                <option value="healthcare">Healthcare</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notification Required
                </label>
                <div className="flex items-center space-x-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="notification"
                      checked={!formData.regulatory_impact?.notification_required}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        regulatory_impact: { ...prev.regulatory_impact!, notification_required: false }
                      }))}
                      className="mr-2"
                    />
                    No
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="notification"
                      checked={formData.regulatory_impact?.notification_required}
                      onChange={() => setFormData(prev => ({
                        ...prev,
                        regulatory_impact: { ...prev.regulatory_impact!, notification_required: true }
                      }))}
                      className="mr-2"
                    />
                    Yes
                  </label>
                </div>
              </div>
              
              {formData.regulatory_impact?.notification_required && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Notification Timeline (hours)
                  </label>
                  <input
                    type="number"
                    value={formData.notification_timeline_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, notification_timeline_hours: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="720"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Create Incident
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const IncidentsManagement: React.FC = () => {
  const [incidents, setIncidents] = useState<ComplianceIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchIncidents = async () => {
    try {
      setError(null);
      const response = await complianceAPI.incidents.getAll();
      setIncidents(response.incidents || []);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Failed to load compliance incidents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (data: IncidentFormData) => {
    try {
      await complianceAPI.incidents.create(data);
      setShowCreateModal(false);
      fetchIncidents();
    } catch (err) {
      console.error('Error creating incident:', err);
      setError('Failed to create incident');
    }
  };

  const handleUpdateStatus = async (incident: ComplianceIncident, status: string) => {
    try {
      await complianceAPI.incidents.update(incident.id, { status });
      fetchIncidents();
    } catch (err) {
      console.error('Error updating incident status:', err);
      setError('Failed to update incident status');
    }
  };

  const handleAssignInvestigator = async (incident: ComplianceIncident) => {
    // TODO: Implement investigator assignment modal
    console.log('Assign investigator to:', incident);
  };

  const handleViewDetails = (incident: ComplianceIncident) => {
    // TODO: Implement incident details modal
    console.log('View details for:', incident);
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    console.log('Export incidents report');
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.incident_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = !severityFilter || incident.severity === severityFilter;
    const matchesStatus = !statusFilter || incident.status === statusFilter;
    const matchesType = !typeFilter || incident.incident_type === typeFilter;
    
    return matchesSearch && matchesSeverity && matchesStatus && matchesType;
  });

  const incidentStats = {
    total: incidents.length,
    open: incidents.filter(i => i.status === 'open').length,
    investigating: incidents.filter(i => i.status === 'investigating').length,
    resolved: incidents.filter(i => i.status === 'resolved').length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    overdue: incidents.filter(i => {
      const days = Math.floor((Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24));
      return days > 30 && i.status !== 'resolved' && i.status !== 'closed';
    }).length
  };

  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['open', 'investigating', 'resolved', 'closed'];
  const types = Array.from(new Set(incidents.map(i => i.incident_type).filter(Boolean)));

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
            <AlertTriangle className="w-6 h-6 mr-3 text-red-600" />
            Compliance Incidents
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Track and manage compliance violations and incidents
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportReport}
            className="flex items-center px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Incident
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{incidentStats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{incidentStats.open}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Open</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{incidentStats.investigating}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Investigating</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{incidentStats.resolved}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resolved</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{incidentStats.critical}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">{incidentStats.overdue}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Overdue</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Severities</option>
            {severities.map(severity => (
              <option key={severity} value={severity}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} onRetry={fetchIncidents} />}

      {/* Incidents Grid */}
      {filteredIncidents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              onViewDetails={handleViewDetails}
              onUpdateStatus={handleUpdateStatus}
              onAssignInvestigator={handleAssignInvestigator}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || severityFilter || statusFilter || typeFilter ? 'No incidents match your filters' : 'No incidents reported'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm || severityFilter || statusFilter || typeFilter
              ? 'Try adjusting your search criteria'
              : 'Great! No compliance incidents have been reported yet'
            }
          </p>
          {!searchTerm && !severityFilter && !statusFilter && !typeFilter && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center mx-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Report Incident
            </button>
          )}
        </div>
      )}

      {/* Create Incident Modal */}
      <CreateIncidentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateIncident}
      />
    </div>
  );
}; 