import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users,
  Tag,
  Check,
  X,
  AlertTriangle,
  Star,
  Settings,
  Eye,
  Copy,
  Search
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { ComplianceProfile, ComplianceRegulation, CompliancePolicy } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface ProfileCardProps {
  profile: ComplianceProfile;
  onEdit: (profile: ComplianceProfile) => void;
  onDelete: (profile: ComplianceProfile) => void;
  onClone: (profile: ComplianceProfile) => void;
  onToggleStatus: (profile: ComplianceProfile) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onEdit, onDelete, onClone, onToggleStatus }) => {
  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getComplianceScore = () => {
    // Mock calculation - in real app this would come from backend
    return Math.floor(Math.random() * 100);
  };

  const score = getComplianceScore();
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {profile.profile_name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(profile.risk_level)}`}>
                {profile.risk_level}
              </span>
              {profile.is_default && (
                <div className="flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Default
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Code: {profile.profile_code}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {profile.is_active ? (
              <div className="flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 rounded-full text-xs">
                <Check className="w-3 h-3 mr-1" />
                Active
              </div>
            ) : (
              <div className="flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-full text-xs">
                <X className="w-3 h-3 mr-1" />
                Inactive
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
          {profile.description}
        </p>

        {/* Compliance Score */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Compliance Score</span>
            <span className={`text-sm font-bold ${scoreColor}`}>{score}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
        </div>

        {/* Requirements Summary */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Regulations:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {profile.required_regulations?.length || 0} required
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Policies:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {profile.required_policies?.length || 0} required
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Assigned Users:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.floor(Math.random() * 50)} employees
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(profile)}
              className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => onClone(profile)}
              className="flex items-center px-3 py-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
            >
              <Copy className="w-4 h-4 mr-1" />
              Clone
            </button>
            <button
              onClick={() => onDelete(profile)}
              className="flex items-center px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
          </div>
          
          <button
            onClick={() => onToggleStatus(profile)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              profile.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {profile.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProfileFormData {
  profile_code: string;
  profile_name: string;
  description: string;
  risk_level: string;
  required_regulations: string[];
  required_policies: string[];
  data_retention_days: number;
  monitoring_frequency: string;
  escalation_threshold: number;
  is_default: boolean;
  configuration: Record<string, any>;
}

const ProfileModal: React.FC<{
  profile: ComplianceProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ProfileFormData) => void;
  availableRegulations: ComplianceRegulation[];
  availablePolicies: CompliancePolicy[];
}> = ({ profile, isOpen, onClose, onSave, availableRegulations, availablePolicies }) => {
  const [formData, setFormData] = useState<ProfileFormData>({
    profile_code: '',
    profile_name: '',
    description: '',
    risk_level: 'medium',
    required_regulations: [],
    required_policies: [],
    data_retention_days: 2555, // 7 years default
    monitoring_frequency: 'daily',
    escalation_threshold: 75,
    is_default: false,
    configuration: {}
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        profile_code: profile.profile_code,
        profile_name: profile.profile_name,
        description: profile.description,
        risk_level: profile.risk_level,
        required_regulations: profile.required_regulations || [],
        required_policies: profile.required_policies || [],
        data_retention_days: profile.data_retention_days,
        monitoring_frequency: profile.monitoring_frequency,
        escalation_threshold: profile.escalation_threshold,
        is_default: profile.is_default,
        configuration: profile.configuration || {}
      });
    } else {
      setFormData({
        profile_code: '',
        profile_name: '',
        description: '',
        risk_level: 'medium',
        required_regulations: [],
        required_policies: [],
        data_retention_days: 2555,
        monitoring_frequency: 'daily',
        escalation_threshold: 75,
        is_default: false,
        configuration: {}
      });
    }
  }, [profile]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleRegulation = (regId: string) => {
    setFormData(prev => ({
      ...prev,
      required_regulations: prev.required_regulations.includes(regId)
        ? prev.required_regulations.filter(id => id !== regId)
        : [...prev.required_regulations, regId]
    }));
  };

  const togglePolicy = (policyId: string) => {
    setFormData(prev => ({
      ...prev,
      required_policies: prev.required_policies.includes(policyId)
        ? prev.required_policies.filter(id => id !== policyId)
        : [...prev.required_policies, policyId]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {profile ? 'Edit Compliance Profile' : 'Create New Compliance Profile'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Profile Code
                </label>
                <input
                  type="text"
                  value={formData.profile_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, profile_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  disabled={!!profile}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Risk Level
                </label>
                <select
                  value={formData.risk_level}
                  onChange={(e) => setFormData(prev => ({ ...prev, risk_level: e.target.value }))}
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
                Profile Name
              </label>
              <input
                type="text"
                value={formData.profile_name}
                onChange={(e) => setFormData(prev => ({ ...prev, profile_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
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

            {/* Required Regulations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Regulations
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                {availableRegulations.map(regulation => (
                  <label key={regulation.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.required_regulations.includes(regulation.id.toString())}
                      onChange={() => toggleRegulation(regulation.id.toString())}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {regulation.regulation_name}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {regulation.regulation_code.toUpperCase()} • {regulation.region}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Required Policies */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Required Policies
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3">
                {availablePolicies.map(policy => (
                  <label key={policy.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.required_policies.includes(policy.id.toString())}
                      onChange={() => togglePolicy(policy.id.toString())}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {policy.policy_name}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {policy.policy_category}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Configuration Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={formData.data_retention_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, data_retention_days: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Monitoring Frequency
                </label>
                <select
                  value={formData.monitoring_frequency}
                  onChange={(e) => setFormData(prev => ({ ...prev, monitoring_frequency: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="realtime">Real-time</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Escalation Threshold (%)
                </label>
                <input
                  type="number"
                  value={formData.escalation_threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, escalation_threshold: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* Default Profile */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_default" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Set as default profile for new employees
              </label>
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
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Shield className="w-4 h-4 mr-2" />
                {profile ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const ProfilesManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<ComplianceProfile[]>([]);
  const [regulations, setRegulations] = useState<ComplianceRegulation[]>([]);
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskLevelFilter, setRiskLevelFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<ComplianceProfile | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [profilesRes, regulationsRes, policiesRes] = await Promise.all([
        complianceAPI.profiles.getAll(),
        complianceAPI.regulations.getAll(),
        complianceAPI.policies.getAll()
      ]);
      
      setProfiles(profilesRes.profiles || []);
      setRegulations(regulationsRes.regulations || []);
      setPolicies(policiesRes.policies || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProfile = () => {
    setSelectedProfile(null);
    setShowModal(true);
  };

  const handleEditProfile = (profile: ComplianceProfile) => {
    setSelectedProfile(profile);
    setShowModal(true);
  };

  const handleCloneProfile = (profile: ComplianceProfile) => {
    const clonedProfile = {
      ...profile,
      id: 0, // Will be assigned by backend
      profile_code: `${profile.profile_code}_copy`,
      profile_name: `${profile.profile_name} (Copy)`,
      is_default: false
    };
    setSelectedProfile(clonedProfile);
    setShowModal(true);
  };

  const handleSaveProfile = async (data: ProfileFormData) => {
    try {
      if (selectedProfile && selectedProfile.id > 0) {
        await complianceAPI.profiles.update(selectedProfile.id, data);
      } else {
        await complianceAPI.profiles.create(data);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    }
  };

  const handleDeleteProfile = async (profile: ComplianceProfile) => {
    if (confirm(`Are you sure you want to delete "${profile.profile_name}"?`)) {
      try {
        await complianceAPI.profiles.delete(profile.id);
        fetchData();
      } catch (err) {
        console.error('Error deleting profile:', err);
        setError('Failed to delete profile');
      }
    }
  };

  const handleToggleStatus = async (profile: ComplianceProfile) => {
    try {
      await complianceAPI.profiles.update(profile.id, {
        is_active: !profile.is_active
      });
      fetchData();
    } catch (err) {
      console.error('Error toggling profile status:', err);
      setError('Failed to update profile status');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = profile.profile_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRiskLevel = !riskLevelFilter || profile.risk_level === riskLevelFilter;
    
    return matchesSearch && matchesRiskLevel;
  });

  const activeProfiles = profiles.filter(p => p.is_active).length;
  const defaultProfile = profiles.find(p => p.is_default);
  const riskLevels = Array.from(new Set(profiles.map(p => p.risk_level).filter(Boolean)));

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
            <Shield className="w-6 h-6 mr-3 text-purple-600" />
            Compliance Profiles
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage compliance profiles that combine regulations and policies
          </p>
        </div>
        <button
          onClick={handleCreateProfile}
          className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Profile
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{profiles.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Profiles</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeProfiles}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Profiles</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Star className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {defaultProfile?.profile_name || 'None'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Default Profile</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {profiles.filter(p => p.risk_level === 'critical' || p.risk_level === 'high').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">High Risk Profiles</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search profiles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={riskLevelFilter}
            onChange={(e) => setRiskLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Risk Levels</option>
            {riskLevels.map(level => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      {/* Profiles Grid */}
      {filteredProfiles.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onEdit={handleEditProfile}
              onDelete={handleDeleteProfile}
              onClone={handleCloneProfile}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || riskLevelFilter ? 'No profiles match your filters' : 'No compliance profiles yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm || riskLevelFilter
              ? 'Try adjusting your search criteria'
              : 'Create your first compliance profile to get started'
            }
          </p>
          {!searchTerm && !riskLevelFilter && (
            <button
              onClick={handleCreateProfile}
              className="flex items-center mx-auto px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Profile
            </button>
          )}
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveProfile}
        availableRegulations={regulations.filter(r => r.is_active)}
        availablePolicies={policies.filter(p => p.is_active)}
      />
    </div>
  );
}; 