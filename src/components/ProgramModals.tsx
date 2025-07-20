import React from 'react';
import { X, Users, Shield, Clock, Settings } from 'lucide-react';

interface TrainingProgram {
  id: number;
  name: string;
  description: string;
  program_type: string;
  applicable_regulations: string[];
  is_mandatory: boolean;
  total_duration_minutes: number;
  difficulty_level: number;
  target_departments: string[];
  target_roles: string[];
  is_active: boolean;
  total_assignments?: number;
  completion_rate?: number;
  average_score?: number;
  completed_assignments?: number;
}

interface ProgramForm {
  name: string;
  description: string;
  program_type: string;
  applicable_regulations: string[];
  is_mandatory: boolean;
  total_duration_minutes: number;
  difficulty_level: number;
  target_departments: string[];
  target_roles: string[];
  is_active: boolean;
}

interface ProgramModalsProps {
  showCreateModal: boolean;
  showEditModal: boolean;
  showAssignmentModal: boolean;
  showDetailsModal: boolean;
  selectedProgram: TrainingProgram | null;
  programForm: ProgramForm;
  regulations: string[];
  onCloseCreateModal: () => void;
  onCloseEditModal: () => void;
  onCloseAssignmentModal: () => void;
  onCloseDetailsModal: () => void;
  onFormChange: (field: string, value: any) => void;
  onSaveProgram: () => void;
  onAssignProgram: () => void;
}

export const ProgramModals: React.FC<ProgramModalsProps> = ({
  showCreateModal,
  showEditModal,
  showAssignmentModal,
  showDetailsModal,
  selectedProgram,
  programForm,
  regulations,
  onCloseCreateModal,
  onCloseEditModal,
  onCloseAssignmentModal,
  onCloseDetailsModal,
  onFormChange,
  onSaveProgram,
  onAssignProgram
}) => {
  // Create/Edit Program Modal
  const ProgramFormModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Training Program' : 'Create Training Program'}
          </h2>
          <button 
            onClick={isEdit ? onCloseEditModal : onCloseCreateModal}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program Name</label>
            <input
              type="text"
              value={programForm.name}
              onChange={(e) => onFormChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter program name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={programForm.description}
              onChange={(e) => onFormChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter program description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Program Type</label>
              <select
                value={programForm.program_type}
                onChange={(e) => onFormChange('program_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="compliance">Compliance</option>
                <option value="skills">Skills Development</option>
                <option value="onboarding">Onboarding</option>
                <option value="certification">Certification</option>
                <option value="security">Security</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input
                type="number"
                value={programForm.total_duration_minutes}
                onChange={(e) => onFormChange('total_duration_minutes', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
            <select
              value={programForm.difficulty_level}
              onChange={(e) => onFormChange('difficulty_level', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>Beginner</option>
              <option value={2}>Intermediate</option>
              <option value={3}>Advanced</option>
              <option value={4}>Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Applicable Regulations</label>
            <div className="grid grid-cols-2 gap-2">
              {regulations.map(reg => (
                <label key={reg} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={programForm.applicable_regulations.includes(reg)}
                    onChange={(e) => {
                      const updatedRegs = e.target.checked
                        ? [...programForm.applicable_regulations, reg]
                        : programForm.applicable_regulations.filter(r => r !== reg);
                      onFormChange('applicable_regulations', updatedRegs);
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">{reg.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Departments</label>
            <input
              type="text"
              value={programForm.target_departments.join(', ')}
              onChange={(e) => onFormChange('target_departments', e.target.value.split(',').map(d => d.trim()).filter(d => d))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="IT, Finance, HR (comma separated)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Roles</label>
            <input
              type="text"
              value={programForm.target_roles.join(', ')}
              onChange={(e) => onFormChange('target_roles', e.target.value.split(',').map(r => r.trim()).filter(r => r))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Manager, Analyst, Developer (comma separated)"
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={programForm.is_mandatory}
                onChange={(e) => onFormChange('is_mandatory', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Mandatory Program</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={programForm.is_active}
                onChange={(e) => onFormChange('is_active', e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>
        </form>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={isEdit ? onCloseEditModal : onCloseCreateModal}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSaveProgram}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isEdit ? 'Update Program' : 'Create Program'}
          </button>
        </div>
      </div>
    </div>
  );

  // Assignment Modal
  const AssignmentModal = () => (
    showAssignmentModal && selectedProgram && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Assign Training Program</h2>
            <button onClick={onCloseAssignmentModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-4">
            <h3 className="font-medium text-gray-900 mb-2">{selectedProgram.name}</h3>
            <p className="text-sm text-gray-600">{selectedProgram.description}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assignment Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Individual Employees</option>
                <option>Department(s)</option>
                <option>Role(s)</option>
                <option>All Employees</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>Normal</option>
                <option>High</option>
                <option>Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Optional assignment notes..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCloseAssignmentModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onAssignProgram}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Assign Program
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Program Details Modal
  const DetailsModal = () => (
    showDetailsModal && selectedProgram && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Program Details</h2>
            <button onClick={onCloseDetailsModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">{selectedProgram.name}</h3>
              <p className="text-gray-600 mb-4">{selectedProgram.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">{selectedProgram.total_duration_minutes} minutes</span>
                </div>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    Difficulty: Level {selectedProgram.difficulty_level}
                  </span>
                </div>
              </div>
            </div>

            {/* Status and Regulations */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Status & Regulations</h4>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  selectedProgram.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedProgram.is_active ? 'Active' : 'Inactive'}
                </span>
                {selectedProgram.is_mandatory && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                    Mandatory
                  </span>
                )}
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedProgram.program_type}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedProgram.applicable_regulations.map(reg => (
                  <span key={reg} className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {reg.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Analytics */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Performance Analytics</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedProgram.total_assignments || 0}</div>
                  <div className="text-xs text-blue-600">Total Enrolled</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedProgram.completion_rate || 0}%</div>
                  <div className="text-xs text-green-600">Completion Rate</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedProgram.average_score || 0}%</div>
                  <div className="text-xs text-purple-600">Average Score</div>
                </div>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Target Audience</h4>
              <div className="space-y-2">
                {selectedProgram.target_departments.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Departments: </span>
                    <span className="text-sm text-gray-600">{selectedProgram.target_departments.join(', ')}</span>
                  </div>
                )}
                {selectedProgram.target_roles.length > 0 && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Roles: </span>
                    <span className="text-sm text-gray-600">{selectedProgram.target_roles.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onCloseDetailsModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  );

  return (
    <>
      {showCreateModal && <ProgramFormModal isEdit={false} />}
      {showEditModal && <ProgramFormModal isEdit={true} />}
      <AssignmentModal />
      <DetailsModal />
    </>
  );
}; 