import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  Database,
  TrendingUp,
  Users,
  Eye,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Copy,
  Download,
  BarChart3
} from 'lucide-react';
import { ThreatCategory, CategoryFilter, CategoryStats, PREDEFINED_CATEGORY_TEMPLATES } from '../types/categories';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { categoryAPI } from '../services/api';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ThreatCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<ThreatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CategoryStats | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<CategoryFilter>({
    categoryType: 'all',
    industry: 'all',
    severity: 'all',
    isActive: true
  });

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ThreatCategory | null>(null);
  const [viewingCategory, setViewingCategory] = useState<ThreatCategory | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ThreatCategory | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryType: 'custom' as 'predefined' | 'custom' | 'industry_specific',
    industry: '',
    baseRiskScore: 50,
    severity: 'Medium' as 'Critical' | 'High' | 'Medium' | 'Low',
    alertThreshold: 70,
    investigationThreshold: 85,
    criticalThreshold: 95,
    keywords: [] as string[],
    detectionPatterns: {},
    riskMultipliers: {},
    isActive: true
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load categories and stats
  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, []);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [categories, searchTerm, filter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll(true);
      setCategories(data.categories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await categoryAPI.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const applyFilters = () => {
    let filtered = [...categories];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cat.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category type filter
    if (filter.categoryType !== 'all') {
      filtered = filtered.filter(cat => cat.categoryType === filter.categoryType);
    }

    // Industry filter
    if (filter.industry !== 'all') {
      filtered = filtered.filter(cat => cat.industry === filter.industry);
    }

    // Severity filter
    if (filter.severity !== 'all') {
      filtered = filtered.filter(cat => cat.severity === filter.severity);
    }

    // Active filter
    if (filter.isActive !== undefined) {
      filtered = filtered.filter(cat => cat.isActive === filter.isActive);
    }

    setFilteredCategories(filtered);
  };

  const handleCreateCategory = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords.filter(k => k.trim().length > 0)
      };

      await categoryAPI.create(payload);

      setShowCreateModal(false);
      resetForm();
      fetchCategories();
      fetchStats();
    } catch (err) {
      console.error('Error creating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords.filter(k => k.trim().length > 0)
      };

      await categoryAPI.update(editingCategory.id, payload);

      setShowEditModal(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
      fetchStats();
    } catch (err) {
      console.error('Error updating category:', err);
      setError(err instanceof Error ? err.message : 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      await categoryAPI.delete(deletingCategory.id);

      setShowDeleteConfirm(false);
      setDeletingCategory(null);
      fetchCategories();
      fetchStats();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Category name is required';
    }

    if (formData.baseRiskScore < 0 || formData.baseRiskScore > 100) {
      errors.baseRiskScore = 'Risk score must be between 0 and 100';
    }

    if (formData.alertThreshold < 0 || formData.alertThreshold > 100) {
      errors.alertThreshold = 'Alert threshold must be between 0 and 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      categoryType: 'custom',
      industry: '',
      baseRiskScore: 50,
      severity: 'Medium',
      alertThreshold: 70,
      investigationThreshold: 85,
      criticalThreshold: 95,
      keywords: [],
      detectionPatterns: {},
      riskMultipliers: {},
      isActive: true
    });
    setFormErrors({});
  };

  const handleEditCategory = (category: ThreatCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      categoryType: category.categoryType,
      industry: category.industry || '',
      baseRiskScore: category.baseRiskScore,
      severity: category.severity,
      alertThreshold: category.alertThreshold,
      investigationThreshold: category.investigationThreshold,
      criticalThreshold: category.criticalThreshold,
      keywords: category.keywords?.map(k => k.keyword) || [],
      detectionPatterns: category.detectionPatterns,
      riskMultipliers: category.riskMultipliers,
      isActive: category.isActive
    });
    setShowEditModal(true);
  };

  const handleViewCategory = async (category: ThreatCategory) => {
    try {
      const detailedCategory = await categoryAPI.getById(category.id);
      setViewingCategory(detailedCategory);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching category details:', err);
      setError('Failed to load category details');
    }
  };

  const handleCreateFromTemplate = (template: any) => {
    setFormData({
      name: template.name,
      description: template.description,
      categoryType: 'custom',
      industry: template.industry,
      baseRiskScore: template.baseRiskScore,
      severity: template.severity,
      alertThreshold: 70,
      investigationThreshold: 85,
      criticalThreshold: 95,
      keywords: template.keywords || [],
      detectionPatterns: template.detectionPatterns,
      riskMultipliers: template.riskMultipliers,
      isActive: true
    });
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'Critical': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'High': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'Medium': return <Info className="w-4 h-4 text-yellow-500" />;
      case 'Low': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'High': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'predefined': return <Shield className="w-4 h-4" />;
      case 'custom': return <Settings className="w-4 h-4" />;
      case 'industry_specific': return <TrendingUp className="w-4 h-4" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading categories...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
            <Database className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <span>Threat Categories</span>
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage custom threat detection categories and behavioral patterns
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button 
            onClick={() => setShowTemplatesModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Copy className="w-4 h-4 mr-2" />
            Templates
          </button>
          <button 
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Category
          </button>
        </div>
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

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Custom Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.customCategories}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Recent Detections</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentDetections}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <select
              value={filter.categoryType}
              onChange={(e) => setFilter({ ...filter, categoryType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="predefined">Predefined</option>
              <option value="custom">Custom</option>
              <option value="industry_specific">Industry Specific</option>
            </select>
          </div>

          <div>
            <select
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={filter.isActive ? 'active' : 'inactive'}
              onChange={(e) => setFilter({ ...filter, isActive: e.target.value === 'active' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Categories ({filteredCategories.length})
          </h3>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            {categories.length === 0 ? 'No categories found. Create your first category to get started.' : 'No categories match your current filters.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCategories.map((category) => (
              <div key={category.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(category.categoryType)}
                        <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </h4>
                      </div>
                      
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(category.severity)}`}>
                        {getSeverityIcon(category.severity)}
                        <span className="ml-1">{category.severity}</span>
                      </span>

                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        category.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                      }`}>
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>

                      {category.isSystemCategory && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                          System
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {category.description}
                    </p>

                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Risk Score: {category.baseRiskScore}</span>
                      <span>Keywords: {category.keywords?.length || 0}</span>
                      {category.industry && <span>Industry: {category.industry}</span>}
                      <span>Type: {category.categoryType.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewCategory(category)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleEditCategory(category)}
                      disabled={category.isSystemCategory}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Edit Category"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setDeletingCategory(category);
                        setShowDeleteConfirm(true);
                      }}
                      disabled={category.isSystemCategory}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Category Templates</h2>
              <button
                onClick={() => setShowTemplatesModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PREDEFINED_CATEGORY_TEMPLATES.map((template) => (
                  <div
                    key={template.name}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => {
                      setFormData({
                        name: template.name,
                        description: template.description,
                        categoryType: 'custom',
                        industry: template.industry,
                        baseRiskScore: template.baseRiskScore,
                        severity: template.severity,
                        alertThreshold: template.alertThreshold,
                        investigationThreshold: template.investigationThreshold,
                        criticalThreshold: template.criticalThreshold,
                        keywords: template.keywords,
                        detectionPatterns: template.detectionPatterns,
                        riskMultipliers: template.riskMultipliers,
                        isActive: true
                      });
                      setShowTemplatesModal(false);
                      setShowCreateModal(true);
                    }}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`p-2 rounded-lg ${getSeverityColor(template.severity)}`}>
                        {getSeverityIcon(template.severity)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{template.industry}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Risk Score: {template.baseRiskScore}</span>
                      <span>{template.keywords.length} keywords</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Category Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {showEditModal ? 'Edit Category' : 'Create New Category'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingCategory(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (showEditModal) {
                handleUpdateCategory();
              } else {
                handleCreateCategory();
              }
            }} className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Category Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Industry and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry
                  </label>
                  <select
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">All Industries</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail">Retail</option>
                    <option value="Government">Government</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Severity *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Risk Score and Thresholds */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Base Risk Score (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.baseRiskScore}
                    onChange={(e) => setFormData({ ...formData, baseRiskScore: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.alertThreshold}
                    onChange={(e) => setFormData({ ...formData, alertThreshold: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detection Keywords
                </label>
                <div className="space-y-2">
                  {formData.keywords.map((keyword, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={keyword}
                        onChange={(e) => {
                          const newKeywords = [...formData.keywords];
                          newKeywords[index] = e.target.value;
                          setFormData({ ...formData, keywords: newKeywords });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Enter keyword..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newKeywords = formData.keywords.filter((_, i) => i !== index);
                          setFormData({ ...formData, keywords: newKeywords });
                        }}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, keywords: [...formData.keywords, ''] })}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Keyword</span>
                  </button>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                  Category is active
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingCategory(null);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : (showEditModal ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Details Modal */}
      {showDetailsModal && viewingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Category Details</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setViewingCategory(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Category Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Category Information</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{viewingCategory.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity</dt>
                    <dd className="text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(viewingCategory.severity)}`}>
                        {getSeverityIcon(viewingCategory.severity)}
                        <span className="ml-1">{viewingCategory.severity}</span>
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Industry</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{viewingCategory.industry || 'All Industries'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Base Risk Score</dt>
                    <dd className="text-sm text-gray-900 dark:text-white">{viewingCategory.baseRiskScore}</dd>
                  </div>
                </dl>
              </div>

              {/* Description */}
              {viewingCategory.description && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Description</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{viewingCategory.description}</p>
                </div>
              )}

              {/* Keywords */}
              {viewingCategory.keywords && viewingCategory.keywords.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {viewingCategory.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingCategory(null);
        }}
        onConfirm={handleDeleteCategory}
        title="Delete Threat Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone and will remove all associated detection rules.`}
        type="danger"
        confirmText="Delete Category"
        cancelText="Cancel"
      />
    </div>
  );
}; 