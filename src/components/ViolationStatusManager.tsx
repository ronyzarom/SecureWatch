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
  const [error, setError] = useState<string | null>(null);

  const statusOptions = [
    { value: 'Active', label: 'Active', icon: AlertTriangle, color: 'text-red-600' },
    { value: 'Investigating', label: 'Investigating', icon: Clock, color: 'text-orange-600' },
    { value: 'False Positive', label: 'False Positive', icon: XCircle, color: 'text-gray-600' },
    { value: 'Resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600' }
  ];

  const handleSave = async () => {
    console.log('🔧 Debug: handleSave called with:', { violationId: violation.id, selectedStatus, reason });
    
    // Clear any previous errors
    setError(null);
    
    if (!reason.trim()) {
      setError('Please provide a reason for the status change');
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 Debug: Calling onStatusChange...');
      await onStatusChange(violation.id, selectedStatus, reason);
      console.log('🔧 Debug: onStatusChange completed successfully');
      setIsEditing(false);
      setReason('');
      setError(null);
    } catch (error) {
      console.error('❌ Debug: Failed to update status:', error);
      setError('Failed to update status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(violation.status);
    setReason('');
    setIsEditing(false);
    setError(null);
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
                setError(null);
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
      </div>

      {/* Reason Input (when editing) */}
      {isEditing && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Reason for status change *
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null); // Clear error when user starts typing
            }}
            placeholder="Explain why you're changing the status..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={2}
          />
          {error && (
            <p className="text-red-500 text-xs mt-1">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}; 