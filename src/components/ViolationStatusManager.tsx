import React, { useState } from 'react';
import { 
  Edit3, 
  Save, 
  X, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  XCircle
} from 'lucide-react';
import { ViolationStatusBadge } from './ViolationStatusBadge';

interface ViolationStatusManagerProps {
  violation: {
    id: number;
    status: 'Active' | 'Investigating' | 'False Positive' | 'Resolved';
  };
  onStatusChange: (violationId: number, newStatus: string, reason: string) => Promise<void>;
}

export const ViolationStatusManager: React.FC<ViolationStatusManagerProps> = ({
  violation,
  onStatusChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(violation.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'Active', label: 'Active', icon: AlertTriangle, color: 'text-red-600' },
    { value: 'Investigating', label: 'Investigating', icon: Clock, color: 'text-orange-600' },
    { value: 'False Positive', label: 'False Positive', icon: XCircle, color: 'text-gray-600' },
    { value: 'Resolved', label: 'Resolved', icon: CheckCircle, color: 'text-green-600' }
  ];

  const handleSave = async () => {
    console.log('🔧 Debug: handleSave called with:', { violationId: violation.id, selectedStatus, reason });
    
    if (!reason.trim()) {
      alert('Please provide a reason for the status change.');
      return;
    }

    if (selectedStatus === violation.status) {
      setIsEditing(false);
      setReason('');
      return;
    }

    setLoading(true);
    try {
      console.log('🔧 Debug: Calling onStatusChange...');
      await onStatusChange(violation.id, selectedStatus, reason);
      console.log('🔧 Debug: onStatusChange completed successfully');
      
      setIsEditing(false);
      setReason('');
      
      console.log('🔧 Debug: Status change UI completed');
    } catch (error) {
      console.error('❌ Debug: Error in handleSave:', error);
      // Error is already handled by the parent component
      // Reset to previous status
      setSelectedStatus(violation.status);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(violation.status);
    setReason('');
    setIsEditing(false);
  };

  return (
    <div className="space-y-3">
      {/* Status Display and Edit Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ViolationStatusBadge status={violation.status} />
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center space-x-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-md transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Status</span>
          </button>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={loading || !reason.trim()}
              className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-500 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Selection (when editing) */}
      {isEditing && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select new status *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value as any)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md border transition-colors ${
                    selectedStatus === option.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <IconComponent className={`w-4 h-4 ${option.color}`} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
    </div>
  );
}; 