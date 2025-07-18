import React, { useState, useEffect } from 'react';
import { Shield, Mail, Check, X, AlertTriangle, Clock, Key } from 'lucide-react';

interface MFAStatus {
  mfaEnabled: boolean;
  mfaLastUsed: string | null;
  stats: {
    codesVerified30Days: number;
    failedAttempts30Days: number;
  };
}

interface MFASettingsProps {
  className?: string;
}

export const MFASettings: React.FC<MFASettingsProps> = ({ className = "" }) => {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // MFA setup states
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [setupStep, setSetupStep] = useState<'send' | 'verify'>('send');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<number | null>(null);
  
  // MFA disable states
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (codeExpiry) {
      interval = setInterval(() => {
        const remaining = Math.max(0, codeExpiry - Date.now());
        if (remaining <= 0) {
          setCodeExpiry(null);
          setSetupStep('send');
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [codeExpiry]);

  const fetchMFAStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mfa/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch MFA status');
      }
      
      const data = await response.json();
      setMfaStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load MFA status');
    } finally {
      setLoading(false);
    }
  };

  const sendSetupCode = async () => {
    try {
      setSetupLoading(true);
      setError(null);
      
      const response = await fetch('/api/mfa/setup/send-code', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send setup code');
      }
      
      setSetupStep('verify');
      setCodeExpiry(Date.now() + (data.expiresInMinutes * 60 * 1000));
      setSuccess('Verification code sent to your email');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSetupLoading(false);
    }
  };

  const verifySetupCode = async () => {
    try {
      setSetupLoading(true);
      setError(null);
      
      const response = await fetch('/api/mfa/setup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code: verificationCode })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify code');
      }
      
      setSuccess('MFA enabled successfully!');
      setShowSetupModal(false);
      setVerificationCode('');
      setCodeExpiry(null);
      setSetupStep('send');
      await fetchMFAStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to enable MFA');
    } finally {
      setSetupLoading(false);
    }
  };

  const disableMFA = async () => {
    try {
      setDisableLoading(true);
      setError(null);
      
      const response = await fetch('/api/mfa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ password: disablePassword })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable MFA');
      }
      
      setSuccess('MFA disabled successfully');
      setShowDisableModal(false);
      setDisablePassword('');
      await fetchMFAStatus();
    } catch (err: any) {
      setError(err.message || 'Failed to disable MFA');
    } finally {
      setDisableLoading(false);
    }
  };

  const sendTestEmail = async () => {
    try {
      setTestLoading(true);
      setError(null);
      
      const response = await fetch('/api/mfa/test-email', {
        method: 'POST',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }
      
      setSuccess('Test email sent successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return 'Never';
    return new Date(lastUsed).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getExpiryMinutes = () => {
    if (!codeExpiry) return 0;
    return Math.ceil((codeExpiry - Date.now()) / 60000);
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multi-Factor Authentication
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
              <p className="text-green-700 dark:text-green-300 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* MFA Status */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900 dark:text-white">Status</h4>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              mfaStatus?.mfaEnabled 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {mfaStatus?.mfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Last Used</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatLastUsed(mfaStatus?.mfaLastUsed || null)}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Codes Verified (30d)</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {mfaStatus?.stats.codesVerified30Days || 0}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Failed Attempts (30d)</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {mfaStatus?.stats.failedAttempts30Days || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!mfaStatus?.mfaEnabled ? (
            <button
              onClick={() => setShowSetupModal(true)}
              disabled={setupLoading}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Key className="w-4 h-4" />
              <span>{setupLoading ? 'Setting up...' : 'Enable MFA'}</span>
            </button>
          ) : (
            <>
              <button
                onClick={sendTestEmail}
                disabled={testLoading}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                <span>{testLoading ? 'Sending...' : 'Test Email'}</span>
              </button>
              <button
                onClick={() => setShowDisableModal(true)}
                disabled={disableLoading}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
                <span>{disableLoading ? 'Disabling...' : 'Disable MFA'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Enable Multi-Factor Authentication
              </h3>

              {setupStep === 'send' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    We'll send a verification code to your email address to confirm your identity.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={sendSetupCode}
                      disabled={setupLoading}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {setupLoading ? 'Sending...' : 'Send Code'}
                    </button>
                    <button
                      onClick={() => setShowSetupModal(false)}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Enter the 6-digit verification code sent to your email.
                  </p>
                  
                  {codeExpiry && (
                    <div className="flex items-center space-x-2 text-sm text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>Code expires in {getExpiryMinutes()} minutes</span>
                    </div>
                  )}

                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-lg font-mono tracking-widest"
                    maxLength={6}
                  />

                  <div className="flex space-x-3">
                    <button
                      onClick={verifySetupCode}
                      disabled={setupLoading || verificationCode.length !== 6}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {setupLoading ? 'Verifying...' : 'Enable MFA'}
                    </button>
                    <button
                      onClick={() => {
                        setShowSetupModal(false);
                        setSetupStep('send');
                        setVerificationCode('');
                        setCodeExpiry(null);
                      }}
                      className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                  </div>

                  <button
                    onClick={sendSetupCode}
                    disabled={setupLoading}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                  >
                    Resend Code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Disable Multi-Factor Authentication
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Enter your current password to disable MFA.
              </p>

              <input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:bg-gray-700 dark:text-white mb-4"
              />

              <div className="flex space-x-3">
                <button
                  onClick={disableMFA}
                  disabled={disableLoading || !disablePassword}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {disableLoading ? 'Disabling...' : 'Disable MFA'}
                </button>
                <button
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisablePassword('');
                  }}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 