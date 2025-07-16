import React, { useState } from 'react';
import { Building, Upload, Save, MapPin, Phone, Globe, Users } from 'lucide-react';
import { CompanyDetails } from '../types';

export const SettingsCompanyPage: React.FC = () => {
  const [details, setDetails] = useState<CompanyDetails>({
    name: 'SecureWatch Corporation',
    domain: 'company.com',
    address: '123 Business Ave, Suite 100\nNew York, NY 10001',
    phone: '+1 (555) 123-4567',
    industry: 'Technology',
    employeeCount: 1247,
    logo: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof CompanyDetails, value: string | number) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false);
      // Show success message
    }, 1000);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you would upload the file to a server
      const reader = new FileReader();
      reader.onload = (e) => {
        setDetails(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const industries = [
    'Technology',
    'Financial Services',
    'Healthcare',
    'Manufacturing',
    'Retail',
    'Education',
    'Government',
    'Non-profit',
    'Other'
  ];

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Details</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Manage your organization's information and settings</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Company Logo */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Company Logo</h3>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  {details.logo ? (
                    <img src={details.logo} alt="Company Logo" className="w-full h-full object-contain rounded-lg" />
                  ) : (
                    <Building className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>Upload Logo</span>
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={details.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Domain
                  </label>
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
                    <input
                      type="text"
                      value={details.domain}
                      onChange={(e) => handleInputChange('domain', e.target.value)}
                      placeholder="company.com"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Industry
                  </label>
                  <select
                    value={details.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      value={details.employeeCount}
                      onChange={(e) => handleInputChange('employeeCount', parseInt(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      value={details.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                      value={details.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Security Information</h4>
              <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                <div className="flex justify-between">
                  <span>Domain Verification:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">✓ Verified</span>
                </div>
                <div className="flex justify-between">
                  <span>SSL Certificate:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">✓ Valid</span>
                </div>
                <div className="flex justify-between">
                  <span>Email Security:</span>
                  <span className="font-medium text-green-700 dark:text-green-300">✓ Configured</span>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
          </div>
        </div>
      </div>
    </div>
  );
};