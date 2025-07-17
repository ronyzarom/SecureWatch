import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Globe, 
  Users, 
  User, 
  Toggle, 
  Edit, 
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface Policy {
  id: number;
  name: string;
  description: string;
  policyLevel: 'global' | 'group' | 'user';
  targetId?: number;
  targetType?: string;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  stats: {
    conditions: number;
    actions: number;
    recentExecutions: number;
  };
}

export const PoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    policyLevel: 'global' as 'global' | 'group' | 'user',
    targetId: '',
    targetType: '',
    priority: 50,
    isActive: true
  });

  // Policy conditions and actions
  const [conditions, setConditions] = useState<Array<{
    type: string;
    operator: string;
    value: string;
    logicalOperator?: string;
  }>>([]);

  const [actions, setActions] = useState<Array<{
    type: string;
    config: any;
    order: number;
    delay?: number;
  }>>([]);

  // Edit form states
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    priority: 50,
    isActive: true
  });

  // Edit conditions and actions
  const [editConditions, setEditConditions] = useState<Array<{
    type: string;
    operator: string;
    value: string;
    logicalOperator?: string;
  }>>([]);

  const [editActions, setEditActions] = useState<Array<{
    type: string;
    config: any;
    order: number;
    delay?: number;
  }>>([]);
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<Array<{id: number, name: string}>>([]);
  const [users, setUsers] = useState<Array<{id: number, name: string, email: string}>>([]);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Fetch policies from API
  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/policies', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch policies');
      }
      
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  // Filter policies based on search and filters
  useEffect(() => {
    let filtered = policies;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(policy =>
        policy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(policy => policy.policyLevel === levelFilter);
    }

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(policy => policy.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(policy => !policy.isActive);
    }

    setFilteredPolicies(filtered);
  }, [policies, searchTerm, levelFilter, statusFilter]);

  // Toggle policy status
  const togglePolicyStatus = async (policyId: number) => {
    try {
      const response = await fetch(`/api/policies/${policyId}/toggle`, {
        method: 'PATCH',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to toggle policy status');
      }

      // Refresh policies list
      fetchPolicies();
    } catch (err) {
      console.error('Error toggling policy:', err);
      setError('Failed to update policy status');
    }
  };

  // Fetch departments for targeting
  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/employees', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        // Extract unique departments with their names as both id and name
        // This matches the backend expectation where department name is used as identifier
        const uniqueDepts = [...new Set(data.employees.map((emp: any) => emp.department))]
          .filter(dept => dept)
          .map((dept) => ({ id: dept, name: dept }));
        setDepartments(uniqueDepts);
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  // Fetch users for targeting
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users.map((user: any) => ({
          id: user.email, // Use email as the identifier
          name: user.name,
          email: user.email
        })));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Policy name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Policy description is required';
    }

    if (formData.policyLevel !== 'global') {
      if (!formData.targetType) {
        errors.targetType = 'Target type is required for group and user policies';
      }
      if (!formData.targetId) {
        errors.targetId = 'Target selection is required for group and user policies';
      }
    }

    if (formData.priority < 0 || formData.priority > 100) {
      errors.priority = 'Priority must be between 0 and 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        policyLevel: formData.policyLevel,
        targetId: formData.policyLevel === 'global' ? null : formData.targetId,
        targetType: formData.policyLevel === 'global' ? null : formData.targetType,
        priority: formData.priority,
        isActive: formData.isActive,
        conditions: conditions.map((condition, index) => ({
          type: condition.type,
          operator: condition.operator,
          value: condition.value,
          logicalOperator: condition.logicalOperator || 'AND',
          order: index + 1
        })),
        actions: actions.map((action, index) => ({
          type: action.type,
          config: action.config,
          order: index + 1,
          delay: action.delay || 0
        }))
      };

      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create policy');
      }

      // Success - close modal and refresh list
      setShowCreateModal(false);
      resetForm();
      fetchPolicies();
      
    } catch (err) {
      console.error('Error creating policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      policyLevel: 'global',
      targetId: '',
      targetType: '',
      priority: 50,
      isActive: true
    });
    setConditions([]);
    setActions([]);
    setFormErrors({});
  };

  // Add condition
  const addCondition = () => {
    setConditions([...conditions, {
      type: 'risk_score',
      operator: 'greater_than',
      value: '',
      logicalOperator: 'AND'
    }]);
  };

  // Remove condition
  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  // Update condition
  const updateCondition = (index: number, field: string, value: string) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    setConditions(updated);
  };

  // Add action
  const addAction = () => {
    setActions([...actions, {
      type: 'email_alert',
      config: { recipients: [''], subject: '' },
      order: actions.length + 1,
      delay: 0
    }]);
  };

  // Remove action
  const removeAction = (index: number) => {
    const updated = actions.filter((_, i) => i !== index);
    // Reorder remaining actions
    updated.forEach((action, i) => action.order = i + 1);
    setActions(updated);
  };

  // Update action
  const updateAction = (index: number, field: string, value: any) => {
    const updated = [...actions];
    if (field === 'config') {
      updated[index] = { ...updated[index], config: { ...updated[index].config, ...value } };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setActions(updated);
  };

  // Edit condition functions
  const addEditCondition = () => {
    setEditConditions([...editConditions, {
      type: 'risk_score',
      operator: 'greater_than',
      value: '',
      logicalOperator: 'AND'
    }]);
  };

  const removeEditCondition = (index: number) => {
    setEditConditions(editConditions.filter((_, i) => i !== index));
  };

  const updateEditCondition = (index: number, field: string, value: string) => {
    const updated = [...editConditions];
    updated[index] = { ...updated[index], [field]: value };
    setEditConditions(updated);
  };

  // Edit action functions
  const addEditAction = () => {
    setEditActions([...editActions, {
      type: 'email_alert',
      config: { recipients: [''], subject: '' },
      order: editActions.length + 1,
      delay: 0
    }]);
  };

  const removeEditAction = (index: number) => {
    const updated = editActions.filter((_, i) => i !== index);
    // Reorder remaining actions
    updated.forEach((action, i) => action.order = i + 1);
    setEditActions(updated);
  };

  const updateEditAction = (index: number, field: string, value: any) => {
    const updated = [...editActions];
    if (field === 'config') {
      updated[index] = { ...updated[index], config: { ...updated[index].config, ...value } };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditActions(updated);
  };

  // Handle modal open
  const handleOpenModal = () => {
    setShowCreateModal(true);
    fetchDepartments();
    fetchUsers();
  };

  // Handle edit policy
  const handleEditPolicy = async (policy: Policy) => {
    setEditingPolicy(policy);
    setEditFormData({
      name: policy.name,
      description: policy.description || '',
      priority: policy.priority,
      isActive: policy.isActive
    });

    // Fetch detailed policy info including conditions and actions
    try {
      const response = await fetch(`/api/policies/${policy.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Set conditions
        setEditConditions(data.conditions?.map((condition: any) => ({
          type: condition.type,
          operator: condition.operator,
          value: condition.value,
          logicalOperator: condition.logicalOperator
        })) || []);
        
        // Set actions
        setEditActions(data.actions?.map((action: any) => ({
          type: action.type,
          config: action.config,
          order: action.order,
          delay: action.delay
        })) || []);
      }
    } catch (err) {
      console.error('Error fetching policy details:', err);
      setEditConditions([]);
      setEditActions([]);
    }

    setShowEditModal(true);
  };

  // Handle edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPolicy) return;

    // Basic validation
    if (!editFormData.name.trim()) {
      setError('Policy name is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/policies/${editingPolicy.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editFormData.name.trim(),
          description: editFormData.description.trim(),
          priority: editFormData.priority,
          isActive: editFormData.isActive,
          conditions: editConditions.map((condition, index) => ({
            type: condition.type,
            operator: condition.operator,
            value: condition.value,
            logicalOperator: condition.logicalOperator || 'AND',
            order: index + 1
          })),
          actions: editActions.map((action, index) => ({
            type: action.type,
            config: action.config,
            order: index + 1,
            delay: action.delay || 0
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update policy');
      }

      // Success - close modal and refresh list
      setShowEditModal(false);
      setEditingPolicy(null);
      setEditConditions([]);
      setEditActions([]);
      fetchPolicies();
      
    } catch (err) {
      console.error('Error updating policy:', err);
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete policy
  const handleDeletePolicy = async (policyId: number, policyName: string) => {
    setConfirmModalData({
      title: 'Delete Policy',
      message: `Are you sure you want to delete the policy "${policyName}"?\n\nThis action cannot be undone.`,
      onConfirm: async () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        
        try {
          const response = await fetch(`/api/policies/${policyId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete policy');
          }

          // Success - refresh the policies list
          fetchPolicies();
          
        } catch (err) {
          console.error('Error deleting policy:', err);
          setError(err instanceof Error ? err.message : 'Failed to delete policy');
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Load policies on component mount
  useEffect(() => {
    fetchPolicies();
  }, []);

  // Get icon for policy level
  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'global': return <Globe className="w-4 h-4" />;
      case 'group': return <Users className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  // Get color for policy level
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'global': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400';
      case 'group': return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
      case 'user': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span>Security Policies</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage automated security response policies with hierarchical inheritance
          </p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Policy
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="global">Global</option>
            <option value="group">Group</option>
            <option value="user">User</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Results Count */}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Filter className="w-4 h-4 mr-1" />
            {filteredPolicies.length} of {policies.length} policies
          </div>
        </div>
      </div>

      {/* Policies List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {filteredPolicies.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No policies found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {policies.length === 0 ? 'Get started by creating your first security policy.' : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Policy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {policy.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {policy.description}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Created by {policy.createdBy}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getLevelColor(policy.policyLevel)}`}>
                        {getLevelIcon(policy.policyLevel)}
                        <span className="ml-1">{policy.policyLevel}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {policy.priority}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="flex items-center">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                            {policy.stats.conditions} conditions
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 text-blue-500 mr-1" />
                            {policy.stats.actions} actions
                          </span>
                          <span className="flex items-center">
                            <AlertCircle className="w-3 h-3 text-orange-500 mr-1" />
                            {policy.stats.recentExecutions} executions
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => togglePolicyStatus(policy.id)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          policy.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {policy.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleEditPolicy(policy)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          title="Edit policy"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeletePolicy(policy.id, policy.name)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete policy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Globe className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Global Policies</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {policies.filter(p => p.policyLevel === 'global').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">Group Policies</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {policies.filter(p => p.policyLevel === 'group').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <User className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">User Policies</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {policies.filter(p => p.policyLevel === 'user').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div className="ml-3">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Active Policies</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {policies.filter(p => p.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-blue-600" />
                  Create New Policy
                </h3>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Policy Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter policy name"
                    />
                    {formErrors.name && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="Describe what this policy does"
                    />
                    {formErrors.description && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
                    )}
                  </div>
                </div>

                {/* Policy Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Level *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: 'global', label: 'Global', icon: Globe, desc: 'Applies to all employees' },
                      { value: 'group', label: 'Group', icon: Users, desc: 'Applies to a department' },
                      { value: 'user', label: 'User', icon: User, desc: 'Applies to specific user' }
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <div
                        key={value}
                        onClick={() => setFormData({...formData, policyLevel: value as any, targetId: '', targetType: ''})}
                        className={`cursor-pointer p-3 border rounded-lg ${
                          formData.policyLevel === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-2">
                          <Icon className={`w-6 h-6 ${
                            formData.policyLevel === value ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="text-center">
                          <div className={`font-medium ${
                            formData.policyLevel === value ? 'text-blue-600' : 'text-gray-900 dark:text-white'
                          }`}>
                            {label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {desc}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Target Selection (for Group and User policies) */}
                {formData.policyLevel !== 'global' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Type *
                      </label>
                      <select
                        value={formData.targetType}
                        onChange={(e) => setFormData({...formData, targetType: e.target.value, targetId: ''})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Select target type</option>
                        {formData.policyLevel === 'group' && (
                          <option value="department">Department</option>
                        )}
                        {formData.policyLevel === 'user' && (
                          <option value="user">User</option>
                        )}
                      </select>
                      {formErrors.targetType && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.targetType}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Target Selection *
                      </label>
                      <select
                        value={formData.targetId}
                        onChange={(e) => setFormData({...formData, targetId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        disabled={!formData.targetType}
                      >
                        <option value="">
                          {!formData.targetType ? 'Select target type first' : `Select ${formData.targetType}`}
                        </option>
                        {formData.targetType === 'department' && departments.map(dept => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                        {formData.targetType === 'user' && users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </option>
                        ))}
                      </select>
                      {formErrors.targetId && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.targetId}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Priority and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Higher numbers = higher priority
                    </p>
                    {formErrors.priority && (
                      <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.priority}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="flex items-center space-x-4 pt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={() => setFormData({...formData, isActive: true})}
                          className="mr-2"
                        />
                        <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="isActive"
                          checked={!formData.isActive}
                          onChange={() => setFormData({...formData, isActive: false})}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Conditions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Conditions (When to trigger)
                    </label>
                    <button
                      type="button"
                      onClick={addCondition}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      + Add Condition
                    </button>
                  </div>
                  
                  {conditions.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
                      No conditions added. Policy will need to be triggered manually.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conditions.map((condition, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <select
                                value={condition.type}
                                onChange={(e) => updateCondition(index, 'type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              >
                                <option value="risk_score">Risk Score</option>
                                <option value="violation_severity">Violation Severity</option>
                                <option value="data_access">Data Access</option>
                                <option value="time_based">Time Based</option>
                                <option value="frequency">Frequency</option>
                                <option value="any_violation">Any Violation</option>
                              </select>
                            </div>
                            <div>
                              <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              >
                                <option value="equals">Equals</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="contains">Contains</option>
                                <option value="in">In List</option>
                              </select>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateCondition(index, 'value', e.target.value)}
                                placeholder="Value"
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              {index < conditions.length - 1 && (
                                <select
                                  value={condition.logicalOperator}
                                  onChange={(e) => updateCondition(index, 'logicalOperator', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="AND">AND</option>
                                  <option value="OR">OR</option>
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => removeCondition(index)}
                                className="text-red-600 hover:text-red-800 text-sm ml-2"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions (What to do when triggered)
                    </label>
                    <button
                      type="button"
                      onClick={addAction}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      + Add Action
                    </button>
                  </div>
                  
                  {actions.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
                      No actions added. Policy will only log when triggered.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {actions.map((action, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">#{action.order}</span>
                                <select
                                  value={action.type}
                                  onChange={(e) => updateAction(index, 'type', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="email_alert">Email Alert</option>
                                  <option value="escalate_incident">Escalate Incident</option>
                                  <option value="increase_monitoring">Increase Monitoring</option>
                                  <option value="disable_access">Disable Access</option>
                                  <option value="log_detailed_activity">Log Detailed Activity</option>
                                  <option value="immediate_alert">Immediate Alert</option>
                                </select>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Delay:</span>
                                  <input
                                    type="number"
                                    value={action.delay || 0}
                                    onChange={(e) => updateAction(index, 'delay', parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">min</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAction(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            
                            {/* Action Configuration */}
                            {action.type === 'email_alert' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={action.config.recipients?.join(', ') || ''}
                                  onChange={(e) => updateAction(index, 'config', { 
                                    recipients: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                                  })}
                                  placeholder="Recipients (comma-separated emails)"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={action.config.subject || ''}
                                  onChange={(e) => updateAction(index, 'config', { subject: e.target.value })}
                                  placeholder="Email subject"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                              </div>
                            )}
                            
                            {action.type === 'escalate_incident' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                  value={action.config.escalation_level || 'normal'}
                                  onChange={(e) => updateAction(index, 'config', { escalation_level: e.target.value })}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="immediate">Immediate</option>
                                  <option value="critical">Critical</option>
                                </select>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={action.config.notify_management || false}
                                    onChange={(e) => updateAction(index, 'config', { notify_management: e.target.checked })}
                                    className="mr-2"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify Management</span>
                                </label>
                              </div>
                            )}
                            
                            {action.type === 'increase_monitoring' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  value={action.config.duration_hours || 24}
                                  onChange={(e) => updateAction(index, 'config', { duration_hours: parseInt(e.target.value) || 24 })}
                                  placeholder="Duration (hours)"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                                <select
                                  value={action.config.monitoring_level || 'high'}
                                  onChange={(e) => updateAction(index, 'config', { monitoring_level: e.target.value })}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="maximum">Maximum</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                  <div className="flex">
                    <FileText className="w-5 h-5 text-blue-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                        Complete Policy Configuration
                      </p>
                      <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
                        You can create a basic policy now and add conditions & actions later, or configure everything at once. Conditions define when the policy triggers, and actions define what happens when it does.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      'Create Policy'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showEditModal && editingPolicy && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-6 border max-w-lg shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                  <Edit className="w-6 h-6 mr-2 text-blue-600" />
                  Edit Policy
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingPolicy(null);
                    setEditConditions([]);
                    setEditActions([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleEditSubmit} className="space-y-4">
                {/* Policy Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    {editingPolicy.policyLevel === 'global' && <Globe className="w-4 h-4 text-blue-600" />}
                    {editingPolicy.policyLevel === 'group' && <Users className="w-4 h-4 text-green-600" />}
                    {editingPolicy.policyLevel === 'user' && <User className="w-4 h-4 text-purple-600" />}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {editingPolicy.policyLevel.charAt(0).toUpperCase() + editingPolicy.policyLevel.slice(1)} Policy
                    </span>
                  </div>
                  {editingPolicy.targetId && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Target: {editingPolicy.targetId}
                    </p>
                  )}
                </div>

                {/* Policy Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Policy Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Enter policy name"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="Describe what this policy does"
                  />
                </div>

                {/* Priority and Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editFormData.priority}
                      onChange={(e) => setEditFormData({...editFormData, priority: parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <div className="flex items-center space-x-4 pt-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="editIsActive"
                          checked={editFormData.isActive}
                          onChange={() => setEditFormData({...editFormData, isActive: true})}
                          className="mr-2"
                        />
                        <span className="text-sm text-green-600 dark:text-green-400">Active</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="editIsActive"
                          checked={!editFormData.isActive}
                          onChange={() => setEditFormData({...editFormData, isActive: false})}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Inactive</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Edit Conditions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Conditions (When to trigger)
                    </label>
                    <button
                      type="button"
                      onClick={addEditCondition}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                    >
                      + Add Condition
                    </button>
                  </div>
                  
                  {editConditions.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
                      No conditions added. Policy will need to be triggered manually.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editConditions.map((condition, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <select
                                value={condition.type}
                                onChange={(e) => updateEditCondition(index, 'type', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              >
                                <option value="risk_score">Risk Score</option>
                                <option value="violation_severity">Violation Severity</option>
                                <option value="data_access">Data Access</option>
                                <option value="time_based">Time Based</option>
                                <option value="frequency">Frequency</option>
                                <option value="any_violation">Any Violation</option>
                              </select>
                            </div>
                            <div>
                              <select
                                value={condition.operator}
                                onChange={(e) => updateEditCondition(index, 'operator', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              >
                                <option value="equals">Equals</option>
                                <option value="greater_than">Greater Than</option>
                                <option value="less_than">Less Than</option>
                                <option value="contains">Contains</option>
                                <option value="in">In List</option>
                              </select>
                            </div>
                            <div>
                              <input
                                type="text"
                                value={condition.value}
                                onChange={(e) => updateEditCondition(index, 'value', e.target.value)}
                                placeholder="Value"
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                              />
                            </div>
                            <div className="flex justify-between items-center">
                              {index < editConditions.length - 1 && (
                                <select
                                  value={condition.logicalOperator}
                                  onChange={(e) => updateEditCondition(index, 'logicalOperator', e.target.value)}
                                  className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="AND">AND</option>
                                  <option value="OR">OR</option>
                                </select>
                              )}
                              <button
                                type="button"
                                onClick={() => removeEditCondition(index)}
                                className="text-red-600 hover:text-red-800 text-sm ml-2"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edit Actions Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Actions (What to do when triggered)
                    </label>
                    <button
                      type="button"
                      onClick={addEditAction}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      + Add Action
                    </button>
                  </div>
                  
                  {editActions.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded p-3">
                      No actions added. Policy will only log when triggered.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editActions.map((action, index) => (
                        <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">#{action.order}</span>
                                <select
                                  value={action.type}
                                  onChange={(e) => updateEditAction(index, 'type', e.target.value)}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="email_alert">Email Alert</option>
                                  <option value="escalate_incident">Escalate Incident</option>
                                  <option value="increase_monitoring">Increase Monitoring</option>
                                  <option value="disable_access">Disable Access</option>
                                  <option value="log_detailed_activity">Log Detailed Activity</option>
                                  <option value="immediate_alert">Immediate Alert</option>
                                </select>
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">Delay:</span>
                                  <input
                                    type="number"
                                    value={action.delay || 0}
                                    onChange={(e) => updateEditAction(index, 'delay', parseInt(e.target.value) || 0)}
                                    min="0"
                                    className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">min</span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeEditAction(index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Remove
                              </button>
                            </div>
                            
                            {/* Action Configuration */}
                            {action.type === 'email_alert' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  value={action.config.recipients?.join(', ') || ''}
                                  onChange={(e) => updateEditAction(index, 'config', { 
                                    recipients: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                                  })}
                                  placeholder="Recipients (comma-separated emails)"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                                <input
                                  type="text"
                                  value={action.config.subject || ''}
                                  onChange={(e) => updateEditAction(index, 'config', { subject: e.target.value })}
                                  placeholder="Email subject"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                              </div>
                            )}
                            
                            {action.type === 'escalate_incident' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                  value={action.config.escalation_level || 'normal'}
                                  onChange={(e) => updateEditAction(index, 'config', { escalation_level: e.target.value })}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="immediate">Immediate</option>
                                  <option value="critical">Critical</option>
                                </select>
                                <label className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={action.config.notify_management || false}
                                    onChange={(e) => updateEditAction(index, 'config', { notify_management: e.target.checked })}
                                    className="mr-2"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Notify Management</span>
                                </label>
                              </div>
                            )}
                            
                            {action.type === 'increase_monitoring' && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  value={action.config.duration_hours || 24}
                                  onChange={(e) => updateEditAction(index, 'config', { duration_hours: parseInt(e.target.value) || 24 })}
                                  placeholder="Duration (hours)"
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                />
                                <select
                                  value={action.config.monitoring_level || 'high'}
                                  onChange={(e) => updateEditAction(index, 'config', { monitoring_level: e.target.value })}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="high">High</option>
                                  <option value="maximum">Maximum</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingPolicy(null);
                      setEditConditions([]);
                      setEditActions([]);
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      'Update Policy'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModalData && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmModalData(null);
          }}
          title={confirmModalData.title}
          message={confirmModalData.message}
          confirmText="OK"
          cancelText="Cancel"
          type="danger"
        />
      )}
    </div>
  );
}; 