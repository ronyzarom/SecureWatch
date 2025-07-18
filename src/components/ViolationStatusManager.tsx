import React, { useState } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  Bot, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';
import { ViolationStatusBadge } from './ViolationStatusBadge';

interface ViolationStatusManagerProps {
  violation: {
    id: number;
    status: 'Active' | 'Investigating' | 'False Positive' | 'Resolved';
    aiValidationStatus?: string;
    aiValidationScore?: number;
  };
  onStatusChange: (violationId: number, newStatus: string, reason: string) => Promise<void>;
  onAIValidate?: (violationId: number, additionalContext?: string) => Promise<void>;
  canEdit?: boolean;
}

export const ViolationStatusManager: React.FC<ViolationStatusManagerProps> = ({
  violation,
  onStatusChange,
  onAIValidate,
  canEdit = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(violation.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiValidating, setAiValidating] = useState(false);
  const [aiContext, setAiContext] = useState('');
  const [showAiModal, setShowAiModal] = useState(false);

  const statusOptions = [
    { value: 'Active', label: 'Active', icon: AlertTriangle, color: 'text-red-600' },
    { value: 'Investigating', label: 'Investigating', icon: Clock, color: 'text-orange-600' },
    { value: 'False Positive', label: 'False Positive', icon: XCircle, color: 'text-gray-600' },
    { value: 'Resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600' }
  ];

  const handleSave = async () => {
    console.log('🔧 Debug: handleSave called with:', { violationId: violation.id, selectedStatus, reason });
    
    if (!reason.trim()) {
      alert('Please provide a reason for the status change');
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 Debug: Calling onStatusChange...');
      await onStatusChange(violation.id, selectedStatus, reason);
      console.log('🔧 Debug: onStatusChange completed successfully');
      setIsEditing(false);
      setReason('');
    } catch (error) {
      console.error('❌ Debug: Failed to update status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(violation.status);
    setReason('');
    setIsEditing(false);
  };

  const handleAIValidation = async () => {
    if (!onAIValidate) {
      console.error('❌ onAIValidate function is not available');
      alert('AI validation function is not available. Please refresh the page and try again.');
      return;
    }

    setAiValidating(true);
    try {
      console.log('🤖 Starting AI validation for violation:', violation.id);
      await onAIValidate(violation.id, aiContext);
      console.log('✅ AI validation request completed');
      setShowAiModal(false);
      setAiContext('');
    } catch (error) {
      console.error('❌ Failed to trigger AI validation:', error);
      alert('Failed to start AI validation. Please try again.');
    } finally {
      setAiValidating(false);
    }
  };

  const getAIValidationColor = (status: string) => {
    switch (status) {
      case 'validated': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'manual_override': return 'text-gray-600';
      default: return 'text-orange-600';
    }
  };

  if (!canEdit) {
    return (
      <div className="flex items-center space-x-2">
        <ViolationStatusBadge status={violation.status} />
        {violation.aiValidationStatus && violation.aiValidationScore && (
          <div className="flex items-center space-x-1 text-sm">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className={getAIValidationColor(violation.aiValidationStatus)}>
              AI: {violation.aiValidationScore}%
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Display/Edit */}
      <div className="flex items-center space-x-2">
        {!isEditing ? (
          <>
            <ViolationStatusBadge status={violation.status} />
            <button
              onClick={() => {
                console.log('🔧 Debug: Edit button clicked for violation', violation.id);
                setIsEditing(true);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              title="Change status"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {statusOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                );
              })}
            </select>
            <button
              onClick={() => {
                console.log('🔧 Debug: Save button clicked for violation', violation.id, 'New status:', selectedStatus);
                handleSave();
              }}
              disabled={loading || selectedStatus === violation.status}
              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors disabled:opacity-50"
              title="Save changes"
            >
              <Save className="w-4 h-4" />
            </button>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* AI Validation Badge */}
        {violation.aiValidationStatus && violation.aiValidationScore && (
          <div className="flex items-center space-x-1 text-sm">
            <Bot className="w-4 h-4 text-blue-500" />
            <span className={getAIValidationColor(violation.aiValidationStatus)}>
              AI: {violation.aiValidationScore}%
            </span>
          </div>
        )}

        {/* AI Validation */}
        {onAIValidate && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAiModal(true)}
              disabled={aiValidating}
              className="flex items-center space-x-1 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-md transition-colors disabled:opacity-50"
              title="Request AI validation of evidence"
            >
              <Bot className="w-4 h-4" />
              <span>{aiValidating ? 'Validating...' : 'AI Validate'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Reason Input (when editing) */}
      {isEditing && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason for status change *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you're changing the status..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
        </div>
      )}

      {/* AI Validation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-2 mb-4">
              <Bot className="w-6 h-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Evidence Validation
              </h3>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The AI will analyze this violation's evidence to determine if it's a legitimate security concern or a false positive.
            </p>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Additional Context (Optional)
              </label>
              <textarea
                value={aiContext}
                onChange={(e) => setAiContext(e.target.value)}
                placeholder="Provide any additional context that might help with the analysis..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 dark:hover:text-gray-200 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAIValidation}
                disabled={aiValidating}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
              >
                <Bot className="w-4 h-4" />
                <span>{aiValidating ? 'Processing...' : 'Start Validation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 