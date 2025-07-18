import React, { useState, useEffect } from 'react';
import { Shield, Clock, RefreshCw, AlertTriangle, Mail } from 'lucide-react';

interface MFAVerificationModalProps {
  isOpen: boolean;
  userEmail: string;
  onVerify: (code: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export const MFAVerificationModal: React.FC<MFAVerificationModalProps> = ({
  isOpen,
  userEmail,
  onVerify,
  onCancel,
  loading = false,
  error = null
}) => {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes default

  useEffect(() => {
    if (isOpen) {
      setCode('');
      setLocalError(null);
      setTimeRemaining(600); // Reset to 10 minutes when modal opens
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isOpen && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setLocalError('Verification code has expired. Please request a new one.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOpen, timeRemaining]);

  useEffect(() => {
    let cooldownInterval: NodeJS.Timeout | null = null;
    
    if (resendCooldown > 0) {
      cooldownInterval = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }

    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval);
    };
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      setLocalError('Please enter a 6-digit verification code');
      return;
    }

    setLocalError(null);
    
    try {
      await onVerify(code);
    } catch (err: any) {
      setLocalError(err.message || 'Verification failed');
    }
  };

  const handleResendCode = async () => {
    try {
      setResendLoading(true);
      setLocalError(null);
      
      const response = await fetch('/api/mfa/send-login-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend code');
      }

      setResendCooldown(60); // 1 minute cooldown
      setTimeRemaining(600); // Reset timer to 10 minutes
      setCode(''); // Clear existing code
    } catch (err: any) {
      setLocalError(err.message || 'Failed to resend verification code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setCode(numericValue);
    
    // Clear error when user starts typing
    if (localError) setLocalError(null);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const displayError = error || localError;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verify Your Identity
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              We've sent a verification code to
            </p>
            <p className="text-blue-600 dark:text-blue-400 font-medium">
              {userEmail}
            </p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center space-x-2 mb-4 text-sm">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className={`font-medium ${
              timeRemaining < 60 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
            }`}>
              Code expires in {formatTime(timeRemaining)}
            </span>
          </div>

          {/* Error Message */}
          {displayError && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <p className="text-red-700 dark:text-red-300 text-sm">{displayError}</p>
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-center text-xl font-mono tracking-widest"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
                disabled={loading || timeRemaining === 0}
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || code.length !== 6 || timeRemaining === 0}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify & Sign In'
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-3 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Didn't receive the code?
            </p>
            <button
              onClick={handleResendCode}
              disabled={resendLoading || resendCooldown > 0 || timeRemaining === 0}
              className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Resend in {resendCooldown}s</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Resend Code</span>
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Security tip:</strong> Never share your verification code with anyone. 
              SecureWatch will never ask for your code via phone or email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 