import React from 'react';
import { useState, useEffect } from 'react';
import { Network, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { NetworkMapModal } from './NetworkMapModal';
import { networkData, createNetworkData } from '../data/networkData';
import { NetworkData } from '../types';
import { LoadingSpinner, LoadingCard } from './LoadingSpinner';
import { ErrorCard } from './ErrorMessage';
import { AppError, ErrorType, createError, withErrorHandling } from '../utils/errorUtils';

export const NetworkAnalysis: React.FC = () => {
  const [showNetworkMap, setShowNetworkMap] = useState(false);
  const [loading, setLoading] = useState(true); // Start with loading true
  const [error, setError] = useState<AppError | null>(null);
  const [currentNetworkData, setCurrentNetworkData] = useState<NetworkData>(networkData);

  // Load network data automatically on component mount
  useEffect(() => {
    loadNetworkData();
  }, []);

  // Load real network data
  const loadNetworkData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: networkDataResult, error: loadError } = await withErrorHandling(
        () => createNetworkData(),
        'NetworkAnalysis.loadNetworkData'
      );

      if (loadError) {
        throw loadError;
      }

      setCurrentNetworkData(networkDataResult || networkData);
    } catch (error) {
      const appError = error instanceof Error 
        ? createError(ErrorType.NETWORK, 'Failed to load network visualization. Please try again.', error, undefined, true)
        : error as AppError;
      
      setError(appError);
    } finally {
      setLoading(false);
    }
  };

  // Load network map modal
  const loadNetworkMap = async () => {
    if (currentNetworkData.nodes.length === 0) {
      await loadNetworkData();
    }
    setShowNetworkMap(true);
  };

  const handleRetry = () => {
    setError(null);
    loadNetworkData();
  };

  // Calculate analytics from the loaded network data
  const getHighRiskEmployees = () => {
    return currentNetworkData.nodes.filter(node => 
      node.riskLevel === 'High' || node.riskLevel === 'Critical'
    ).length;
  };

  const getMediumRiskEmployees = () => {
    return currentNetworkData.nodes.filter(node => 
      node.riskLevel === 'Medium'
    ).length;
  };

  const getTotalEmployees = () => {
    return currentNetworkData.nodes.length;
  };

  const getHighRiskConnections = () => {
    return currentNetworkData.links.filter(link => 
      link.riskLevel === 'High'
    ).length;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Network Analysis</h2>
        <Network className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading network analysis...</span>
        </div>
      ) : error ? (
        <ErrorCard
          title="Network Analysis Error"
          message={error.message}
          onRetry={handleRetry}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-100">High-Risk Employees</p>
                <p className="text-sm text-red-700 dark:text-red-200">Employees with critical or high risk levels</p>
              </div>
            </div>
            <span className="text-sm font-medium text-red-600 dark:text-red-400">{getHighRiskEmployees()} employees</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Medium Risk Employees</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-200">Employees requiring monitoring</p>
              </div>
            </div>
            <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{getMediumRiskEmployees()} employees</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Total Network Nodes</p>
                <p className="text-sm text-blue-700 dark:text-blue-200">Active employees in network analysis</p>
              </div>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{getTotalEmployees()} employees</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-3">
              <Network className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">High-Risk Connections</p>
                <p className="text-sm text-purple-700 dark:text-purple-200">Suspicious network connections detected</p>
              </div>
            </div>
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{getHighRiskConnections()} connections</span>
          </div>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button 
          onClick={loadNetworkMap}
          disabled={loading || error !== null}
          className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" />
              <span>Loading Network Data...</span>
            </>
          ) : error ? (
            <span>Network Data Unavailable</span>
          ) : (
            <span>View Full Network Map ({getTotalEmployees()} nodes)</span>
          )}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          💡 Search for employees to see their network connections • Click nodes to investigate violations with linked email evidence
        </p>
      </div>
      </div>

      {showNetworkMap && (
        <NetworkMapModal
          networkData={currentNetworkData}
          onClose={() => setShowNetworkMap(false)}
        />
      )}
    </>
  );
};