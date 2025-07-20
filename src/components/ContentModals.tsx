import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  Upload, 
  Eye, 
  BookOpen, 
  Clock, 
  Brain, 
  Sparkles, 
  Download,
  Play,
  Settings,
  Copy,
  Share2,
  Archive,
  Trash2
} from 'lucide-react';

interface TrainingContent {
  id: number;
  title: string;
  description: string;
  content_type: string;
  applicable_regulations: string[];
  compliance_level: string;
  ai_generated: boolean;
  estimated_duration_minutes: number;
  view_count: number;
  completion_count: number;
  average_rating: number;
  status: string;
  content_data?: any;
  file_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

interface ContentForm {
  title: string;
  description: string;
  content_type: string;
  applicable_regulations: string[];
  compliance_level: string;
  estimated_duration_minutes: number;
  status: string;
  content_data: string;
  tags: string[];
  difficulty_level: number;
  learning_objectives: string[];
  prerequisites: string[];
  assessment_type: string;
  passing_score: number;
}

interface ContentModalsProps {
  showCreateModal: boolean;
  showEditModal: boolean;
  showPreviewModal: boolean;
  showAIGenerationModal: boolean;
  showUploadModal: boolean;
  showAnalyticsModal: boolean;
  showSettingsModal: boolean;
  selectedContent: TrainingContent | null;
  contentForm: ContentForm;
  regulations: string[];
  onCloseCreateModal: () => void;
  onCloseEditModal: () => void;
  onClosePreviewModal: () => void;
  onCloseAIGenerationModal: () => void;
  onCloseUploadModal: () => void;
  onCloseAnalyticsModal: () => void;
  onCloseSettingsModal: () => void;
  onFormChange: (field: string, value: any) => void;
  onSaveContent: () => void;
  onGenerateAIContent: (prompt: any) => void;
  onUploadContent: (file: File) => void;
  onUpdateContentSettings: (settings: any) => void;
}

export const ContentModals: React.FC<ContentModalsProps> = ({
  showCreateModal,
  showEditModal,
  showPreviewModal,
  showAIGenerationModal,
  showUploadModal,
  showAnalyticsModal,
  showSettingsModal,
  selectedContent,
  contentForm,
  regulations,
  onCloseCreateModal,
  onCloseEditModal,
  onClosePreviewModal,
  onCloseAIGenerationModal,
  onCloseUploadModal,
  onCloseAnalyticsModal,
  onCloseSettingsModal,
  onFormChange,
  onSaveContent,
  onGenerateAIContent,
  onUploadContent,
  onUpdateContentSettings
}) => {
  const [aiPrompt, setAiPrompt] = useState({
    regulation: 'gdpr',
    content_type: 'overview',
    target_audience: 'all_employees',
    difficulty_level: 1,
    estimated_duration: 30,
    include_quiz: true,
    learning_objectives: '',
    custom_prompt: ''
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Create/Edit Content Modal
  const ContentFormModal = ({ isEdit }: { isEdit: boolean }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit ? 'Edit Training Content' : 'Create Training Content'}
            </h2>
            <button 
              onClick={isEdit ? onCloseEditModal : onCloseCreateModal}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Title</label>
                <input
                  type="text"
                  value={contentForm.title}
                  onChange={(e) => onFormChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter content title"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={contentForm.description}
                  onChange={(e) => onFormChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter content description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <select
                  value={contentForm.content_type}
                  onChange={(e) => onFormChange('content_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="interactive">Interactive Module</option>
                  <option value="quiz">Quiz/Assessment</option>
                  <option value="presentation">Presentation</option>
                  <option value="webinar">Webinar</option>
                  <option value="simulation">Simulation</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={contentForm.status}
                  onChange={(e) => onFormChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="review">Under Review</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  value={contentForm.estimated_duration_minutes}
                  onChange={(e) => onFormChange('estimated_duration_minutes', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                <select
                  value={contentForm.difficulty_level}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Compliance Level</label>
                <select
                  value={contentForm.compliance_level}
                  onChange={(e) => onFormChange('compliance_level', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
                <select
                  value={contentForm.assessment_type}
                  onChange={(e) => onFormChange('assessment_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">No Assessment</option>
                  <option value="quiz">Quiz</option>
                  <option value="assignment">Assignment</option>
                  <option value="practical">Practical Exercise</option>
                  <option value="certification">Certification Exam</option>
                </select>
              </div>
            </div>

            {/* Regulations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Applicable Regulations</label>
              <div className="grid grid-cols-2 gap-2">
                {regulations.map(reg => (
                  <label key={reg} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contentForm.applicable_regulations.includes(reg)}
                      onChange={(e) => {
                        const updatedRegs = e.target.checked
                          ? [...contentForm.applicable_regulations, reg]
                          : contentForm.applicable_regulations.filter(r => r !== reg);
                        onFormChange('applicable_regulations', updatedRegs);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{reg.toUpperCase()}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Learning Objectives */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objectives</label>
              <textarea
                value={contentForm.learning_objectives.join('\n')}
                onChange={(e) => onFormChange('learning_objectives', e.target.value.split('\n').filter(obj => obj.trim()))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter learning objectives (one per line)"
              />
            </div>

            {/* Prerequisites */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prerequisites</label>
              <textarea
                value={contentForm.prerequisites.join('\n')}
                onChange={(e) => onFormChange('prerequisites', e.target.value.split('\n').filter(req => req.trim()))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter prerequisites (one per line)"
              />
            </div>

            {/* Content Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content Body</label>
              <textarea
                value={contentForm.content_data}
                onChange={(e) => onFormChange('content_data', e.target.value)}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter the main content..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={contentForm.tags.join(', ')}
                onChange={(e) => onFormChange('tags', e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter tags separated by commas"
              />
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
              onClick={onSaveContent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEdit ? 'Update Content' : 'Create Content'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // AI Content Generation Modal
  const AIGenerationModal = () => (
    showAIGenerationModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Brain className="w-6 h-6 text-purple-600 mr-2" />
              AI Content Generation
            </h2>
            <button onClick={onCloseAIGenerationModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Regulation</label>
                <select
                  value={aiPrompt.regulation}
                  onChange={(e) => setAiPrompt({...aiPrompt, regulation: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  {regulations.map(reg => (
                    <option key={reg} value={reg}>{reg.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content Type</label>
                <select
                  value={aiPrompt.content_type}
                  onChange={(e) => setAiPrompt({...aiPrompt, content_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="overview">Overview</option>
                  <option value="detailed">Detailed Guide</option>
                  <option value="checklist">Checklist</option>
                  <option value="case_study">Case Study</option>
                  <option value="best_practices">Best Practices</option>
                  <option value="policy">Policy Document</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                <select
                  value={aiPrompt.target_audience}
                  onChange={(e) => setAiPrompt({...aiPrompt, target_audience: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all_employees">All Employees</option>
                  <option value="managers">Managers</option>
                  <option value="it_staff">IT Staff</option>
                  <option value="executives">Executives</option>
                  <option value="new_hires">New Hires</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
                <select
                  value={aiPrompt.difficulty_level}
                  onChange={(e) => setAiPrompt({...aiPrompt, difficulty_level: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value={1}>Beginner</option>
                  <option value={2}>Intermediate</option>
                  <option value={3}>Advanced</option>
                  <option value={4}>Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (minutes)</label>
              <input
                type="number"
                value={aiPrompt.estimated_duration}
                onChange={(e) => setAiPrompt({...aiPrompt, estimated_duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                min="5"
                max="240"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objectives</label>
              <textarea
                value={aiPrompt.learning_objectives}
                onChange={(e) => setAiPrompt({...aiPrompt, learning_objectives: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Describe what learners should achieve..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Instructions (Optional)</label>
              <textarea
                value={aiPrompt.custom_prompt}
                onChange={(e) => setAiPrompt({...aiPrompt, custom_prompt: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Additional instructions for AI generation..."
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={aiPrompt.include_quiz}
                onChange={(e) => setAiPrompt({...aiPrompt, include_quiz: e.target.checked})}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Include Quiz/Assessment</label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCloseAIGenerationModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onGenerateAIContent(aiPrompt)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Brain className="w-4 h-4 mr-2" />
              Generate Content
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Content Preview Modal
  const PreviewModal = () => (
    showPreviewModal && selectedContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Eye className="w-6 h-6 text-blue-600 mr-2" />
                Content Preview
              </h2>
              <button onClick={onClosePreviewModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Content Header */}
              <div className="border-b border-gray-200 pb-4">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedContent.title}</h1>
                <p className="text-gray-600 mb-4">{selectedContent.description}</p>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-gray-400 mr-1" />
                    <span>{selectedContent.content_type}</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 text-gray-400 mr-1" />
                    <span>{selectedContent.estimated_duration_minutes} minutes</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 text-gray-400 mr-1" />
                    <span>{selectedContent.view_count} views</span>
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="prose max-w-none">
                <style jsx>{`
                  .training-content {
                    font-family: system-ui, -apple-system, sans-serif;
                    line-height: 1.6;
                    color: #374151;
                  }
                  .training-content h1 {
                    color: #1f2937;
                    font-size: 1.875rem;
                    font-weight: 700;
                    margin-bottom: 1rem;
                    border-bottom: 3px solid #3b82f6;
                    padding-bottom: 0.5rem;
                  }
                  .training-content h2 {
                    color: #374151;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 1.5rem 0 1rem 0;
                  }
                  .training-content h3 {
                    color: #4b5563;
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin: 1rem 0 0.5rem 0;
                  }
                  .training-content ul, .training-content ol {
                    margin: 1rem 0;
                    padding-left: 1.5rem;
                  }
                  .training-content li {
                    margin: 0.5rem 0;
                  }
                  .best-practices {
                    display: grid;
                    gap: 1rem;
                    margin: 1.5rem 0;
                  }
                  .practice-item {
                    background: #f9fafb;
                    border-left: 4px solid #3b82f6;
                    padding: 1rem;
                    border-radius: 0 0.5rem 0.5rem 0;
                  }
                  .interactive-section {
                    background: #eff6ff;
                    border: 1px solid #dbeafe;
                    border-radius: 0.5rem;
                    padding: 1.5rem;
                    margin: 1.5rem 0;
                  }
                  .checklist {
                    background: #f0fdf4;
                    border: 1px solid #bbf7d0;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                  }
                  .checklist li {
                    list-style: none;
                    padding: 0.25rem 0;
                  }
                  .completion-note {
                    background: #fef3c7;
                    border: 1px solid #fbbf24;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1.5rem 0;
                    font-style: italic;
                  }
                  .video-placeholder {
                    background: #f9fafb !important;
                    border: 2px dashed #d1d5db !important;
                    color: #6b7280 !important;
                  }
                  .quiz-info {
                    background: #f0f9ff;
                    border: 1px solid #bae6fd;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                  }
                  .sample-question {
                    background: #fefce8;
                    border: 1px solid #fde047;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    margin: 1rem 0;
                  }
                `}</style>
                {selectedContent.content_data ? (
                  selectedContent.content_type === 'html' || selectedContent.content_data.includes('<') ? (
                    <div 
                      className="content-preview"
                      dangerouslySetInnerHTML={{ __html: selectedContent.content_data }}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap">{selectedContent.content_data}</div>
                  )
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8">
                    <div className="text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">Content preview not available</p>
                      <p className="text-sm">This content may need to be generated or uploaded.</p>
                      <div className="mt-4 text-left bg-white p-4 rounded border">
                        <h3 className="font-semibold text-gray-700 mb-2">Content Information:</h3>
                        <ul className="text-sm space-y-1">
                          <li><strong>Type:</strong> {selectedContent.content_type}</li>
                          <li><strong>Duration:</strong> {Number(selectedContent.estimated_duration_minutes || 0)} minutes</li>
                          <li><strong>Status:</strong> {selectedContent.status}</li>
                          {selectedContent.applicable_regulations && selectedContent.applicable_regulations.length > 0 && (
                            <li><strong>Regulations:</strong> {selectedContent.applicable_regulations.join(', ')}</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Media */}
              {selectedContent.content_type === 'video' && selectedContent.file_url && (
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-center h-64 bg-gray-200 rounded">
                    <Play className="w-16 h-16 text-gray-400" />
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-2">Video Player</p>
                </div>
              )}

              {/* Content Actions */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      selectedContent.status === 'published' ? 'bg-green-100 text-green-800' :
                      selectedContent.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedContent.status}
                    </span>
                    {selectedContent.ai_generated && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        AI Generated
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                      <Download className="w-4 h-4 mr-1 inline" />
                      Download
                    </button>
                    <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
                      <Settings className="w-4 h-4 mr-1 inline" />
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  );

  // File Upload Modal
  const UploadModal = () => (
    showUploadModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Upload className="w-6 h-6 text-green-600 mr-2" />
              Upload Content
            </h2>
            <button onClick={onCloseUploadModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
            onDragOver={(e) => {e.preventDefault(); setDragOver(true);}}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) {
                setUploadedFile(files[0]);
              }
            }}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Drag and drop your file here, or</p>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadedFile(e.target.files[0]);
                }
              }}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.avi,.mov"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse Files
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Supported formats: PDF, DOC, DOCX, PPT, PPTX, MP4, AVI, MOV
            </p>
          </div>

          {uploadedFile && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-gray-400 mr-2" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                </div>
                <button
                  onClick={() => setUploadedFile(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onCloseUploadModal}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => uploadedFile && onUploadContent(uploadedFile)}
              disabled={!uploadedFile}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Upload Content
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Analytics Modal
  const AnalyticsModal = () => (
    showAnalyticsModal && selectedContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Content Analytics</h2>
            <button onClick={onCloseAnalyticsModal} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{selectedContent.title}</h3>
              <p className="text-gray-600">{selectedContent.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedContent.view_count}</div>
                <div className="text-sm text-blue-600">Total Views</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{selectedContent.completion_count}</div>
                <div className="text-sm text-green-600">Completions</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{selectedContent.average_rating}/5</div>
                <div className="text-sm text-purple-600">Average Rating</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Usage Over Time</h4>
              <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">Chart placeholder</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onCloseAnalyticsModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  );

  // Content Settings Modal
  const SettingsModal = () => (
    showSettingsModal && selectedContent && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Settings className="w-6 h-6 text-gray-600 mr-2" />
                Content Settings
              </h2>
              <button onClick={onCloseSettingsModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Content Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Content Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Title:</span>
                    <p className="font-medium">{selectedContent.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium">{selectedContent.content_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className="font-medium">{selectedContent.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <p className="font-medium">{selectedContent.estimated_duration_minutes} minutes</p>
                  </div>
                </div>
              </div>

              {/* Access & Visibility Settings */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Access & Visibility</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Content Status
                    </label>
                    <select 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      defaultValue={selectedContent.status}
                    >
                      <option value="draft">Draft</option>
                      <option value="review">Under Review</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        defaultChecked={selectedContent.status === 'published'}
                      />
                      <span className="text-sm text-gray-700">Make content publicly visible</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        defaultChecked={false}
                      />
                      <span className="text-sm text-gray-700">Require completion tracking</span>
                    </label>
                  </div>

                  <div>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        className="mr-2"
                        defaultChecked={true}
                      />
                      <span className="text-sm text-gray-700">Allow content downloads</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Content Management */}
              <div>
                <h3 className="font-medium text-gray-900 mb-4">Content Management</h3>
                <div className="space-y-3">
                  <button className="w-full text-left px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
                    <div className="flex items-center">
                      <Copy className="w-4 h-4 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-blue-900">Duplicate Content</p>
                        <p className="text-sm text-blue-700">Create a copy of this content</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                    <div className="flex items-center">
                      <Share2 className="w-4 h-4 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-green-900">Share Content</p>
                        <p className="text-sm text-green-700">Generate sharing link or export content</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors">
                    <div className="flex items-center">
                      <Archive className="w-4 h-4 text-yellow-600 mr-3" />
                      <div>
                        <p className="font-medium text-yellow-900">Archive Content</p>
                        <p className="text-sm text-yellow-700">Move content to archive</p>
                      </div>
                    </div>
                  </button>

                  <button className="w-full text-left px-4 py-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                    <div className="flex items-center">
                      <Trash2 className="w-4 h-4 text-red-600 mr-3" />
                      <div>
                        <p className="font-medium text-red-900">Delete Content</p>
                        <p className="text-sm text-red-700">Permanently remove this content</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Version Information */}
              {selectedContent.version && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Version Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Current Version:</span>
                        <p className="font-medium">v{selectedContent.version || '1.0'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Updated:</span>
                        <p className="font-medium">{selectedContent.updated_at || 'Recently'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={onCloseSettingsModal}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Save settings logic would go here
                  alert('Settings saved successfully!');
                  onCloseSettingsModal();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  );

  return (
    <>
      {showCreateModal && <ContentFormModal isEdit={false} />}
      {showEditModal && <ContentFormModal isEdit={true} />}
      <PreviewModal />
      <AIGenerationModal />
      <UploadModal />
      <AnalyticsModal />
      <SettingsModal />
    </>
  );
}; 