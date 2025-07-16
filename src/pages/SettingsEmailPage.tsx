import React, { useState } from 'react';
import { Mail, Server, Shield, CheckCircle, AlertTriangle, Save } from 'lucide-react';
import { EmailServerConfig } from '../types';

export const SettingsEmailPage: React.FC = () => {
  const [config, setConfig] = useState<EmailServerConfig>({
    host: 'mail.company.com',
    port: 993,
    encryption: 'ssl',
    username: 'security@company.com',
    password: '',
    testConnection: false
  });

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof EmailServerConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setConnectionStatus(null);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    
    // Simulate connection test
    setTimeout(() => {
      setConnectionStatus(Math.random() > 0.3 ? 'success' : 'error');
      setIsTestingConnection(false);
    }, 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save operation
    setTimeout(() => {
      setIsSaving(false);
      // Show success message
    }, 1000);
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Email Server Configuration</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-300">Configure email server settings for monitoring and analysis</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="space-y-6">
            {/* Server Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Server className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>Server Settings</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mail Server Host
                  </label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={(e) => handleInputChange('host', e.target.value)}
                    placeholder="mail.company.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Port
                  </label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Encryption
                </label>
                <select
                  value={config.encryption}
                  onChange={(e) => handleInputChange('encryption', e.target.value as 'none' | 'ssl' | 'tls')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="none">None</option>
                  <option value="ssl">SSL</option>
                  <option value="tls">TLS</option>
                </select>
              </div>
            </div>

            {/* Authentication */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span>Authentication</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="security@company.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={config.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Connection Test */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connection Test</h3>
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !config.host || !config.username || !config.password}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Server className="w-4 h-4" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>
              
              {connectionStatus && (
                <div className={`flex items-center space-x-2 p-3 rounded-lg ${
                  connectionStatus === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}>
                  {connectionStatus === 'success' ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Connection successful! Email server is reachable.</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      <span>Connection failed. Please check your settings and try again.</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Configuration Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Configuration Tips</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Use SSL (port 993) or TLS (port 143) for secure connections</li>
                <li>• Ensure the email account has appropriate permissions for monitoring</li>
                <li>• Consider using a dedicated service account for security monitoring</li>
                <li>• Test the connection before saving to ensure proper configuration</li>
              </ul>
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
                    <span>Save Configuration</span>
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