import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Upload, 
  Save, 
  MapPin, 
  Phone, 
  Globe, 
  Users, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  X,
  Edit3,
  Camera,
  Database,
  Activity
} from 'lucide-react';
import { CompanyInfo } from '../types';

export const SettingsCompanyPage: React.FC = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    domain: '',
    address: '',
    phone: '',
    industry: 'Technology',
    employeeCount: 0,
    logoUrl: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Real data states
  const [systemStats, setSystemStats] = useState({
    totalEmployees: 0,
    activePolicies: 0,
    loading: true
  });

  const industries = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-profit',
    'Consulting',
    'Real Estate',
    'Media & Entertainment',
    'Transportation',
    'Energy',
    'Telecommunications',
    'Other'
  ];

  // Load company information on component mount
  useEffect(() => {
    loadCompanyInfo();
    loadSystemStats();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/settings/company/info', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const info = data.companyInfo;
        
        // Transform backend format to frontend format
        setCompanyInfo({
          name: info.name || '',
          domain: info.domain || '',
          address: info.address || '',
          phone: info.phone || '',
          industry: info.industry || 'Technology',
          employeeCount: info.employee_count || 0,
          logoUrl: info.logo_url || ''
        });
      } else if (response.status === 404) {
        // No company info found, use defaults
        console.log('No company info found, using defaults');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load company information');
      }
    } catch (err) {
      console.error('Error loading company info:', err);
      setError(err instanceof Error ? err.message : 'Failed to load company information');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Load real employee count
      const employeesResponse = await fetch('/api/employees', {
        credentials: 'include'
      });

      // Load real policies count
      const policiesResponse = await fetch('/api/policies', {
        credentials: 'include'
      });

      let totalEmployees = 0;
      let activePolicies = 0;

      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        totalEmployees = employeesData.pagination?.total || 0;
      }

      if (policiesResponse.ok) {
        const policiesData = await policiesResponse.json();
        activePolicies = policiesData.policies?.filter((p: any) => p.isActive).length || 0;
      }

      setSystemStats({
        totalEmployees,
        activePolicies,
        loading: false
      });

    } catch (err) {
      console.error('Error loading system stats:', err);
      setSystemStats(prev => ({ ...prev, loading: false }));
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string | number) => {
    setCompanyInfo(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      setError(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!companyInfo.name.trim()) {
        throw new Error('Company name is required');
      }
      if (!companyInfo.domain.trim()) {
        throw new Error('Company domain is required');
      }

      // Transform frontend format to backend format
      const payload = {
        name: companyInfo.name.trim(),
        domain: companyInfo.domain.trim(),
        address: companyInfo.address.trim(),
        phone: companyInfo.phone.trim(),
        industry: companyInfo.industry,
        employeeCount: companyInfo.employeeCount,
        logoUrl: logoPreview || companyInfo.logoUrl
      };

      const response = await fetch('/api/settings/company/info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save company information');
      }

      const data = await response.json();
      
      // Update state with saved data
      const savedInfo = data.companyInfo;
      setCompanyInfo({
        name: savedInfo.name,
        domain: savedInfo.domain,
        address: savedInfo.address,
        phone: savedInfo.phone,
        industry: savedInfo.industry,
        employeeCount: savedInfo.employee_count,
        logoUrl: savedInfo.logo_url
      });

      setSuccess('Company information saved successfully!');
      setIsEditing(false);
      setLogoFile(null);
      setLogoPreview(null);

    } catch (err) {
      console.error('Error saving company info:', err);
      setError(err instanceof Error ? err.message : 'Failed to save company information');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setLogoFile(null);
    setLogoPreview(null);
    setError(null);
    setSuccess(null);
    loadCompanyInfo(); // Reload original data
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    setCompanyInfo(prev => ({ ...prev, logoUrl: '' }));
  };

  if (loading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <Loader className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600 dark:text-gray-400">Loading company information...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Details</h1>
          </div>
          
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your organization's information and settings
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-800 dark:text-red-200">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-green-800 dark:text-green-200">{success}</span>
          </div>
        </div>
      )}

      <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Company Information */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-6">
              {/* Company Logo */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Logo</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                    {(logoPreview || companyInfo.logoUrl) ? (
                      <>
                        <img 
                          src={logoPreview || companyInfo.logoUrl} 
                          alt="Company Logo" 
                          className="w-full h-full object-contain rounded-lg" 
                        />
                        {isEditing && (
                          <button
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    ) : (
                      <Building className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  
                  {isEditing && (
                    <div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                          <Camera className="w-4 h-4" />
                          <span>Upload Logo</span>
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={companyInfo.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Domain *
                    </label>
                    <div className="flex items-center">
                      <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <input
                        type="text"
                        value={companyInfo.domain}
                        onChange={(e) => handleInputChange('domain', e.target.value)}
                        placeholder="company.com"
                        disabled={!isEditing}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Industry
                    </label>
                    <select
                      value={companyInfo.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                    >
                      {industries.map(industry => (
                        <option key={industry} value={industry}>{industry}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Employee Count
                    </label>
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <input
                        type="number"
                        value={companyInfo.employeeCount}
                        onChange={(e) => handleInputChange('employeeCount', parseInt(e.target.value) || 0)}
                        disabled={!isEditing}
                        min="0"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Address
                    </label>
                    <div className="flex items-start">
                      <MapPin className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2 mt-2" />
                      <textarea
                        value={companyInfo.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={3}
                        disabled={!isEditing}
                        placeholder="Company address..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <div className="flex items-center">
                      <Phone className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                      <input
                        type="tel"
                        value={companyInfo.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        disabled={!isEditing}
                        placeholder="+1 (555) 123-4567"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* System Information Sidebar */}
        <div className="space-y-6">
          {/* System Statistics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Database className="w-5 h-5 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Statistics</h3>
            </div>
            
            {systemStats.loading ? (
              <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading statistics...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Employees</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.totalEmployees.toLocaleString()}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Policies</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {systemStats.activePolicies}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Status</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Connected</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">API Services</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Online</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Monitoring</span>
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Information */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Data Sources</h4>
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <div>• Employee Database</div>
              <div>• Security Policies</div>
              <div>• Email Communications</div>
              <div>• System Settings</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};