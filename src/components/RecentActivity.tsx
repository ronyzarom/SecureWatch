import React, { useState, useEffect } from 'react';
import { Activity, Clock, AlertTriangle, Mail, Download, Shield } from 'lucide-react';
import { formatTimeAgo } from '../utils/riskUtils';
import api from '../services/api';

interface ActivityItem {
  id: string;
  type: 'violation' | 'email' | 'download' | 'login';
  user: string;
  description: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
}

export const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5); // Limit to 5 activities per page

  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/dashboard/recent-violations');
        
        // Transform backend violations data to activity format
        const transformedActivities: ActivityItem[] = response.data.violations.map((violation: any) => ({
          id: violation.id.toString(),
          type: 'violation' as const,
          user: violation.employee.name,
          description: violation.description,
          timestamp: violation.createdAt,
          severity: violation.severity as 'Critical' | 'High' | 'Medium' | 'Low'
        }));

        setActivities(transformedActivities);
        setError(null);
      } catch (err) {
        console.error('Error fetching recent activity:', err);
        setError('Failed to load recent activity');
        
        // Fallback to mock data on error
        const mockActivity: ActivityItem[] = [
          {
            id: '1',
            type: 'violation',
            user: 'Sarah Mitchell',
            description: 'Accessed financial records outside normal hours',
            timestamp: '2025-01-27T02:15:00Z',
            severity: 'Critical'
          },
          {
            id: '2',
            type: 'email',
            user: 'David Chen',
            description: 'Forwarded confidential email to external contact',
            timestamp: '2025-01-26T18:30:00Z',
            severity: 'High'
          },
          {
            id: '3',
            type: 'download',
            user: 'Michael Rodriguez',
            description: 'Downloaded large volume of customer data',
            timestamp: '2025-01-26T14:45:00Z',
            severity: 'High'
          }
        ];
        setActivities(mockActivity);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'violation': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'policy_execution': return <Shield className="w-4 h-4 text-green-500" />;
      case 'email': return <Mail className="w-4 h-4 text-blue-500" />;
      case 'download': return <Download className="w-4 h-4 text-orange-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600';
      case 'High': return 'text-orange-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  // Pagination logic
  const totalActivities = activities.length;
  const totalPages = Math.ceil(totalActivities / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedActivities = activities.slice(startIndex, endIndex);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        <Clock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
      </div>
      
      <div className="space-y-4">
        {loading ? (
          <p className="text-center text-gray-500 dark:text-gray-400">Loading recent activity...</p>
        ) : error ? (
          <p className="text-center text-red-500 dark:text-red-400">{error}</p>
        ) : (
          displayedActivities.map((item) => (
            <div key={item.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(item.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.user}</p>
                  <span className={`text-xs font-medium ${getSeverityColor(item.severity)}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{item.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{formatTimeAgo(item.timestamp)}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            {startIndex + 1}-{Math.min(endIndex, totalActivities)} of {totalActivities}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            >
              Prev
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
        <button className="w-full px-4 py-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
          View All Activity
        </button>
      </div>
    </div>
  );
};