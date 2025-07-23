import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Users,
  MessageSquare,
  Shield,
  Clock,
  BarChart3,
  Zap,
  Eye,
  EyeOff,
  Activity,
  Server,
  PieChart,
  TrendingUp,
  Settings,
  Info,
  AlertCircle,
  TestTube,
  Play,
  Hash,
  Bot,
  Lock
} from 'lucide-react';
import api from '../services/api';

interface SlackConfig {
  botToken: string;
  userToken?: string;
  clientId: string;
  clientSecret: string;
  signingSecret?: string;
  appId?: string;
  workspaceId: string;
  isConfigured: boolean;
  isActive?: boolean;
  syncEnabled?: boolean;
  syncFrequencyHours?: number;
  maxMessagesPerChannel?: number;
  daysBackToSync?: number;
  syncPrivateChannels?: boolean;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'error' | 'testing' | 'disabled' | 'not_configured';
  workspaceName?: string;
  workspaceUrl?: string;
  botUserId?: string;
}

interface SyncStatus {
  isRunning: boolean;
  progress?: number;
  status: string;
  lastSync?: string;
  error?: string;
}

interface SlackStats {
  totalChannels: number;
  totalUsers: number;
  messagesProcessed: number;
  violationsDetected: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export const SlackConfig: React.FC<{ 
  onClose: () => void;
  isAuthenticated?: boolean;
}> = ({ onClose, isAuthenticated = true }) => {
  const [config, setConfig] = useState<SlackConfig>({
    botToken: '',
    userToken: '',
    clientId: '',
    clientSecret: '',
    signingSecret: '',
    appId: '',
    workspaceId: '',
    isConfigured: false,
    isActive: true,
    syncEnabled: true,
    syncFrequencyHours: 24,
    maxMessagesPerChannel: 200,
    daysBackToSync: 7,
    syncPrivateChannels: false,
    status: 'not_configured'
  });
  const [showSecrets, setShowSecrets] = useState({
    botToken: false,
    clientSecret: false,
    signingSecret: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isRunning: false, status: 'idle' });
  const [stats, setStats] = useState<SlackStats | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'stats'>('config');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [userSyncResult, setUserSyncResult] = useState<{ success: boolean; message: string; results?: any } | null>(null);

  useEffect(() => {
    setAuthLoading(false);
    
    if (isAuthenticated) {
      console.log('SlackConfig: Authentication confirmed, loading config...');
      setTimeout(() => {
        console.log('SlackConfig: Starting config load with retry...');
        loadConfigWithRetry();
      }, 500);
    } else {
      console.log('SlackConfig: Not authenticated, skipping config load');
    }
  }, [isAuthenticated]);

  const loadConfigWithRetry = async (retryCount = 0) => {
    try {
      await loadConfig();
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount < 3) {
        console.log(`SlackConfig: Auth failed for config load (attempt ${retryCount + 1}/4), retrying in ${(retryCount + 1) * 400}ms...`);
        setTimeout(() => {
          loadConfigWithRetry(retryCount + 1);
        }, (retryCount + 1) * 400);
      } else {
        console.error('SlackConfig: Failed to load config after all retries:', error);
        if (error.response?.status === 401) {
          console.log('SlackConfig: Authentication failed, closing modal');
          onClose();
        }
      }
    }
  };

  const loadConfig = async () => {
    try {
      const configResponse = await api.get('/api/integrations/slack/config');
      const configData = configResponse.data;
      
      setConfig({
        botToken: configData.hasBotToken ? '********' : '',
        userToken: '',
        clientId: configData.clientId || '',
        clientSecret: configData.hasClientSecret ? '********' : '',
        signingSecret: '',
        appId: '',
        workspaceId: configData.workspaceId || '',
        isConfigured: configData.isConfigured || false,
        isActive: configData.isActive !== false,
        syncEnabled: configData.syncEnabled !== false,
        syncFrequencyHours: configData.syncFrequencyHours || 24,
        maxMessagesPerChannel: configData.maxMessagesPerChannel || 200,
        daysBackToSync: configData.daysBackToSync || 7,
        syncPrivateChannels: configData.syncPrivateChannels || false,
        lastSync: configData.lastSync,
        status: configData.status || 'not_configured',
        workspaceName: configData.workspaceName || '',
        workspaceUrl: configData.workspaceUrl || '',
        botUserId: configData.botUserId || ''
      });

      // Only load sync status and stats if Slack is configured AND active
      if (configData.isConfigured && configData.isActive) {
        await loadSyncStatus();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to load Slack detailed config:', error);
      setConfig({
        botToken: '',
        userToken: '',
        clientId: '',
        clientSecret: '',
        signingSecret: '',
        appId: '',
        workspaceId: '',
        isConfigured: false,
        isActive: false,
        syncEnabled: true,
        syncFrequencyHours: 24,
        maxMessagesPerChannel: 200,
        daysBackToSync: 7,
        syncPrivateChannels: false,
        status: 'not_configured'
      });
    }
  };

  const loadSyncStatus = async () => {
    try {
      const response = await api.get('/api/integrations/slack/sync/status');
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Failed to load Slack sync status:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/integrations/slack/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load Slack stats:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!config.botToken || config.botToken === '********') {
      newErrors.botToken = 'Bot Token is required';
    }

    if (!config.clientId) {
      newErrors.clientId = 'Client ID is required';
    }

    if (!config.clientSecret || config.clientSecret === '********') {
      newErrors.clientSecret = 'Client Secret is required';
    }

    if (!config.workspaceId) {
      newErrors.workspaceId = 'Workspace ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        botToken: config.botToken === '********' ? undefined : config.botToken,
        userToken: config.userToken || null,
        clientId: config.clientId,
        clientSecret: config.clientSecret === '********' ? undefined : config.clientSecret,
        signingSecret: config.signingSecret || null,
        appId: config.appId || null,
        workspaceId: config.workspaceId,
        isActive: config.isActive,
        syncEnabled: config.syncEnabled,
        syncFrequencyHours: config.syncFrequencyHours,
        maxMessagesPerChannel: config.maxMessagesPerChannel,
        daysBackToSync: config.daysBackToSync,
        syncPrivateChannels: config.syncPrivateChannels
      };

      await api.put('/api/integrations/slack/config', payload);
      
      // Reload configuration
      await loadConfig();
      
      setErrors({});
    } catch (error: any) {
      console.error('Save Slack config error:', error);
      setErrors({
        submit: error.response?.data?.error || 'Failed to save configuration'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await api.post('/api/integrations/slack/test');
      setTestResult(response.data);
      
      // If test successful, reload config to get updated workspace info
      if (response.data.success) {
        await loadConfig();
      }
    } catch (error: any) {
      console.error('Test Slack connection error:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'Connection test failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    try {
      await api.post('/api/integrations/slack/sync', {
        daysBack: config.daysBackToSync || 7,
        maxMessagesPerChannel: config.maxMessagesPerChannel || 200
      });
      
      // Start polling for status updates
      setTimeout(loadSyncStatus, 1000);
    } catch (error: any) {
      console.error('Start Slack sync error:', error);
    }
  };

  const handleSyncUsers = async () => {
    setIsSyncingUsers(true);
    setUserSyncResult(null);
    
    try {
      const response = await api.post('/api/integrations/slack/sync/users');
      setUserSyncResult({
        success: true,
        message: response.data.message,
        results: response.data
      });
      
      // Reload stats after user sync
      setTimeout(loadStats, 2000);
    } catch (error: any) {
      console.error('Slack user sync error:', error);
      setUserSyncResult({
        success: false,
        message: error.response?.data?.error || 'User sync failed'
      });
    } finally {
      setIsSyncingUsers(false);
    }
  };

  const handleToggleActive = async () => {
    setIsLoading(true);
    try {
      const newActiveState = !config.isActive;
      await api.put('/api/integrations/slack/config', {
        ...config,
        isActive: newActiveState
      });
      
      setConfig(prev => ({ ...prev, isActive: newActiveState }));
      await loadConfig();
    } catch (error: any) {
      console.error('Toggle Slack status error:', error);
      setErrors({
        submit: error.response?.data?.error || 'Failed to toggle integration status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />
            <span>Loading Slack configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (config.status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'disabled':
        return <Shield className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'testing':
        return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (config.status) {
      case 'connected':
        return 'Connected';
      case 'disabled':
        return 'Disabled';
      case 'error':
        return 'Error';
      case 'testing':
        return 'Testing...';
      case 'not_configured':
        return 'Not Configured';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-purple-500" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Slack Integration</h2>
              <div className="flex items-center space-x-2 mt-1">
                {getStatusIcon()}
                <span className="text-sm font-medium text-gray-600">{getStatusText()}</span>
                {config.workspaceName && (
                  <span className="text-sm text-gray-500">• {config.workspaceName}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'config', label: 'Configuration', icon: Settings },
              { id: 'status', label: 'Sync Status', icon: Activity },
              { id: 'stats', label: 'Statistics', icon: BarChart3 }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Authentication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Bot className="h-4 w-4 inline mr-1" />
                      Bot Token *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.botToken ? 'text' : 'password'}
                        value={config.botToken}
                        onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                          errors.botToken ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="xoxb-your-bot-token"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('botToken')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets.botToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.botToken && <p className="mt-1 text-sm text-red-600">{errors.botToken}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client ID *
                    </label>
                    <input
                      type="text"
                      value={config.clientId}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        errors.clientId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1234567890.1234567890"
                    />
                    {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock className="h-4 w-4 inline mr-1" />
                      Client Secret *
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.clientSecret ? 'text' : 'password'}
                        value={config.clientSecret}
                        onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                          errors.clientSecret ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="your-client-secret"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('clientSecret')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.clientSecret && <p className="mt-1 text-sm text-red-600">{errors.clientSecret}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Workspace ID *
                    </label>
                    <input
                      type="text"
                      value={config.workspaceId}
                      onChange={(e) => setConfig(prev => ({ ...prev, workspaceId: e.target.value }))}
                      className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        errors.workspaceId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="T1234567890"
                    />
                    {errors.workspaceId && <p className="mt-1 text-sm text-red-600">{errors.workspaceId}</p>}
                  </div>
                </div>
              </div>

              {/* Optional Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Optional Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User Token (Optional)
                    </label>
                    <input
                      type="password"
                      value={config.userToken || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, userToken: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="xoxp-user-token (for private channels)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Signing Secret (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type={showSecrets.signingSecret ? 'text' : 'password'}
                        value={config.signingSecret || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, signingSecret: e.target.value }))}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        placeholder="signing-secret"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility('signingSecret')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showSecrets.signingSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      App ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={config.appId || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, appId: e.target.value }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="A1234567890"
                    />
                  </div>
                </div>
              </div>

              {/* Sync Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Synchronization Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Messages per Channel
                    </label>
                    <input
                      type="number"
                      value={config.maxMessagesPerChannel}
                      onChange={(e) => setConfig(prev => ({ ...prev, maxMessagesPerChannel: parseInt(e.target.value) || 200 }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      min="10"
                      max="1000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days Back to Sync
                    </label>
                    <input
                      type="number"
                      value={config.daysBackToSync}
                      onChange={(e) => setConfig(prev => ({ ...prev, daysBackToSync: parseInt(e.target.value) || 7 }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      min="1"
                      max="30"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sync Frequency (Hours)
                    </label>
                    <input
                      type="number"
                      value={config.syncFrequencyHours}
                      onChange={(e) => setConfig(prev => ({ ...prev, syncFrequencyHours: parseInt(e.target.value) || 24 }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      min="1"
                      max="168"
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.syncEnabled}
                      onChange={(e) => setConfig(prev => ({ ...prev, syncEnabled: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable automatic synchronization</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={config.syncPrivateChannels}
                      onChange={(e) => setConfig(prev => ({ ...prev, syncPrivateChannels: e.target.checked }))}
                      className="rounded border-gray-300 text-purple-600 shadow-sm focus:border-purple-300 focus:ring focus:ring-purple-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Sync private channels (requires user token)</span>
                  </label>
                </div>
              </div>

              {/* Test Connection */}
              {config.botToken && config.clientId && config.clientSecret && config.workspaceId && (
                <div className="border-t pt-4">
                  <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50"
                  >
                    <TestTube className="h-4 w-4" />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>

                  {testResult && (
                    <div className={`mt-3 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      <div className="flex items-center space-x-2">
                        {testResult.success ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <span className="font-medium">{testResult.message}</span>
                      </div>
                      {testResult.details && (
                        <div className="mt-2 text-sm">
                          <p>Team: {testResult.details.team}</p>
                          <p>Bot User: {testResult.details.botUser}</p>
                          <p>Channels Found: {testResult.details.channelsFound}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.submit}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Synchronization Status</h3>
                
                {config.isConfigured && config.isActive ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">Last Sync</h4>
                          <p className="text-sm text-gray-600">
                            {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Never'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          {syncStatus.isRunning ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                          <span className="text-sm font-medium">
                            {syncStatus.isRunning ? 'Running' : 'Idle'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        onClick={handleSync}
                        disabled={syncStatus.isRunning}
                        className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                      >
                        <MessageSquare className="h-4 w-4" />
                        <span>Sync Messages</span>
                      </button>

                      <button
                        onClick={handleSyncUsers}
                        disabled={isSyncingUsers}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Users className="h-4 w-4" />
                        <span>{isSyncingUsers ? 'Syncing...' : 'Sync Users'}</span>
                      </button>
                    </div>

                    {userSyncResult && (
                      <div className={`p-3 rounded-md ${userSyncResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        <p className="font-medium">{userSyncResult.message}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Configure and activate Slack integration to see sync status</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Integration Statistics</h3>
                
                {stats && config.isConfigured && config.isActive ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Hash className="h-8 w-8 text-blue-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-blue-600">Channels</p>
                          <p className="text-2xl font-semibold text-blue-900">{stats.totalChannels}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <Users className="h-8 w-8 text-green-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-green-600">Users</p>
                          <p className="text-2xl font-semibold text-green-900">{stats.totalUsers}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <MessageSquare className="h-8 w-8 text-purple-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-purple-600">Messages</p>
                          <p className="text-2xl font-semibold text-purple-900">{stats.messagesProcessed}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 rounded-lg p-4">
                      <div className="flex items-center">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-red-600">Violations</p>
                          <p className="text-2xl font-semibold text-red-900">{stats.violationsDetected}</p>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-2 lg:col-span-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Risk Distribution</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-red-600">{stats.riskDistribution.high}</p>
                          <p className="text-sm text-gray-600">High Risk</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-yellow-600">{stats.riskDistribution.medium}</p>
                          <p className="text-sm text-gray-600">Medium Risk</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-semibold text-green-600">{stats.riskDistribution.low}</p>
                          <p className="text-sm text-gray-600">Low Risk</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No statistics available yet</p>
                    <p className="text-sm text-gray-400">Configure and run a sync to see statistics</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {config.isConfigured && (
              <button
                onClick={handleToggleActive}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium ${
                  config.isActive
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                } disabled:opacity-50`}
              >
                {config.isActive ? <Shield className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                <span>{config.isActive ? 'Disable' : 'Enable'}</span>
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            {activeTab === 'config' && (
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {isLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
                <span>Save Configuration</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 