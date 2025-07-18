import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Notification, Toast, NotificationSettings } from '../types';

interface NotificationContextType {
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  
  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (settings: Partial<NotificationSettings>) => void;
  
  // Loading state
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  
  // Utility functions
  clearDismissedAlerts?: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    // Load dismissed alerts from localStorage on initialization
    try {
      const stored = localStorage.getItem('dismissedAlerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [settings, setSettings] = useState<NotificationSettings>({
    emailEnabled: true,
    inAppEnabled: true,
    criticalOnly: false,
    categories: {
      security: true,
      system: true,
      user: true,
      policy: true,
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00',
    },
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Save dismissed alerts to localStorage
  const saveDismissedAlerts = (alertIds: Set<string>) => {
    try {
      localStorage.setItem('dismissedAlerts', JSON.stringify([...alertIds]));
    } catch (error) {
      console.error('Failed to save dismissed alerts:', error);
    }
  };

  // Clear dismissed alerts (useful for testing or reset)
  const clearDismissedAlerts = () => {
    setDismissedAlerts(new Set());
    localStorage.removeItem('dismissedAlerts');
    refreshNotifications(); // Refresh to show previously dismissed alerts
  };

  // Clean up old dismissed alerts periodically (keep only last 100)
  const cleanupDismissedAlerts = () => {
    if (dismissedAlerts.size > 100) {
      const alertArray = [...dismissedAlerts];
      const recent = new Set(alertArray.slice(-50)); // Keep only the 50 most recent
      setDismissedAlerts(recent);
      saveDismissedAlerts(recent);
    }
  };

  // Fetch notifications from the server
  const refreshNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch notifications from the notifications API, not dashboard alerts
      const response = await fetch('/api/notifications?limit=20', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Use actual notifications from the API
        const apiNotifications: Notification[] = data.notifications.map((notification: any) => ({
          id: notification.id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.timestamp,
          read: notification.read,
          priority: notification.priority,
          category: notification.category,
          actionUrl: notification.action_url,
          employeeId: notification.employee_id,
          violationId: notification.violation_id
        }));
        
        // Replace existing notifications with fresh data from server
        setNotifications(apiNotifications);
      } else {
        // Fallback to dashboard alerts only if notifications API fails
        console.warn('Notifications API failed, falling back to dashboard alerts');
        const alertResponse = await fetch('/api/dashboard/alerts', {
          credentials: 'include'
        });
        
        if (alertResponse.ok) {
          const alertData = await alertResponse.json();
          const alertNotifications: Notification[] = alertData.alerts
            .map((alert: any, index: number) => ({
              id: `alert-${alert.id || index}`,
              type: alert.type === 'critical' ? 'critical' : alert.type === 'warning' ? 'warning' : 'info',
              title: alert.title,
              message: alert.message,
              timestamp: new Date().toISOString(),
              read: false,
              priority: alert.priority || 'medium',
              category: 'security' as const
            }))
            .filter((notification: Notification) => !dismissedAlerts.has(notification.id)); // Filter out dismissed alerts
          
          // Only add new alert notifications, preserve existing ones
          setNotifications(prev => {
            const existingAlertIds = prev.filter(n => n.id.startsWith('alert-')).map(n => n.id);
            const newAlerts = alertNotifications.filter(n => !existingAlertIds.includes(n.id));
            return [...newAlerts, ...prev.filter(n => !n.id.startsWith('alert-'))].slice(0, 50);
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    refreshNotifications();
    cleanupDismissedAlerts(); // Clean up old dismissed alerts on load
    
    // Set up polling for new notifications every 30 seconds
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Notification actions
  const markAsRead = async (id: string) => {
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );

    // Update on server (for real notifications, not alert fallbacks)
    if (!id.startsWith('alert-')) {
      try {
        await fetch(`/api/notifications/${id}/read`, {
          method: 'PUT',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // Revert optimistic update on error
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, read: false } : n)
        );
      }
    }
  };

  const markAllAsRead = async () => {
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );

    // Update on server
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PUT',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // Refresh notifications on error
      refreshNotifications();
    }
  };

  const removeNotification = async (id: string) => {
    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== id));

    // Handle alert dismissals
    if (id.startsWith('alert-')) {
      // Add to dismissed alerts and persist to localStorage
      setDismissedAlerts(prev => {
        const newDismissed = new Set(prev);
        newDismissed.add(id);
        saveDismissedAlerts(newDismissed);
        return newDismissed;
      });
    } else {
      // Delete real notifications on server
      try {
        await fetch(`/api/notifications/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (error) {
        console.error('Failed to delete notification:', error);
        // Refresh notifications on error to restore proper state
        refreshNotifications();
      }
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  };

  // Toast actions
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = {
      ...toast,
      id: Date.now().toString(),
      duration: toast.duration || 5000,
    };
    
    setToasts(prev => [...prev, newToast]);

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(newToast.id);
    }, newToast.duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    toasts,
    addToast,
    removeToast,
    settings,
    updateSettings,
    loading,
    refreshNotifications,
    clearDismissedAlerts, // Expose for testing/debugging
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 