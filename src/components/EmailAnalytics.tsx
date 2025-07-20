import React, { useState, useEffect } from 'react';
import { Mail, Flag, AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { EmailAnalytics as EmailAnalyticsType } from '../types';
import { emailAPI } from '../services/api';

interface EmailAnalyticsProps {
  onViewDetails?: () => void;
  className?: string;
}

export const EmailAnalytics: React.FC<EmailAnalyticsProps> = ({ onViewDetails, className = '' }) => {
  const [analytics, setAnalytics] = useState<EmailAnalyticsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await emailAPI.getAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching email analytics:', err);
        setError('Failed to load email analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center py-4">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-600 dark:text-red-400">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const { overview } = analytics;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Mail className="w-6 h-6 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Communications</h2>
        </div>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Eye className="w-4 h-4" />
            <span>View All</span>
          </button>
        )}
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {overview.totalEmails.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Emails</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {overview.flaggedEmails}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Flagged</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            {overview.suspiciousEmails}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Suspicious</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {overview.avgRiskScore}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Avg Risk</div>
        </div>
      </div>

      {/* Integration Sources */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🏢</span>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Office 365</p>
              <p className="text-sm text-blue-700 dark:text-blue-200">Microsoft email integration</p>
            </div>
          </div>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {overview.office365Emails} emails
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-3">
            <span className="text-lg">🔍</span>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Google Workspace</p>
              <p className="text-sm text-green-700 dark:text-green-200">Gmail integration</p>
            </div>
          </div>
          <span className="text-sm font-medium text-green-600 dark:text-green-400">
            {overview.googleWorkspaceEmails} emails
          </span>
        </div>
      </div>

      {/* Top Risk Senders */}
      {analytics.topRiskSenders.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Top Risk Senders</h3>
          <div className="space-y-2">
            {(analytics.topRiskSenders || []).slice(0, 3).map((sender, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {sender.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {sender.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-3">
                  {sender.flaggedCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <Flag className="w-3 h-3 mr-1" />
                      {sender.flaggedCount}
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    parseFloat(sender.avgRiskScore) >= 70 
                      ? 'bg-red-100 text-red-800' 
                      : parseFloat(sender.avgRiskScore) >= 50
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {sender.avgRiskScore}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity Trend */}
      {(analytics.volumeByDay || []).length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recent Activity</h3>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-center space-x-1">
            {(analytics.volumeByDay || []).slice(0, 7).reverse().map((day, index) => (
              <div
                key={index}
                className="flex-1 bg-blue-200 dark:bg-blue-700 rounded-sm"
                style={{ 
                  height: `${Math.max(4, (day.count / Math.max(...(analytics.volumeByDay || []).map(d => d.count))) * 24)}px` 
                }}
                title={`${day.count} emails on ${new Date(day.date).toLocaleDateString()}`}
              >
                {day.flaggedCount > 0 && (
                  <div 
                    className="bg-red-500 rounded-sm" 
                    style={{ 
                      height: `${(day.flaggedCount / day.count) * 100}%` 
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Last 7 days • Blue: total emails, Red: flagged emails
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailAnalytics; 