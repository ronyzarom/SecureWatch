import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Shield, 
  Settings, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle,
  Plus,
  X,
  Search,
  Filter
} from 'lucide-react';

interface ThreatCategory {
  id: number;
  name: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  baseRiskScore: number;
  isActive: boolean;
  categoryType: string;
  industry: string;
  keywords?: Array<{ keyword: string; weight: number }>;
}

interface CategoryRule {
  categoryId: number;
  enabled: boolean;
  customThreshold?: number;
  customRiskScore?: number;
  customKeywords: string[];
  actions: string[];
}

interface CategorySelectorProps {
  selectedCategories: number[];
  categoryRules: CategoryRule[];
  onCategoriesChange: (categories: number[]) => void;
  onRulesChange: (rules: CategoryRule[]) => void;
  disabled?: boolean;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  selectedCategories,
  categoryRules,
  onCategoriesChange,
  onRulesChange,
  disabled = false
}) => {
  const [categories, setCategories] = useState<ThreatCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories?includeKeywords=true', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }

      const data = await response.json();
      setCategories(data.categories.filter((cat: ThreatCategory) => cat.isActive));
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load threat categories');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(cat => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cat.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || cat.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const handleCategoryToggle = (categoryId: number) => {
    if (disabled) return;

    const isCurrentlySelected = selectedCategories.includes(categoryId);
    
    if (isCurrentlySelected) {
      // Remove category
      const newSelected = selectedCategories.filter(id => id !== categoryId);
      const newRules = categoryRules.filter(rule => rule.categoryId !== categoryId);
      onCategoriesChange(newSelected);
      onRulesChange(newRules);
    } else {
      // Add category with default rule
      const category = categories.find(cat => cat.id === categoryId);
      if (category) {
        const newSelected = [...selectedCategories, categoryId];
        const newRule: CategoryRule = {
          categoryId,
          enabled: true,
          customThreshold: category.baseRiskScore,
          customKeywords: [],
          actions: ['email_alert']
        };
        const newRules = [...categoryRules, newRule];
        onCategoriesChange(newSelected);
        onRulesChange(newRules);
      }
    }
  };

  const updateCategoryRule = (categoryId: number, updates: Partial<CategoryRule>) => {
    if (disabled) return;

    const newRules = categoryRules.map(rule =>
      rule.categoryId === categoryId ? { ...rule, ...updates } : rule
    );
    onRulesChange(newRules);
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

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-600 dark:text-red-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Threat Categories
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({selectedCategories.length} selected)
          </span>
        </div>
        
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
        >
          <option value="all">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Categories List */}
      <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        {filteredCategories.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No categories match your search criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredCategories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              const rule = categoryRules.find(r => r.categoryId === category.id);

              return (
                <div key={category.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleCategoryToggle(category.id)}
                      disabled={disabled}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {category.name}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(category.severity)}`}>
                          {getSeverityIcon(category.severity)}
                          <span className="ml-1">{category.severity}</span>
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {category.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Base Risk: {category.baseRiskScore}</span>
                        <span>Keywords: {category.keywords?.length || 0}</span>
                        {category.industry && <span>Industry: {category.industry}</span>}
                      </div>

                      {/* Advanced Configuration */}
                      {isSelected && showAdvanced && rule && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Alert Threshold
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={rule.customThreshold || category.baseRiskScore}
                                onChange={(e) => updateCategoryRule(category.id, {
                                  customThreshold: parseInt(e.target.value) || category.baseRiskScore
                                })}
                                disabled={disabled}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Actions
                              </label>
                              <select
                                multiple
                                value={rule.actions}
                                onChange={(e) => updateCategoryRule(category.id, {
                                  actions: Array.from(e.target.selectedOptions, option => option.value)
                                })}
                                disabled={disabled}
                                className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                size={3}
                              >
                                <option value="email_alert">Email Alert</option>
                                <option value="escalate_incident">Escalate Incident</option>
                                <option value="increase_monitoring">Increase Monitoring</option>
                                <option value="compliance_alert">Compliance Alert</option>
                                <option value="fraud_investigation">Fraud Investigation</option>
                                <option value="immediate_lockdown">Immediate Lockdown</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Additional Keywords (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={rule.customKeywords.join(', ')}
                              onChange={(e) => updateCategoryRule(category.id, {
                                customKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                              })}
                              disabled={disabled}
                              placeholder="custom keyword, another keyword"
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => updateCategoryRule(category.id, {
                                enabled: e.target.checked
                              })}
                              disabled={disabled}
                              className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                              Enable category detection for this policy
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedCategories.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Selected Categories Summary
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map(categoryId => {
              const category = categories.find(cat => cat.id === categoryId);
              const rule = categoryRules.find(r => r.categoryId === categoryId);
              
              if (!category) return null;
              
              return (
                <span
                  key={categoryId}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(category.severity)}`}
                >
                  {category.name}
                  {rule && !rule.enabled && (
                    <span className="ml-1 text-xs opacity-60">(disabled)</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}; 