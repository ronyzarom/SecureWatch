import React, { useState, useEffect } from 'react';
import { 
  X, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Users,
  Mail,
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
  Play
} from 'lucide-react';
import api from '../services/api';

interface Office365Config {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  isConfigured: boolean;
  isActive?: boolean;
  lastSync?: string;
  status: 'connected' | 'disconnected' | 'error' | 'testing' | 'disabled';
}

interface SyncStatus {
  isRunning: boolean;
  progress?: number;
  status: string;
  lastSync?: string;
  error?: string;
}

interface Office365Stats {
  totalUsers: number;
  emailsProcessed: number;
  violationsDetected: number;
  lastSyncDuration?: number;
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

export const Office365Config: React.FC<{ 
  onClose: () => void;
  isAuthenticated?: boolean;
}> = ({ onClose, isAuthenticated = true }) => {
  const [config, setConfig] = useState<Office365Config>({
    clientId: '',
    clientSecret: '',
    tenantId: '',
    isConfigured: false,
    isActive: true, // Default to active when creating new config
    status: 'disconnected'
  });
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isRunning: false, status: 'idle' });
  const [stats, setStats] = useState<Office365Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'status' | 'stats'>('config');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [userSyncResult, setUserSyncResult] = useState<{ success: boolean; message: string; results?: any } | null>(null);

  useEffect(() => {
    // Set auth loading to false immediately since parent handles auth
    setAuthLoading(false);
    
    if (isAuthenticated) {
      console.log('Office365Config: Authentication confirmed, loading config...');
      // Increase delay to ensure session is fully established
      setTimeout(() => {
        console.log('Office365Config: Starting config load with retry...');
        loadConfigWithRetry();
      }, 500); // Increased delay to handle session timing
    } else {
      console.log('Office365Config: Not authenticated, skipping config load');
    }
  }, [isAuthenticated]);

  const loadConfigWithRetry = async (retryCount = 0) => {
    try {
      await loadConfig();
    } catch (error: any) {
      if (error.response?.status === 401 && retryCount < 3) {
        console.log(`Office365Config: Auth failed for config load (attempt ${retryCount + 1}/4), retrying in ${(retryCount + 1) * 400}ms...`);
        setTimeout(() => {
          loadConfigWithRetry(retryCount + 1);
        }, (retryCount + 1) * 400);
      } else {
        console.error('Office365Config: Failed to load config after all retries:', error);
        // If still getting 401 after retries, close modal since auth failed
        if (error.response?.status === 401) {
          console.log('Office365Config: Authentication failed, closing modal');
          onClose();
        }
      }
    }
  };

  const loadConfig = async () => {
    try {
      // This function loads detailed configuration data for admin users
      const configResponse = await api.get('/api/integrations/office365/config');
      const configData = configResponse.data;
      
      setConfig({
        clientId: configData.clientId || '',
        clientSecret: configData.hasClientSecret ? '********' : '', // Show masked value if secret is saved
        tenantId: configData.tenantId || '',
        isConfigured: configData.isConfigured || false,
        isActive: configData.isActive !== false, // Default to true if undefined
        lastSync: configData.lastSync,
        status: configData.status || 'disconnected'
      });

      // Only load sync status and stats if Office 365 is configured AND active
      if (configData.isConfigured && configData.isActive) {
        await loadSyncStatus();
        await loadStats();
      }
    } catch (error) {
      console.error('Failed to load Office 365 detailed config:', error);
      // Set safe defaults on error
      setConfig({
        clientId: '',
        clientSecret: '',
        tenantId: '',
        isConfigured: false,
        isActive: false,
        status: 'disconnected'
      });
    }
  };

  // Separate useEffect for managing polling
  useEffect(() => {
    if (config.isConfigured && config.isActive) {
      // Set up polling for sync status only if configured and active
      const interval = setInterval(() => {
        loadSyncStatus();
        loadStats();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [config.isConfigured, config.isActive]);

  const loadSyncStatus = async () => {
    // Only load sync status if Office 365 is configured and active
    if (!config.isConfigured || !config.isActive) {
      setSyncStatus({
        isRunning: false,
        progress: null,
        status: 'idle',
        lastSync: null,
        error: null
      });
      return;
    }

    try {
      const response = await api.get('/api/integrations/office365/sync/status');
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Failed to load sync status:', error);
      setSyncStatus({
        isRunning: false,
        progress: null,
        status: 'error',
        lastSync: null,
        error: 'Failed to load sync status'
      });
    }
  };

  const loadStats = async () => {
    // Only load stats if Office 365 is configured and active
    if (!config.isConfigured || !config.isActive) {
      setStats({
        totalUsers: 0,
        emailsProcessed: 0,
        violationsDetected: 0,
        lastSyncDuration: 0,
        riskDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      });
      return;
    }

    try {
      const response = await api.get('/api/integrations/office365/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({
        totalUsers: 0,
        emailsProcessed: 0,
        violationsDetected: 0,
        lastSyncDuration: 0,
        riskDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      });
    }
  };

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!config.clientId.trim()) {
      newErrors.clientId = 'Client ID is required';
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.clientId)) {
      newErrors.clientId = 'Client ID must be a valid GUID';
    }
    
    // Client secret is required only if not already saved (not showing masked value)
    if (!config.clientSecret.trim() && config.clientSecret !== '********') {
      newErrors.clientSecret = 'Client Secret is required';
    }
    
    if (!config.tenantId.trim()) {
      newErrors.tenantId = 'Tenant ID is required';
    } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(config.tenantId) && 
               !config.tenantId.endsWith('.onmicrosoft.com')) {
      newErrors.tenantId = 'Tenant ID must be a valid GUID or .onmicrosoft.com domain';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) return;
    
    setIsLoading(true);
    try {
      const saveData: any = {
        clientId: config.clientId,
        tenantId: config.tenantId,
        isActive: true // Always enable when saving configuration
      };

      // Only include client secret if it's new (not the masked value and not empty)
      if (config.clientSecret && config.clientSecret !== '********') {
        saveData.clientSecret = config.clientSecret;
      }
      // If clientSecret is empty or masked, backend will keep existing secret

      const response = await api.put('/api/integrations/office365/config', saveData);

      const updatedConfig = response.data.config;
      setConfig(updatedConfig);
      setTestResult({ success: true, message: 'Configuration saved successfully' });
      
      // Only load sync status and stats if the integration is now configured and active
      if (updatedConfig.isConfigured && updatedConfig.isActive) {
        await loadSyncStatus();
        await loadStats();
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to save configuration';
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!config.isConfigured) {
      setTestResult({ success: false, message: 'Please save configuration first' });
      return;
    }

    setIsLoading(true);
    try {
      const newActiveState = !config.isActive;
      const response = await api.post('/api/integrations/office365/toggle', {
        isActive: newActiveState
      });

      setConfig(prev => ({
        ...prev,
        isActive: newActiveState,
        status: response.data.status
      }));

      setTestResult({ 
        success: true, 
        message: `Office 365 integration ${newActiveState ? 'enabled' : 'disabled'} successfully` 
      });
      
      // Reload sync status and stats after toggling
      if (newActiveState) {
        await loadSyncStatus();
        await loadStats();
      } else {
        // Clear sync status and stats when disabled
        setSyncStatus({
          isRunning: false,
          progress: null,
          status: 'idle',
          lastSync: null,
          error: null
        });
        setStats({
          totalUsers: 0,
          emailsProcessed: 0,
          violationsDetected: 0,
          lastSyncDuration: 0,
          riskDistribution: {
            high: 0,
            medium: 0,
            low: 0
          }
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to toggle integration';
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    if (!validateConfig()) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const response = await api.post('/api/integrations/office365/test', {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        tenantId: config.tenantId
      });

      const result = response.data;
      setTestResult(result);
      
      if (result.success) {
        setConfig(prev => ({ ...prev, status: 'connected' }));
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Network error occurred';
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSync = async () => {
    try {
      const response = await api.post('/api/integrations/office365/sync');
      
      setSyncStatus(prev => ({ ...prev, isRunning: true, status: 'starting' }));
      // Will be updated by polling
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start sync';
      setTestResult({ success: false, message: errorMessage });
    }
  };

  const handleSyncUsers = async () => {
    setIsSyncingUsers(true);
    setUserSyncResult(null);
    
    try {
      // Start user sync (returns immediately)
      const response = await api.post('/api/integrations/office365/sync/users');
      
      console.log('User sync started:', response.data);
      
      // Start polling for user sync status
      const pollUserSyncStatus = () => {
        const checkStatus = async () => {
          try {
            const statusResponse = await api.get('/api/integrations/office365/sync/users/status');
            const status = statusResponse.data;
            
            if (status.isRunning) {
              // Still running, check again in 2 seconds
              setTimeout(checkStatus, 2000);
            } else {
              // Sync completed or failed
              setIsSyncingUsers(false);
              
              if (status.status === 'completed' && status.results) {
                setUserSyncResult({
                  success: true,
                  message: 'Office 365 user synchronization completed successfully',
                  results: status.results
                });
                
                // Reload stats to show updated employee count
                if (config.isConfigured && config.isActive) {
                  await loadStats();
                }
              } else if (status.status === 'failed') {
                setUserSyncResult({
                  success: false,
                  message: status.error || 'User sync failed'
                });
              }
            }
          } catch (error) {
            console.error('Error checking user sync status:', error);
            setIsSyncingUsers(false);
            setUserSyncResult({
              success: false,
              message: 'Failed to check sync status'
            });
          }
        };
        
        // Start checking status
        setTimeout(checkStatus, 2000);
      };
      
      pollUserSyncStatus();
      
    } catch (error: any) {
      setIsSyncingUsers(false);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start user sync';
      setUserSyncResult({ success: false, message: errorMessage });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'testing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <X className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-900 dark:text-white">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render the modal (parent should handle this)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">📧</div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Office 365 Integration</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">Configure email monitoring and user activity analysis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'config', label: 'Configuration', icon: Settings },
              { id: 'status', label: 'Sync Status', icon: RefreshCw },
              { id: 'stats', label: 'Statistics', icon: BarChart3 }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* Current Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(config.status)}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {config.isConfigured ? 'Configured' : 'Not Configured'}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {config.lastSync ? `Last sync: ${formatLastSync(config.lastSync)}` : 'Never synchronized'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {config.isConfigured && (
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {config.isActive ? 'Enabled' : 'Disabled'}
                        </span>
                        <button
                          onClick={handleToggle}
                          disabled={isLoading}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            config.isActive 
                              ? 'bg-blue-600' 
                              : 'bg-gray-200 dark:bg-gray-600'
                          } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              config.isActive ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    )}
                    {config.isConfigured && config.isActive && (
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSyncUsers}
                          disabled={isSyncingUsers || syncStatus.isRunning}
                          className="flex items-center space-x-2 px-3 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Sync Office 365 users to employees table (runs in background)"
                        >
                          <Users className={`w-4 h-4 ${isSyncingUsers ? 'animate-pulse' : ''}`} />
                          <span>{isSyncingUsers ? 'Syncing Users...' : 'Sync Users'}</span>
                        </button>
                        <button
                          onClick={handleSync}
                          disabled={syncStatus.isRunning || isSyncingUsers}
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncStatus.isRunning ? 'animate-spin' : ''}`} />
                          <span>{syncStatus.isRunning ? 'Syncing Emails...' : 'Sync Emails'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* User Sync Results */}
              {userSyncResult && (
                <div className={`p-4 rounded-lg border ${
                  userSyncResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start space-x-3">
                    {userSyncResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        userSyncResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                      }`}>
                        User Sync {userSyncResult.success ? 'Completed' : 'Failed'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        userSyncResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                      }`}>
                        {userSyncResult.message}
                      </p>
                      {userSyncResult.success && userSyncResult.results && (
                        <div className="mt-2 space-y-1 text-sm text-green-700 dark:text-green-300">
                          <div>• Total Office 365 users: {userSyncResult.results.totalUsers}</div>
                          <div>• New employees created: {userSyncResult.results.newEmployees}</div>
                          <div>• Existing employees updated: {userSyncResult.results.updatedEmployees}</div>
                          <div>• Emails linked to employees: {userSyncResult.results.linkedEmails}</div>
                          <div>• Avatars generated for all users</div>
                          {userSyncResult.results.errors?.length > 0 && (
                            <div>• Errors: {userSyncResult.results.errors.length}</div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setUserSyncResult(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Configuration Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.clientId}
                    onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.clientId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.clientId && <p className="mt-1 text-sm text-red-500">{errors.clientId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Client Secret <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={config.clientSecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                      placeholder={config.clientSecret === '********' ? 'Secret saved • Leave empty to keep existing' : 'Enter client secret'}
                      className={`w-full px-3 py-2 pr-20 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        errors.clientSecret ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                      {config.clientSecret === '********' && (
                        <button
                          type="button"
                          onClick={() => setConfig(prev => ({ ...prev, clientSecret: '' }))}
                          className="px-2 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Clear to enter new secret"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowSecret(!showSecret)}
                        className="pr-3 pl-1 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {config.clientSecret === '********' && (
                    <p className="mt-1 text-sm text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Client secret is configured. Leave empty to keep existing, or enter new secret to update.
                    </p>
                  )}
                  {errors.clientSecret && <p className="mt-1 text-sm text-red-500">{errors.clientSecret}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tenant ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={config.tenantId}
                    onChange={(e) => setConfig(prev => ({ ...prev, tenantId: e.target.value }))}
                    placeholder="00000000-0000-0000-0000-000000000000 or company.onmicrosoft.com"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.tenantId ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.tenantId && <p className="mt-1 text-sm text-red-500">{errors.tenantId}</p>}
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Setup Instructions</h4>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">Azure Portal</a></li>
                      <li>Navigate to "App registrations" and create a new app</li>
                      <li>Copy the Application (client) ID and Directory (tenant) ID</li>
                      <li>Create a client secret in "Certificates & secrets"</li>
                      <li>Add API permissions: Mail.Read, User.Read.All, Directory.Read.All</li>
                      <li>Grant admin consent for your organization</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`rounded-lg p-4 ${
                  testResult.success 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{testResult.message}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Current Sync Status */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Current Sync Status</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      syncStatus.isRunning ? 'bg-blue-500 animate-pulse' : 
                      syncStatus.status === 'completed' ? 'bg-green-500' : 
                      syncStatus.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {syncStatus.isRunning ? 'Synchronizing...' : syncStatus.status || 'Idle'}
                      </p>
                      {syncStatus.progress && (
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {Math.round(syncStatus.progress)}% complete
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Last Sync</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatLastSync(syncStatus.lastSync)}
                    </p>
                  </div>
                </div>
                
                {syncStatus.progress && (
                  <div className="mt-4">
                    <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${syncStatus.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {syncStatus.error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{syncStatus.error}</p>
                  </div>
                )}
              </div>

              {/* Sync Controls */}
              <div className="flex space-x-3">
                <button
                  onClick={handleSync}
                  disabled={syncStatus.isRunning || !config.isConfigured}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Sync</span>
                </button>
                <button
                  onClick={loadSyncStatus}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              {stats ? (
                <>
                  {/* Key Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Users</p>
                          <p className="text-xl font-bold text-blue-900 dark:text-blue-100">{stats.totalUsers || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-100">Emails Processed</p>
                          <p className="text-xl font-bold text-green-900 dark:text-green-100">{(stats.emailsProcessed || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                        <div>
                          <p className="text-sm font-medium text-red-900 dark:text-red-100">Violations</p>
                          <p className="text-xl font-bold text-red-900 dark:text-red-100">{stats.violationsDetected || 0}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Clock className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Last Sync Duration</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatDuration(stats.lastSyncDuration)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Risk Distribution */}
                  <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-4">Risk Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">High Risk</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-red-500 h-2 rounded-full"
                              style={{ width: `${stats.violationsDetected ? ((stats.riskDistribution?.high || 0) / stats.violationsDetected) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{stats.riskDistribution?.high || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Medium Risk</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${stats.violationsDetected ? ((stats.riskDistribution?.medium || 0) / stats.violationsDetected) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{stats.riskDistribution?.medium || 0}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-300">Low Risk</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${stats.violationsDetected ? ((stats.riskDistribution?.low || 0) / stats.violationsDetected) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white w-8">{stats.riskDistribution?.low || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">No statistics available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure and sync Office 365 to see statistics</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between">
            <a
              href="https://docs.microsoft.com/en-us/graph/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Microsoft Graph Documentation</span>
            </a>
            
            <div className="flex space-x-3">
              {activeTab === 'config' && (
                <>
                  <button
                    onClick={handleTest}
                    disabled={isTesting || !config.clientId || !(config.clientSecret && config.clientSecret.trim()) || !config.tenantId}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <TestTube className={`w-4 h-4 ${isTesting ? 'animate-pulse' : ''}`} />
                    <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                    <span>{isLoading ? 'Saving...' : 'Save Configuration'}</span>
                  </button>
                </>
              )}
              <button 
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 