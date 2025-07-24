import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Edit,
  Trash2,
  Shield,
  Eye,
  UserCheck,
  UserX
} from 'lucide-react';
import { SystemUser } from '../types';
import { userAPI } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useNotifications } from '../contexts/NotificationContext';

export const UsersPage: React.FC = () => {
  const { addToast } = useNotifications();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer',
    department: ''
  });

  // Fetch users data on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await userAPI.getAll();
        
        // Transform backend data to match frontend interface
        const transformedUsers: SystemUser[] = (response.users || []).map((user: any) => ({
          id: user.id.toString(),
          name: String(user.name || ''),
          email: String(user.email || ''),
          role: String(user.role || 'viewer'),
          department: String(user.department || ''),
          lastLogin: user.lastLogin,
          status: user.isActive ? 'active' : 'inactive',
          permissions: getRolePermissions(user.role || 'viewer') // Generate permissions based on role
        }));

        setUsers(transformedUsers);
        setError(null);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Generate permissions based on user role
  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['full_access', 'user_management', 'system_config'];
      case 'analyst':
        return ['view_dashboard', 'investigate_threats', 'generate_reports'];
      case 'viewer':
        return ['view_dashboard', 'view_reports'];
      default:
        return ['view_dashboard'];
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle opening add user modal
  const handleAddUser = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'viewer',
      department: ''
    });
    setSelectedUser(null);
    setShowAddUser(true);
  };

  // Handle opening edit user modal
  const handleEditUser = (user: SystemUser) => {
    setFormData({
      name: String(user.name || ''),
      email: String(user.email || ''),
      password: '', // Leave empty for edits - only fill if changing password
      role: String(user.role || 'viewer'),
      department: String(user.department || '')
    });
    setSelectedUser(user);
    setShowAddUser(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (selectedUser) {
        // Update existing user - prepare data for backend
        const updateData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          department: formData.department,
          isActive: selectedUser.status === 'active' // Preserve current status
        };
        
        await userAPI.update(parseInt(selectedUser.id), updateData);
        
        // Handle password update separately if provided
        if (formData.password && formData.password.trim()) {
          await userAPI.resetPassword(parseInt(selectedUser.id), formData.password);
        }
      } else {
        // Create new user
        await userAPI.create(formData);
      }

      // Refresh users list
      const response = await userAPI.getAll();
      const transformedUsers: SystemUser[] = (response.users || []).map((user: any) => ({
        id: user.id.toString(),
        name: String(user.name || ''),
        email: String(user.email || ''),
        role: String(user.role || 'viewer'),
        department: String(user.department || ''),
        lastLogin: user.lastLogin,
        status: user.isActive ? 'active' : 'inactive',
        permissions: getRolePermissions(user.role || 'viewer')
      }));
      setUsers(transformedUsers);

      // Close modal and show success
      setShowAddUser(false);
      setSelectedUser(null);
      setError(null);
      
      addToast({
        type: 'success',
        title: selectedUser ? 'User Updated' : 'User Created',
        message: `${formData.name} has been successfully ${selectedUser ? 'updated' : 'added'}.`
      });
      
    } catch (err: any) {
      console.error('Error saving user:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to save user';
      setError(errorMessage);
      
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowAddUser(false);
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'viewer',
      department: ''
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'analyst':
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case 'viewer':
        return <Eye className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'analyst':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatLastLogin = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      console.log('Attempting to delete user:', userToDelete.id, userToDelete.name);
      const deleteResponse = await userAPI.delete(parseInt(userToDelete.id));
      console.log('Delete response:', deleteResponse);
      
      // Refresh users list from backend
      const response = await userAPI.getAll();
      const transformedUsers: SystemUser[] = (response.users || []).map((user: any) => ({
        id: user.id.toString(),
        name: String(user.name || ''),
        email: String(user.email || ''),
        role: String(user.role || 'viewer'),
        department: String(user.department || ''),
        lastLogin: user.lastLogin,
        status: user.isActive ? 'active' : 'inactive',
        permissions: getRolePermissions(user.role || 'viewer')
      }));

      setUsers(transformedUsers);
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      addToast({
        type: 'success',
        title: 'User Deleted',
        message: `${userToDelete.name} has been successfully removed from the system.`
      });
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete user';
      
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: errorMessage
      });
      
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const cancelDeleteUser = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId 
        ? { ...user, status: user.status === 'active' ? 'inactive' : 'active' }
        : user
    ));
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Users</h1>
            <p className="text-gray-600 dark:text-gray-300">Manage user access and permissions</p>
          </div>
          <button 
                            onClick={handleAddUser}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="flex space-x-4">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="analyst">Analyst</option>
              <option value="viewer">Viewer</option>
            </select>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">Loading users...</p>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-red-600 dark:text-red-400">
                    <p>{error}</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {user.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(user.status)}`}>
                      {user.status === 'active' ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" />
                          Active
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3 mr-1" />
                          Inactive
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatLastLogin(user.lastLogin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1 rounded ${user.status === 'active' ? 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                      >
                        {user.status === 'active' ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Analysts</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {users.filter(u => u.role === 'analyst').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {(showAddUser || selectedUser) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button 
                onClick={handleCloseModal}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password {selectedUser && <span className="text-sm text-gray-500">(leave empty to keep current password)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  required={!selectedUser}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder={selectedUser ? "Enter new password (optional)" : "Enter password for new user"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="analyst">Analyst</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-600 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
              
              <div className="mt-6 flex space-x-3">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (selectedUser ? 'Update User' : 'Add User')}
                </button>
                <button 
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onConfirm={confirmDeleteUser}
        onCancel={cancelDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone and will permanently remove the user from the system.`}
        confirmText="Delete User"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};