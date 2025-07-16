import React, { useState } from 'react';
import { Plug, CheckCircle, XCircle, AlertTriangle, Settings, Plus, RefreshCw as Refresh, ExternalLink } from 'lucide-react';
import { Integration } from '../types';

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Microsoft Office 365',
    description: 'Connect to Office 365 for email monitoring and user activity analysis',
    icon: '📧',
    status: 'connected',
    lastSync: '2025-01-27T10:30:00Z',
    config: {
      tenant: 'company.onmicrosoft.com',
      clientId: '****-****-****-****',
      permissions: ['Mail.Read', 'User.Read.All']
    }
  },
  {
    id: '2',
    name: 'Google Workspace',
    description: 'Monitor Gmail and Google Drive activities for security threats',
    icon: '🔍',
    status: 'disconnected',
    config: {}
  },
  {
    id: '3',
    name: 'Slack',
    description: 'Analyze Slack communications for policy violations and data leaks',
    icon: '💬',
    status: 'error',
    lastSync: '2025-01-26T15:20:00Z',
    config: {
      workspace: 'company.slack.com',
      botToken: '****-****-****'
    }
  },
  {
    id: '4',
    name: 'Microsoft Teams',
    description: 'Monitor Teams messages and file sharing activities',
    icon: '👥',
    status: 'disconnected',
    config: {}
  },
  {
    id: '5',
    name: 'Salesforce',
    description: 'Track CRM data access and customer information security',
    icon: '☁️',
    status: 'disconnected',
    config: {}
  },
  {
    id: '6',
    name: 'Box',
    description: 'Monitor file sharing and collaboration activities',
    icon: '📦',
    status: 'disconnected',
    config: {}
  }
];

export const IntegrationsPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const getStatusIcon = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <XCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Not Connected';
    }
  };

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
  };

  const handleSync = (integrationId: string) => {
    setIntegrations(prev => prev.map(int => 
      int.id === integrationId 
        ? { ...int, lastSync: new Date().toISOString() }
        : int
    ));
  };

  const formatLastSync = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString();
  };

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Integrations</h1>
            <p className="text-gray-600 dark:text-gray-300">Connect external systems to enhance security monitoring</p>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
            <Plus className="w-5 h-5" />
            <span>Add Integration</span>
          </button>
        </div>
      </div>

      {/* Integration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
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
              {integration.status === 'connected' && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <p>Last sync: {formatLastSync(integration.lastSync)}</p>
                </div>
              )}

              <div className="flex space-x-2">
                {integration.status === 'connected' ? (
                  <>
                    <button 
                      onClick={() => handleSync(integration.id)}
                      className="flex items-center space-x-1 px-3 py-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-sm"
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
                  </>
                ) : (
                  <button 
                    onClick={() => handleConnect(integration)}
                    className="flex items-center space-x-1 px-3 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-sm"
                  >
                    <Plug className="w-4 h-4" />
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Connected</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {integrations.filter(i => i.status === 'connected').length}
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
                {integrations.filter(i => i.status === 'error').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <XCircle className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Available</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {integrations.filter(i => i.status === 'disconnected').length}
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
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{integrations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Modal would go here */}
      {selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Configure {selectedIntegration.name}</h3>
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">{selectedIntegration.description}</p>
            <div className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400">
              <ExternalLink className="w-4 h-4" />
              <span>Visit integration documentation</span>
            </div>
            <div className="mt-6 flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors">
                Connect
              </button>
              <button 
                onClick={() => setSelectedIntegration(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};