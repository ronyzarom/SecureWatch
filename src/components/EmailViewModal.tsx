import React, { useState, useEffect } from 'react';
import { X, Mail, Clock, User, Users, AlertTriangle, FileText } from 'lucide-react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { HTMLViewer } from './HTMLViewer';

interface EmailViewModalProps {
  emailId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface EmailData {
  id: number;
  messageId: string;
  subject: string;
  sender: {
    email: string;
    name: string;
    department?: string;
  };
  recipients: any[];
  bodyText: string;
  bodyHtml: string;
  sentAt: string;
  riskScore: number;
  riskFlags: any;
  category: string;
  isFlagged: boolean;
  attachments?: any[];
}

export const EmailViewModal: React.FC<EmailViewModalProps> = ({ emailId, isOpen, onClose }) => {
  const [email, setEmail] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  // Determine if the email has HTML content, even if bodyHtml is empty
  const htmlContent = email?.bodyHtml && email.bodyHtml.trim().length > 0
    ? email.bodyHtml
    : email?.bodyText || '';
  const isHtmlContent = /<\/?[a-z][\s\S]*>/i.test(htmlContent);

  const fetchEmail = async () => {
    if (!emailId || !isOpen) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/emails/message/${encodeURIComponent(emailId)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Email not found');
        }
        throw new Error('Failed to fetch email');
      }
      
      const emailData = await response.json();
      setEmail(emailData);
    } catch (err) {
      console.error('Failed to fetch email:', err);
      setError(err instanceof Error ? err.message : 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmail();
  }, [emailId, isOpen]);

  // Automatically switch to HTML view when HTML content is detected on first load
  useEffect(() => {
    if (email) {
      const hasHtml = /<\/?[a-z][\s\S]*>/i.test(htmlContent);
      if (hasHtml && !showHtml) {
        setShowHtml(true);
      }
    }
    // We intentionally exclude showHtml from deps to avoid toggling back after user interaction
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  const getRiskColor = (score: number) => {
    if (score >= 90) return 'text-red-600 bg-red-100';
    if (score >= 70) return 'text-orange-600 bg-orange-100';
    if (score >= 50) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Evidence</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="large" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading email...</span>
            </div>
          )}

          {error && (
            <ErrorMessage
              title="Failed to load email"
              message={error}
              onRetry={fetchEmail}
            />
          )}

          {email && (
            <div className="space-y-6">
              {/* Email Header */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {email.subject || 'No Subject'}
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">From:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {email.sender.name ? `${email.sender.name} <${email.sender.email}>` : email.sender.email}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">To:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {Array.isArray(email.recipients) ? email.recipients.join(', ') : 'Multiple recipients'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-700 dark:text-gray-300">Sent:</span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {formatTimeAgo(email.sentAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Risk Score Badge */}
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(email.riskScore)}`}>
                    Risk: {email.riskScore}%
                  </div>
                </div>

                {/* Risk Flags */}
                {email.isFlagged && (
                  <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span className="text-red-800 dark:text-red-200 font-medium">This email was flagged as {email.category}</span>
                  </div>
                )}

                {/* Attachments */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-200 font-medium">
                        {email.attachments.length} Attachment(s)
                      </span>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      {email.attachments.map((attachment: any, index: number) => (
                        <div key={index}>{attachment.name || `Attachment ${index + 1}`}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Email Body */}
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <h4 className="font-medium text-gray-900 dark:text-white">Email Content</h4>
                  {isHtmlContent && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowHtml(false)}
                        className={`px-3 py-1 text-sm rounded ${!showHtml ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}
                      >
                        Text
                      </button>
                      <button
                        onClick={() => setShowHtml(true)}
                        className={`px-3 py-1 text-sm rounded ${showHtml ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'}`}
                      >
                        HTML
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="p-4 max-h-96 overflow-y-auto">
                  {showHtml && isHtmlContent ? (
                    <div className="w-full h-96">
                      <HTMLViewer htmlContent={htmlContent} />
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                      {email.bodyText || 'No text content available'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 