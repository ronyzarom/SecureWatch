import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import SecureWatchLogoPng from '../assets/SecureWatchLogo.png';
import { authAPI } from '../services/api';
import { MFAVerificationModal } from './MFAVerificationModal';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // MFA states
  const [showMFAModal, setShowMFAModal] = useState(false);
  const [mfaUserEmail, setMfaUserEmail] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authAPI.login(email, password);
      
      // Check if MFA is required
      if (response.mfaRequired) {
        setMfaUserEmail(response.email);
        setShowMFAModal(true);
        setLoading(false);
      } else {
        // Normal login successful
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const handleMFAVerification = async (code: string) => {
    setMfaLoading(true);
    setMfaError(null);
    
    try {
      const response = await fetch('/api/auth/complete-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'MFA verification failed');
      }

      // MFA verification successful
      setShowMFAModal(false);
      onLoginSuccess(data.user);
    } catch (err: any) {
      setMfaError(err.message || 'Verification failed');
      throw err; // Re-throw to let the modal handle the error display
    } finally {
      setMfaLoading(false);
    }
  };

  const handleMFACancel = () => {
    setShowMFAModal(false);
    setMfaUserEmail('');
    setMfaError(null);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src={SecureWatchLogoPng} 
                alt="SecureWatch Logo" 
                className="w-16 h-16 drop-shadow-lg"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">SecureWatch</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Sign in to your account</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              For demo purposes: admin@company.com / admin123
            </p>
          </div>
        </div>
      </div>

      {/* MFA Verification Modal */}
      <MFAVerificationModal
        isOpen={showMFAModal}
        userEmail={mfaUserEmail}
        onVerify={handleMFAVerification}
        onCancel={handleMFACancel}
        loading={mfaLoading}
        error={mfaError}
      />
    </div>
  );
}; 