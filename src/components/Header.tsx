import React, { useState } from 'react';
import { Bell, User, Menu, LogOut, Settings, MessageCircle, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { SecurityChatbot } from './SecurityChatbot';
import { NotificationCenter } from './NotificationCenter';

interface HeaderProps {
  onToggleSidebar?: () => void;
  user?: any;
  onLogout?: () => void;
  onPageChange?: (page: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, user, onLogout, onPageChange }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    if (onPageChange) {
      onPageChange('user-settings');
    }
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <div className="w-full py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Mobile hamburger menu - far left */}
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          {/* Spacer for desktop when no hamburger menu */}
          <div className="hidden lg:block"></div>
          
          {/* Right side icons */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Notification Center */}
            <NotificationCenter />
            
            {/* AI Chat Button */}
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <User className="w-5 h-5" />
                {user && (
                  <span className="hidden sm:block text-sm font-medium">
                    {user.name || user.email}
                  </span>
                )}
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.email}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      {user?.role}
                    </p>
                  </div>
                  <div className="p-1">
                    <button 
                      onClick={handleSettingsClick}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay to close user menu */}
      {showUserMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowUserMenu(false)}
        />
      )}

      {/* AI Chat Modal */}
      {showAIChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl h-96 relative">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Security Assistant
              </h3>
              <button
                onClick={() => setShowAIChat(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 h-full">
              <SecurityChatbot />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};