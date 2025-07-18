import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, RefreshCw, Play, Settings, MessageSquare, Users, Shield } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import api from '../services/api';

interface TeamsConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

interface TeamsConfigData {
  isConfigured: boolean;
  isActive: boolean;
  syncEnabled: boolean;
  syncFrequencyHours: number;
  maxMessagesPerChannel: number;
  daysBackToSync: number;
  lastSync?: string;
  lastSyncStatus?: string;
  status: string;
  tenantId?: string;
  clientId?: string;
  hasClientSecret?: boolean;
}

export const TeamsConfig: React.FC<TeamsConfigProps> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<TeamsConfigData>({
    isConfigured: false,
    isActive: false,
    syncEnabled: true,
    syncFrequencyHours: 24,
    maxMessagesPerChannel: 100,
    daysBackToSync: 7,
    status: 'not_configured'
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; teamsFound?: number } | null>(null);
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
      const response = await api.get('/api/integrations/teams/config');
      setConfig(response.data);
    } catch (error: any) {
      console.error('Failed to load Teams config:', error);
      setError('Failed to load Teams configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.put('/api/integrations/teams/config', {
        isActive: config.isActive,
        syncEnabled: config.syncEnabled,
        syncFrequencyHours: config.syncFrequencyHours,
        maxMessagesPerChannel: config.maxMessagesPerChannel,
        daysBackToSync: config.daysBackToSync
      });

      if (onSave) {
        onSave();
      }
      
      // Reload config to get updated status
      await loadConfig();
      
    } catch (error: any) {
      console.error('Failed to save Teams config:', error);
      setError(error.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError(null);
    setTestResult(null);

    try {
      const response = await api.post('/api/integrations/teams/test');
      setTestResult(response.data);
    } catch (error: any) {
      console.error('Teams test failed:', error);
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
      const response = await api.post('/api/integrations/teams/sync', {
        daysBack: config.daysBackToSync,
        maxMessagesPerChannel: config.maxMessagesPerChannel,
        batchSize: 5
      });
      
      setSyncResult({
        success: true,
        message: 'Teams synchronization started successfully',
        syncJobId: response.data.syncJobId
      });

      // Reload config to get updated sync status
      setTimeout(() => {
        loadConfig();
      }, 2000);

    } catch (error: any) {
      console.error('Teams sync failed:', error);
      setSyncResult({
        success: false,
        message: error.response?.data?.error || 'Failed to start synchronization'
      });
    } finally {
      setSyncing(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Microsoft Teams</h2>
                <p className="text-gray-600 dark:text-gray-300">Monitor Teams messages and file sharing activities</p>
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                      {config.lastSync && (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Last sync: {new Date(config.lastSync).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleTest}
                      disabled={testing || !config.isConfigured}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {testing ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-4 h-4" />}
                      <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {!config.isConfigured && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">Office 365 Configuration Required</h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Microsoft Teams integration requires Office 365 to be configured first. Teams uses the same authentication as Office 365.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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
                          {testResult.teamsFound !== undefined && (
                            <p className="text-sm mt-1">Teams found: {testResult.teamsFound}</p>
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
                  <span>Integration Settings</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.isActive}
                          onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                          disabled={!config.isConfigured}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Enable Teams Integration
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        Allow SecureWatch to monitor Teams messages and activities
                      </p>
                    </div>

                    <div>
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={config.syncEnabled}
                          onChange={(e) => setConfig({ ...config, syncEnabled: e.target.checked })}
                          disabled={!config.isActive}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Enable Automatic Sync
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                        Automatically sync Teams messages on schedule
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
                        Max Messages per Channel
                      </label>
                      <select
                        value={config.maxMessagesPerChannel}
                        onChange={(e) => setConfig({ ...config, maxMessagesPerChannel: parseInt(e.target.value) })}
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

              {/* Manual Sync Section */}
              {config.isActive && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <span>Manual Synchronization</span>
                  </h3>

                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Sync Teams Messages</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Manually trigger synchronization of Teams messages for security analysis
                        </p>
                      </div>
                      <button
                        onClick={handleSync}
                        disabled={syncing || !config.isConfigured}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {syncing ? <LoadingSpinner size="sm" /> : <Play className="w-4 h-4" />}
                        <span>{syncing ? 'Syncing...' : 'Start Sync'}</span>
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
              disabled={saving || !config.isConfigured}
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