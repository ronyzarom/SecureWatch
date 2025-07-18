import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, RefreshCw, Play, Settings, Mail, Shield, Upload, Eye, EyeOff } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import api from '../services/api';

interface GoogleWorkspaceConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface GoogleWorkspaceConfigData {
  isConfigured: boolean;
  isActive: boolean;
  gmailSyncEnabled: boolean;
  driveSyncEnabled: boolean;
  syncFrequencyHours: number;
  maxMessagesPerUser: number;
  daysBackToSync: number;
  lastGmailSync?: string;
  lastDriveSync?: string;
  lastSyncStatus?: string;
  status: string;
  domain: string;
  serviceAccountEmail: string;
  delegatedAdminEmail: string;
  hasServiceAccountKey: boolean;
}

export const GoogleWorkspaceConfig: React.FC<GoogleWorkspaceConfigProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<GoogleWorkspaceConfigData>({
    isConfigured: false,
    isActive: false,
    gmailSyncEnabled: true,
    driveSyncEnabled: false,
    syncFrequencyHours: 24,
    maxMessagesPerUser: 100,
    daysBackToSync: 7,
    status: 'not_configured',
    domain: '',
    serviceAccountEmail: '',
    delegatedAdminEmail: '',
    hasServiceAccountKey: false
  });

  const [serviceAccountKey, setServiceAccountKey] = useState('');
  const [showServiceAccountKey, setShowServiceAccountKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; usersFound?: number; domain?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/integrations/google-workspace/config');
      setConfig(response.data);
    } catch (error: any) {
      console.error('Failed to load Google Workspace config:', error);
      setError('Failed to load Google Workspace configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Validate required fields
      if (!config.domain || !config.serviceAccountEmail || !serviceAccountKey || !config.delegatedAdminEmail) {
        throw new Error('All fields are required: Domain, Service Account Email, Service Account Key, and Delegated Admin Email');
      }

      // Validate service account key JSON
      let parsedKey;
      try {
        parsedKey = JSON.parse(serviceAccountKey);
        if (!parsedKey.client_email || !parsedKey.private_key) {
          throw new Error('Invalid service account key');
        }
      } catch (parseError) {
        throw new Error('Service Account Key must be valid JSON with client_email and private_key fields');
      }

      await api.put('/api/integrations/google-workspace/config', {
        domain: config.domain,
        serviceAccountEmail: config.serviceAccountEmail,
        serviceAccountKey: parsedKey,
        delegatedAdminEmail: config.delegatedAdminEmail,
        isActive: config.isActive,
        gmailSyncEnabled: config.gmailSyncEnabled,
        driveSyncEnabled: config.driveSyncEnabled,
        syncFrequencyHours: config.syncFrequencyHours,
        maxMessagesPerUser: config.maxMessagesPerUser,
        daysBackToSync: config.daysBackToSync
      });

      if (onSave) {
        onSave();
      }
      
      // Reload config to get updated status
      await loadConfig();
      
    } catch (error: any) {
      console.error('Failed to save Google Workspace config:', error);
      setError(error.response?.data?.error || error.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await api.post('/api/integrations/google-workspace/test');
      setTestResult(response.data);
    } catch (error: any) {
      console.error('Google Workspace test failed:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);

    try {
      const response = await api.post('/api/integrations/google-workspace/sync', {
        syncType: 'gmail',
        daysBack: config.daysBackToSync,
        maxMessagesPerUser: config.maxMessagesPerUser,
        batchSize: 3
      });
      
      setSyncResult({
        success: true,
        message: 'Gmail synchronization started successfully',
        syncJobId: response.data.syncJobId
      });

      // Reload config to get updated sync status
      setTimeout(() => {
        loadConfig();
      }, 2000);

    } catch (error: any) {
      console.error('Google Workspace sync failed:', error);
      setSyncResult({
        success: false,
        message: error.response?.data?.error || 'Failed to start synchronization'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          
          if (!parsed.client_email || !parsed.private_key) {
            throw new Error('Invalid service account key file');
          }
          
          setServiceAccountKey(content);
          setConfig(prev => ({
            ...prev,
            serviceAccountEmail: parsed.client_email
          }));
          
        } catch (error) {
          setError('Invalid service account key file. Please upload a valid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100 border-green-200';
      case 'disabled': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'not_configured': return 'text-red-600 bg-red-100 border-red-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected': return 'Connected & Active';
      case 'disabled': return 'Configured but Disabled';
      case 'not_configured': return 'Not Configured';
      default: return 'Unknown';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Google Workspace</h2>
                <p className="text-gray-600 dark:text-gray-300">Monitor Gmail and Google Drive activities for security threats</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Status Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  <span>Connection Status</span>
                </h3>
                
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(config.status)}`}>
                        {getStatusText(config.status)}
                      </div>
                      {config.lastGmailSync && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Last Gmail sync: {new Date(config.lastGmailSync).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleTest}
                      disabled={testing || !config.domain || !serviceAccountKey || !config.delegatedAdminEmail}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                      <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {testResult && (
                    <div className={`mt-4 p-4 rounded-lg border ${
                      testResult.success 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                    }`}>
                      <div className="flex items-start space-x-2">
                        {testResult.success ? (
                          <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium">{testResult.message}</p>
                          {testResult.usersFound !== undefined && (
                            <p className="text-sm mt-1">Users found: {testResult.usersFound}</p>
                          )}
                          {testResult.domain && (
                            <p className="text-sm mt-1">Domain: {testResult.domain}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Configuration Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                  <Settings className="w-5 h-5 text-blue-600" />
                  <span>Google Workspace Configuration</span>
                </h3>

                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Organization Domain *
                      </label>
                      <input
                        type="text"
                        value={config.domain}
                        onChange={(e) => setConfig({ ...config, domain: e.target.value })}
                        placeholder="example.com"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Your Google Workspace domain (e.g., yourcompany.com)
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Delegated Admin Email *
                      </label>
                      <input
                        type="email"
                        value={config.delegatedAdminEmail}
                        onChange={(e) => setConfig({ ...config, delegatedAdminEmail: e.target.value })}
                        placeholder="admin@example.com"
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Admin email for domain-wide delegation
                      </p>
                    </div>
                  </div>

                  {/* Service Account Configuration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Service Account Key * 
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <label className="flex items-center space-x-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4" />
                          <span>Upload JSON Key File</span>
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        {config.hasServiceAccountKey && (
                          <span className="text-sm text-green-600 dark:text-green-400">✓ Key loaded</span>
                        )}
                      </div>
                      
                      <div className="relative">
                        <textarea
                          value={serviceAccountKey}
                          onChange={(e) => setServiceAccountKey(e.target.value)}
                          placeholder="Paste your service account JSON key here or upload a file above"
                          className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          style={{ filter: showServiceAccountKey ? 'none' : 'blur(3px)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowServiceAccountKey(!showServiceAccountKey)}
                          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {showServiceAccountKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Download from Google Cloud Console → IAM & Admin → Service Accounts → Create/Download Key
                      </p>
                    </div>
                  </div>

                  {/* Integration Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={config.isActive}
                            onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Enable Google Workspace Integration
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={config.gmailSyncEnabled}
                            onChange={(e) => setConfig({ ...config, gmailSyncEnabled: e.target.checked })}
                            disabled={!config.isActive}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Enable Gmail Monitoring
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={config.driveSyncEnabled}
                            onChange={(e) => setConfig({ ...config, driveSyncEnabled: e.target.checked })}
                            disabled={!config.isActive}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Enable Drive Monitoring
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                          (Coming soon)
                        </p>
                      </div>
                    </div>

                    {/* Sync Settings */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Sync Frequency (hours)
                        </label>
                        <select
                          value={config.syncFrequencyHours}
                          onChange={(e) => setConfig({ ...config, syncFrequencyHours: parseInt(e.target.value) })}
                          disabled={!config.isActive}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={1}>Every hour</option>
                          <option value={4}>Every 4 hours</option>
                          <option value={12}>Every 12 hours</option>
                          <option value={24}>Daily</option>
                          <option value={168}>Weekly</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Days Back to Sync
                        </label>
                        <select
                          value={config.daysBackToSync}
                          onChange={(e) => setConfig({ ...config, daysBackToSync: parseInt(e.target.value) })}
                          disabled={!config.isActive}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={1}>1 day</option>
                          <option value={3}>3 days</option>
                          <option value={7}>1 week</option>
                          <option value={14}>2 weeks</option>
                          <option value={30}>1 month</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Messages per User
                        </label>
                        <select
                          value={config.maxMessagesPerUser}
                          onChange={(e) => setConfig({ ...config, maxMessagesPerUser: parseInt(e.target.value) })}
                          disabled={!config.isActive}
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value={50}>50 messages</option>
                          <option value={100}>100 messages</option>
                          <option value={200}>200 messages</option>
                          <option value={500}>500 messages</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manual Sync Section */}
              {config.isActive && config.gmailSyncEnabled && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    <span>Manual Synchronization</span>
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Sync Gmail Messages</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Manually trigger synchronization of Gmail messages for security analysis
                        </p>
                      </div>
                      <button
                        onClick={handleSync}
                        disabled={syncing || !config.isConfigured}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {syncing ? <LoadingSpinner size="sm" /> : <Play className="w-4 h-4" />}
                        <span>{syncing ? 'Syncing...' : 'Start Gmail Sync'}</span>
                      </button>
                    </div>

                    {syncResult && (
                      <div className={`p-4 rounded-lg border ${
                        syncResult.success 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                      }`}>
                        <div className="flex items-start space-x-2">
                          {syncResult.success ? (
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{syncResult.message}</p>
                            {syncResult.syncJobId && (
                              <p className="text-sm mt-1">Sync Job ID: {syncResult.syncJobId}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <ErrorMessage
                  message={error}
                  type="error"
                  dismissible
                  onDismiss={() => setError(null)}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !config.domain || !serviceAccountKey || !config.delegatedAdminEmail}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Check className="w-4 h-4" />}
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 