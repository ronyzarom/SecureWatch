import React, { useState } from 'react';
import { User, Shield, Key, Eye, EyeOff, X, CheckCircle, AlertCircle } from 'lucide-react';
import { MFASettings } from '../components/MFASettings';

interface UserSettingsPageProps {
  user?: {
    name?: string;
    email?: string;
    role?: string;
    department?: string;
  };
}

export const UserSettingsPage: React.FC<UserSettingsPageProps> = ({ user }) => {
  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handlePasswordChange = async () => {
    setPasswordError(null);
    
    // Validation
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }, 2000);

    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError(error instanceof Error ? error.message : 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowPasswordModal(false);
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError(null);
    setPasswordSuccess(false);
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your account security and preferences
            </p>
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Security Settings
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Password Section */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <div className="flex items-center space-x-3 mb-4">
                <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Password
                </h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Change your account password to keep your account secure.
              </p>
              <button 
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Change Password
              </button>
            </div>

            {/* MFA Section */}
            <MFASettings />
          </div>
        </div>
      </div>

      {/* Account Information Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Account Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <input
              type="text"
              value={user?.name || 'Not provided'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={user?.email || 'Not provided'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <input
              type="text"
              value={user?.role || 'Not assigned'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Department
            </label>
            <input
              type="text"
              value={user?.department || 'Not assigned'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Change Password
              </h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {passwordSuccess ? (
                <div className="flex items-center space-x-3 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span>Password changed successfully!</span>
                </div>
              ) : (
                <>
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter new password (min 8 characters)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Error Message */}
                  {passwordError && (
                    <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5" />
                      <span className="text-sm">{passwordError}</span>
                    </div>
                  )}

                  {/* Password Requirements */}
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>Password requirements:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>At least 8 characters long</li>
                      <li>Different from current password</li>
                    </ul>
                  </div>
                </>
              )}
            </div>

            {!passwordSuccess && (
              <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}; 