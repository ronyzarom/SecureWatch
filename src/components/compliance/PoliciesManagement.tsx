import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Users,
  Building,
  AlertCircle,
  Check,
  X,
  Filter,
  Search,
  Save,
  Settings
} from 'lucide-react';
import { complianceAPI } from '../../services/api';
import { CompliancePolicy } from '../../types';
import { LoadingSpinner } from '../LoadingSpinner';
import { ErrorMessage } from '../ErrorMessage';

interface PolicyCardProps {
  policy: CompliancePolicy;
  onEdit: (policy: CompliancePolicy) => void;
  onDelete: (policy: CompliancePolicy) => void;
  onToggleStatus: (policy: CompliancePolicy) => void;
}

const PolicyCard: React.FC<PolicyCardProps> = ({ policy, onEdit, onDelete, onToggleStatus }) => {
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'privacy': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'hr': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'it': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 25) return 'text-red-600';
    if (priority <= 50) return 'text-orange-600';
    if (priority <= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {policy.policy_name}
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(policy.policy_category)}`}>
                {policy.policy_category}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Code: {policy.policy_code}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            {policy.is_active ? (
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
          {policy.description}
        </p>

        {/* Metadata */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4 mr-2" />
            <span>
              Applies to: {
                policy.applies_to_departments.length > 0 
                  ? `${policy.applies_to_departments.length} departments`
                  : 'All departments'
              }
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Building className="w-4 h-4 mr-2" />
            <span>
              Roles: {
                policy.applies_to_roles.length > 0 
                  ? `${policy.applies_to_roles.length} specific roles`
                  : 'All roles'
              }
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-4 h-4 mr-2" />
            <span className={getPriorityColor(policy.priority_order)}>
              Priority: {policy.priority_order}
            </span>
          </div>

          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-2" />
            <span>
              Effective: {new Date(policy.effective_date).toLocaleDateString()}
              {policy.expiry_date && ` - ${new Date(policy.expiry_date).toLocaleDateString()}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(policy)}
              className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            >
              <Edit className="w-4 h-4 mr-1" />
              Edit
            </button>
            <button
              onClick={() => onDelete(policy)}
              className="flex items-center px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
          </div>
          
          <button
            onClick={() => onToggleStatus(policy)}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              policy.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {policy.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface PolicyFormData {
  policy_code: string;
  policy_name: string;
  policy_category: string;
  description: string;
  applies_to_departments: string[];
  applies_to_roles: string[];
  priority_order: number;
  effective_date: string;
  expiry_date?: string;
  configuration: Record<string, any>;
}

const PolicyModal: React.FC<{
  policy: CompliancePolicy | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PolicyFormData) => void;
}> = ({ policy, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<PolicyFormData>({
    policy_code: '',
    policy_name: '',
    policy_category: 'security',
    description: '',
    applies_to_departments: [],
    applies_to_roles: [],
    priority_order: 100,
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    configuration: {}
  });

  const [availableDepartments] = useState(['IT', 'Finance', 'HR', 'Sales', 'Marketing', 'Operations', 'Legal']);
  const [availableRoles] = useState(['Admin', 'Manager', 'Employee', 'Contractor', 'Analyst', 'Executive']);

  useEffect(() => {
    if (policy) {
      setFormData({
        policy_code: policy.policy_code,
        policy_name: policy.policy_name,
        policy_category: policy.policy_category,
        description: policy.description,
        applies_to_departments: policy.applies_to_departments || [],
        applies_to_roles: policy.applies_to_roles || [],
        priority_order: policy.priority_order,
        effective_date: policy.effective_date.split('T')[0],
        expiry_date: policy.expiry_date?.split('T')[0] || '',
        configuration: policy.configuration || {}
      });
    } else {
      setFormData({
        policy_code: '',
        policy_name: '',
        policy_category: 'security',
        description: '',
        applies_to_departments: [],
        applies_to_roles: [],
        priority_order: 100,
        effective_date: new Date().toISOString().split('T')[0],
        expiry_date: '',
        configuration: {}
      });
    }
  }, [policy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const toggleDepartment = (dept: string) => {
    setFormData(prev => ({
      ...prev,
      applies_to_departments: prev.applies_to_departments.includes(dept)
        ? prev.applies_to_departments.filter(d => d !== dept)
        : [...prev.applies_to_departments, dept]
    }));
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      applies_to_roles: prev.applies_to_roles.includes(role)
        ? prev.applies_to_roles.filter(r => r !== role)
        : [...prev.applies_to_roles, role]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {policy ? 'Edit Policy' : 'Create New Policy'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Policy Code
                </label>
                <input
                  type="text"
                  value={formData.policy_code}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                  disabled={!!policy}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.policy_category}
                  onChange={(e) => setFormData(prev => ({ ...prev, policy_category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="privacy">Privacy</option>
                  <option value="security">Security</option>
                  <option value="hr">HR</option>
                  <option value="it">IT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Policy Name
              </label>
              <input
                type="text"
                value={formData.policy_name}
                onChange={(e) => setFormData(prev => ({ ...prev, policy_name: e.target.value }))}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departments (leave empty for all)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                  {availableDepartments.map(dept => (
                    <label key={dept} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.applies_to_departments.includes(dept)}
                        onChange={() => toggleDepartment(dept)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Roles (leave empty for all)
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                  {availableRoles.map(role => (
                    <label key={role} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.applies_to_roles.includes(role)}
                        onChange={() => toggleRole(role)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Priority (lower = higher priority)
                </label>
                <input
                  type="number"
                  value={formData.priority_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority_order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Effective Date
                </label>
                <input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
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
                <Save className="w-4 h-4 mr-2" />
                {policy ? 'Update Policy' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export const PoliciesManagement: React.FC = () => {
  const [policies, setPolicies] = useState<CompliancePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<CompliancePolicy | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchPolicies = async () => {
    try {
      setError(null);
      const response = await complianceAPI.policies.getAll();
      setPolicies(response.policies || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = () => {
    setSelectedPolicy(null);
    setShowModal(true);
  };

  const handleEditPolicy = (policy: CompliancePolicy) => {
    setSelectedPolicy(policy);
    setShowModal(true);
  };

  const handleSavePolicy = async (data: PolicyFormData) => {
    try {
      if (selectedPolicy) {
        await complianceAPI.policies.update(selectedPolicy.id, data);
      } else {
        await complianceAPI.policies.create(data);
      }
      setShowModal(false);
      fetchPolicies();
    } catch (err) {
      console.error('Error saving policy:', err);
      setError('Failed to save policy');
    }
  };

  const handleDeletePolicy = async (policy: CompliancePolicy) => {
    if (confirm(`Are you sure you want to delete "${policy.policy_name}"?`)) {
      try {
        await complianceAPI.policies.delete(policy.id);
        fetchPolicies();
      } catch (err) {
        console.error('Error deleting policy:', err);
        setError('Failed to delete policy');
      }
    }
  };

  const handleToggleStatus = async (policy: CompliancePolicy) => {
    try {
      await complianceAPI.policies.update(policy.id, {
        is_active: !policy.is_active
      });
      fetchPolicies();
    } catch (err) {
      console.error('Error toggling policy status:', err);
      setError('Failed to update policy status');
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.policy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         policy.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || policy.policy_category === categoryFilter;
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && policy.is_active) ||
                         (statusFilter === 'inactive' && !policy.is_active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const activePolicies = policies.filter(p => p.is_active).length;
  const categories = Array.from(new Set(policies.map(p => p.policy_category).filter(Boolean)));

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
            <FileText className="w-6 h-6 mr-3 text-green-600" />
            Internal Policies
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage organizational policies and compliance requirements
          </p>
        </div>
        <button
          onClick={handleCreatePolicy}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Policy
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{policies.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Policies</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activePolicies}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Policies</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Categories</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {policies.filter(p => p.expiry_date && new Date(p.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Expiring Soon</p>
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
                placeholder="Search policies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Error Message */}
      {error && <ErrorMessage message={error} onRetry={fetchPolicies} />}

      {/* Policies Grid */}
      {filteredPolicies.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPolicies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onEdit={handleEditPolicy}
              onDelete={handleDeletePolicy}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm || categoryFilter || statusFilter ? 'No policies match your filters' : 'No policies yet'}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {searchTerm || categoryFilter || statusFilter 
              ? 'Try adjusting your search criteria'
              : 'Create your first internal policy to get started'
            }
          </p>
          {!searchTerm && !categoryFilter && !statusFilter && (
            <button
              onClick={handleCreatePolicy}
              className="flex items-center mx-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Policy
            </button>
          )}
        </div>
      )}

      {/* Policy Modal */}
      <PolicyModal
        policy={selectedPolicy}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSavePolicy}
      />
    </div>
  );
}; 