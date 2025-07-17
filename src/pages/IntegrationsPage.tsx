import React, { useState, useEffect } from 'react';
import { Plug, CheckCircle, XCircle, AlertTriangle, Settings, Plus, RefreshCw as Refresh, ExternalLink } from 'lucide-react';
import { Integration } from '../types';
import { Office365Config } from '../components/Office365Config';
import { LoginPrompt } from '../components/LoginPrompt';
import api from '../services/api';

interface IntegrationStatus {
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error' | 'disabled' | 'not_configured';
  lastSync?: string;
  isConfigured: boolean;
  isActive?: boolean;
  config?: Record<string, any>;
}

export const IntegrationsPage: React.FC = () => {
  const [office365Status, setOffice365Status] = useState<IntegrationStatus>({
    name: 'Microsoft Office 365',
    description: 'Connect to Office 365 for email monitoring and user activity analysis',
    icon: '📧',
    status: 'disconnected',
    isConfigured: false
  });
  
  const [otherIntegrations] = useState<IntegrationStatus[]>([
    {
      name: 'Google Workspace',
      description: 'Monitor Gmail and Google Drive activities for security threats',
      icon: '🔍',
      status: 'disconnected',
      isConfigured: false
    },
    {
      name: 'Slack',
      description: 'Analyze Slack communications for policy violations and data leaks',
      icon: '💬',
      status: 'disconnected',
      isConfigured: false
    },
    {
      name: 'Microsoft Teams',
      description: 'Monitor Teams messages and file sharing activities',
      icon: '👥',
      status: 'disconnected',
      isConfigured: false
    },
    {
      name: 'Salesforce',
      description: 'Track CRM data access and customer information security',
      icon: '☁️',
      status: 'disconnected',
      isConfigured: false
    },
    {
      name: 'Box',
      description: 'Monitor file sharing and collaboration activities',
      icon: '📦',
      status: 'disconnected',
      isConfigured: false
    }
  ]);

  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationStatus | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    checkAuthAndLoadStatus();
  }, []);

  const checkAuthAndLoadStatus = async () => {
    try {
      // First, check basic integration status (no auth required)
      await loadIntegrationStatus();
      
      // Then check authentication
      const authResponse = await api.get('/api/auth/status');
      setIsAuthenticated(authResponse.data.authenticated);
      
      if (authResponse.data.authenticated) {
        // Only load detailed config if user is admin and Office 365 is configured
        if (authResponse.data.user?.role === 'admin' && office365Status.isConfigured) {
          setTimeout(async () => {
            await loadOffice365Config();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Failed to check authentication and status:', error);
      setOffice365Status(prev => ({
        ...prev,
        status: 'error',
        isConfigured: false,
        isActive: false
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntegrationStatus = async () => {
    try {
      const response = await api.get('/api/integrations/status');
      const statusData = response.data;
      
      if (statusData.office365) {
        setOffice365Status(prev => ({
          ...prev,
          isConfigured: statusData.office365.isConfigured,
          isActive: statusData.office365.isActive,
          status: statusData.office365.status
        }));
      }
    } catch (error) {
      console.error('Failed to load integration status:', error);
      // Set safe defaults
      setOffice365Status(prev => ({
        ...prev,
        status: 'not_configured',
        isConfigured: false,
        isActive: false
      }));
    }
  };

  const loadOffice365Config = async () => {
    try {
      // This function loads detailed configuration data for admin users
      const configResponse = await api.get('/api/integrations/office365/config');
      const configData = configResponse.data;
      
      setOffice365Status(prev => ({
        ...prev,
        config: configData,
        // Update status from detailed config if available
        isConfigured: configData?.isConfigured || prev.isConfigured,
        isActive: configData?.isActive || prev.isActive,
        status: configData?.status || prev.status
      }));

      // Only load sync status if Office 365 is configured AND active
      if (configData?.isConfigured && configData?.isActive) {
        await loadOffice365SyncStatus();
      }
    } catch (error) {
      console.error('Failed to load Office 365 detailed config:', error);
      // Don't overwrite basic status on error, just log it
    }
  };

  const loadOffice365SyncStatus = async () => {
    try {
      const syncResponse = await api.get('/api/integrations/office365/sync/status');
      const syncData = syncResponse.data;
      
      setOffice365Status(prev => ({
        ...prev,
        status: syncData?.status === 'error' ? 'error' : 'connected',
        lastSync: syncData?.lastSync
      }));
    } catch (error) {
      console.error('Failed to load sync status:', error);
      // Don't change status on sync error - keep as configured
    }
  };

  const handleConnect = (integration: IntegrationStatus) => {
    if (integration.name === 'Microsoft Office 365') {
      setSelectedIntegration(integration);
      setShowConfigModal(true);
    }
  };

  const handleCloseConfigModal = async () => {
    setShowConfigModal(false);
    setSelectedIntegration(null);
    
    // Refresh integration status after configuration changes
    await loadIntegrationStatus();
    
    // If user is admin and Office 365 is now configured, load detailed config
    if (isAuthenticated && office365Status.isConfigured) {
      await loadOffice365Config();
    }
  };

  const handleToggleIntegration = async (integrationName: string) => {
    if (integrationName === 'Microsoft Office 365') {
      if (!office365Status.isConfigured) {
        console.log('Cannot toggle - Office 365 not configured');
        return;
      }

      try {
        const newActiveState = !office365Status.isActive;
        const response = await api.post('/api/integrations/office365/toggle', {
          isActive: newActiveState
        });
        
        // Update status immediately
        setOffice365Status(prev => ({
          ...prev,
          isActive: newActiveState,
          status: response.data.status
        }));

        console.log(`Office 365 ${newActiveState ? 'enabled' : 'disabled'} successfully`);
        
        // Refresh status to ensure consistency
        await loadIntegrationStatus();
      } catch (error) {
        console.error('Failed to toggle Office 365:', error);
      }
    }
  };

  const getAllIntegrations = () => [office365Status, ...otherIntegrations];

  const getStatusIcon = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disabled':
        return <XCircle className="w-5 h-5 text-orange-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'Enabled';
      case 'disabled':
        return 'Disabled';
      case 'error':
        return 'Error';
      default:
        return 'Not Configured';
    }
  };

  const getStatusColor = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800';
      case 'disabled':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-700 dark:border-gray-600';
    }
  };

  const handleSync = async (integrationName: string) => {
    if (integrationName === 'Microsoft Office 365') {
      // Only allow sync if Office 365 is configured AND active
      if (!office365Status.isConfigured) {
        console.log('Cannot sync - Office 365 not configured');
        return;
      }
      
      if (!office365Status.isActive) {
        console.log('Cannot sync - Office 365 is disabled');
        return;
      }

      try {
        const response = await api.post('/api/integrations/office365/sync');
        
        // Refresh status after a short delay
        setTimeout(() => {
          loadOffice365SyncStatus(); // Only reload sync status, not full config
        }, 1000);
      } catch (error) {
        console.error('Failed to sync Office 365:', error);
      }
    }
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  const allIntegrations = getAllIntegrations();

  if (isLoading) {
    return (
      <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <Refresh className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Integrations</h1>
            <p className="text-gray-600 dark:text-gray-300">Connect external systems to enhance security monitoring</p>
          </div>
          <button 
            onClick={() => {
              if (isAuthenticated) {
                setSelectedIntegration(office365Status); // Set the Office 365 integration
                setShowConfigModal(true); // Show config modal for new setup
              } else {
                setShowLoginPrompt(true);
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Setup Integration</span>
          </button>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {allIntegrations.map((integration, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{integration.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{integration.name}</h3>
                  <div className={`flex items-center space-x-2 mt-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(integration.status)}`}>
                    {getStatusIcon(integration.status)}
                    <span>{getStatusText(integration.status)}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleConnect(integration)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 leading-relaxed">{integration.description}</p>

            <div className="space-y-3">
              {integration.status === 'connected' && integration.lastSync && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Last sync: {formatLastSync(integration.lastSync)}</p>
                </div>
              )}

              <div className="flex space-x-2">
                {integration.status === 'connected' ? (
                  <>
                    <button 
                      onClick={() => handleSync(integration.name)}
                      disabled={!integration.isConfigured || !integration.isActive}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Refresh className="w-4 h-4" />
                      <span>Sync</span>
                    </button>
                    <button 
                      onClick={() => handleConnect(integration)}
                      className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configure</span>
                    </button>
                    {integration.isConfigured && (
                      <button 
                        onClick={() => handleToggleIntegration(integration.name)}
                        className="flex items-center space-x-1 px-3 py-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Disable</span>
                      </button>
                    )}
                  </>
                ) : integration.status === 'disabled' ? (
                  <>
                    <button 
                      onClick={() => handleToggleIntegration(integration.name)}
                      className="flex items-center space-x-1 px-3 py-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Enable</span>
                    </button>
                    <button 
                      onClick={() => handleConnect(integration)}
                      className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Configure</span>
                    </button>
                  </>
                ) : integration.isConfigured ? (
                  <>
                    <button 
                      onClick={() => handleConnect(integration)}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Reconfigure</span>
                    </button>
                    <button 
                      onClick={() => handleSync(integration.name)}
                      disabled={!integration.isConfigured || !integration.isActive}
                      className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Refresh className="w-4 h-4" />
                      <span>Retry</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleConnect(integration)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    <Plug className="w-4 h-4" />
                    <span>Configure</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Enabled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allIntegrations.filter(i => i.status === 'connected').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Disabled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allIntegrations.filter(i => i.status === 'disabled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Errors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allIntegrations.filter(i => i.status === 'error').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {allIntegrations.filter(i => i.status === 'disconnected' || i.status === 'not_configured').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <Plug className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{allIntegrations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Prompt */}
      {showLoginPrompt && (
        <LoginPrompt
          onLoginSuccess={() => {
            setShowLoginPrompt(false);
            setIsAuthenticated(true);
            loadOffice365Config(); // Refresh config after login
          }}
          onClose={() => setShowLoginPrompt(false)}
        />
      )}

      {/* Office 365 Configuration Modal */}
      {showConfigModal && selectedIntegration?.name === 'Microsoft Office 365' && isAuthenticated && (
        <Office365Config 
          onClose={handleCloseConfigModal}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Generic Integration Modal for other integrations */}
      {selectedIntegration && selectedIntegration.name !== 'Microsoft Office 365' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configure {selectedIntegration.name}</h3>
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {selectedIntegration.name} integration is coming soon.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                This integration is not yet available. Please check back later or contact support for more information.
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
                <ExternalLink className="w-4 h-4" />
                <span>View integration roadmap</span>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};