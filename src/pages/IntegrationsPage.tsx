import React, { useState, useEffect } from 'react';
import { Building2, RefreshCw, Settings, AlertTriangle, CheckCircle, XCircle, Mail, MessageSquare, Zap } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Office365Config } from '../components/Office365Config';
import { TeamsConfig } from '../components/TeamsConfig';
import { GoogleWorkspaceConfig } from '../components/GoogleWorkspaceConfig';
import api from '../services/api';

interface IntegrationStatus {
  isConfigured: boolean;
  isActive: boolean;
  status: string;
}

interface IntegrationsData {
  office365?: IntegrationStatus;
  teams?: IntegrationStatus;
  google_workspace?: IntegrationStatus;
}

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationsData>({});
  const [showOffice365Config, setShowOffice365Config] = useState(false);
  const [showTeamsConfig, setShowTeamsConfig] = useState(false);
  const [showGoogleWorkspaceConfig, setShowGoogleWorkspaceConfig] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setRefreshing(true);
      const response = await api.get('/api/integrations/status');
      setIntegrations(response.data);
    } catch (error) {
      console.error('Failed to load integrations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadIntegrations();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Integrations</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Connect external services to monitor communications and detect security threats
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {/* Office 365 Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Office 365</h3>
                  <p className="text-gray-600 dark:text-gray-400">Email monitoring and analysis</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.office365 ? (
                  <>
                    {integrations.office365.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {integrations.office365.status === 'disabled' && (
                      <XCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    {integrations.office365.status === 'not_configured' && (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </>
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`text-sm font-medium ${
                  integrations.office365?.status === 'connected' 
                    ? 'text-green-600 dark:text-green-400' 
                    : integrations.office365?.status === 'disabled'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.office365?.status === 'connected' && 'Connected & Active'}
                  {integrations.office365?.status === 'disabled' && 'Configured but Disabled'}
                  {integrations.office365?.status === 'not_configured' && 'Not Configured'}
                  {!integrations.office365 && 'Not Available'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Configuration</span>
                <span className={`text-sm font-medium ${
                  integrations.office365?.isConfigured 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.office365?.isConfigured ? 'Complete' : 'Incomplete'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                <span className={`text-sm font-medium ${
                  integrations.office365?.isActive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {integrations.office365?.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <p>• Monitor email communications</p>
                <p>• Detect policy violations</p>
                <p>• Track user activities</p>
                <p>• AI-powered risk analysis</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOffice365Config(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
                
                {integrations.office365?.status === 'connected' && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Microsoft Teams Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Microsoft Teams</h3>
                  <p className="text-gray-600 dark:text-gray-400">Teams chat and file monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.teams ? (
                  <>
                    {integrations.teams.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {integrations.teams.status === 'disabled' && (
                      <XCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    {integrations.teams.status === 'not_configured' && (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </>
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`text-sm font-medium ${
                  integrations.teams?.status === 'connected' 
                    ? 'text-green-600 dark:text-green-400' 
                    : integrations.teams?.status === 'disabled'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.teams?.status === 'connected' && 'Connected & Active'}
                  {integrations.teams?.status === 'disabled' && 'Configured but Disabled'}
                  {integrations.teams?.status === 'not_configured' && 'Not Configured'}
                  {!integrations.teams && 'Not Available'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Configuration</span>
                <span className={`text-sm font-medium ${
                  integrations.teams?.isConfigured 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.teams?.isConfigured ? 'Complete' : 'Incomplete'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                <span className={`text-sm font-medium ${
                  integrations.teams?.isActive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {integrations.teams?.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <p>• Monitor Teams conversations</p>
                <p>• Track file sharing activities</p>
                <p>• Detect inappropriate content</p>
                <p>• Requires Office 365 first</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTeamsConfig(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
                
                {integrations.teams?.status === 'connected' && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Google Workspace Integration */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Google Workspace</h3>
                  <p className="text-gray-600 dark:text-gray-400">Gmail and Google Drive monitoring</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {integrations.google_workspace ? (
                  <>
                    {integrations.google_workspace.status === 'connected' && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                    {integrations.google_workspace.status === 'disabled' && (
                      <XCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    {integrations.google_workspace.status === 'not_configured' && (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </>
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span className={`text-sm font-medium ${
                  integrations.google_workspace?.status === 'connected' 
                    ? 'text-green-600 dark:text-green-400' 
                    : integrations.google_workspace?.status === 'disabled'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.google_workspace?.status === 'connected' && 'Connected & Active'}
                  {integrations.google_workspace?.status === 'disabled' && 'Configured but Disabled'}
                  {integrations.google_workspace?.status === 'not_configured' && 'Not Configured'}
                  {!integrations.google_workspace && 'Not Available'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Configuration</span>
                <span className={`text-sm font-medium ${
                  integrations.google_workspace?.isConfigured 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {integrations.google_workspace?.isConfigured ? 'Complete' : 'Incomplete'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Active</span>
                <span className={`text-sm font-medium ${
                  integrations.google_workspace?.isActive 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {integrations.google_workspace?.isActive ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <p>• Monitor Gmail communications</p>
                <p>• Analyze Google Drive file sharing</p>
                <p>• Detect data exfiltration attempts</p>
                <p>• AI-powered risk assessment</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowGoogleWorkspaceConfig(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configure</span>
                </button>
                
                {integrations.google_workspace?.status === 'connected' && (
                  <div className="flex items-center space-x-1 text-green-600 dark:text-green-400 text-sm">
                    <Zap className="w-4 h-4" />
                    <span>Active</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Modals - Only render when needed */}
      {showOffice365Config && (
        <Office365Config
          isOpen={showOffice365Config}
          onClose={() => setShowOffice365Config(false)}
          onSave={() => {
            setShowOffice365Config(false);
            loadIntegrations();
          }}
        />
      )}

      {showTeamsConfig && (
        <TeamsConfig
          isOpen={showTeamsConfig}
          onClose={() => setShowTeamsConfig(false)}
          onSave={() => {
            setShowTeamsConfig(false);
            loadIntegrations();
          }}
        />
      )}

      {showGoogleWorkspaceConfig && (
        <GoogleWorkspaceConfig
          isOpen={showGoogleWorkspaceConfig}
          onClose={() => setShowGoogleWorkspaceConfig(false)}
          onSave={() => {
            setShowGoogleWorkspaceConfig(false);
            loadIntegrations();
          }}
        />
      )}
    </div>
  );
}; 