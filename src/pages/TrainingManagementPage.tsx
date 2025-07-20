import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  Award, 
  TrendingUp, 
  Calendar,
  Filter,
  Search,
  Download,
  Settings,
  Brain,
  CheckCircle,
  Clock,
  AlertTriangle,
  Shield,
  FileText,
  Play,
  Eye,
  Star,
  X,
  Edit,
  UserCheck,
  Upload,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { ProgramModals } from '../components/ProgramModals';
import { ContentModals } from '../components/ContentModals';

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
  created_at: string;
  total_assignments?: number;
  completion_rate?: number;
  average_score?: number;
  completed_assignments?: number;
}

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
  content_data?: string;
  tags?: string[];
  difficulty_level?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  assessment_type?: string;
  passing_score?: number;
  file_url?: string;
  thumbnail_url?: string;
  created_at?: string;
  updated_at?: string;
  version?: number;
}

interface ComplianceRequirement {
  id: number;
  regulation_code: string;
  requirement_title: string;
  requirement_description: string;
  requirement_section: string;
  required_frequency: string;
  minimum_training_hours: number;
  requires_certification: boolean;
  minimum_passing_score: number;
  applies_to_departments: string[];
  applies_to_roles: string[];
  is_active: boolean;
}

interface TrainingStats {
  completion_rate: number;
  total_assignments: number;
  compliance_coverage: number;
}

const TrainingManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [content, setContent] = useState<TrainingContent[]>([]);
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegulation, setFilterRegulation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Content-specific filters
  const [contentTypeFilter, setContentTypeFilter] = useState('');
  const [contentStatusFilter, setContentStatusFilter] = useState('');

  // Modal states for enhanced functionality
  const [showCreateProgramModal, setShowCreateProgramModal] = useState(false);
  const [showEditProgramModal, setShowEditProgramModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showProgramDetailsModal, setShowProgramDetailsModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<TrainingProgram | null>(null);
  const [programForm, setProgramForm] = useState({
    name: '',
    description: '',
    program_type: 'compliance',
    applicable_regulations: [] as string[],
    is_mandatory: false,
    total_duration_minutes: 30,
    difficulty_level: 1,
    target_departments: [] as string[],
    target_roles: [] as string[],
    is_active: true
  });

  // Content modal states
  const [showCreateContentModal, setShowCreateContentModal] = useState(false);
  const [showEditContentModal, setShowEditContentModal] = useState(false);
  const [showPreviewContentModal, setShowPreviewContentModal] = useState(false);
  const [showAIGenerationModal, setShowAIGenerationModal] = useState(false);
  const [showUploadContentModal, setShowUploadContentModal] = useState(false);
  const [showContentAnalyticsModal, setShowContentAnalyticsModal] = useState(false);
  const [showContentSettingsModal, setShowContentSettingsModal] = useState(false);
  const [selectedContent, setSelectedContent] = useState<TrainingContent | null>(null);
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    content_type: 'document',
    applicable_regulations: [] as string[],
    compliance_level: 'basic',
    estimated_duration_minutes: 30,
    status: 'draft',
    content_data: '',
    tags: [] as string[],
    difficulty_level: 1,
    learning_objectives: [] as string[],
    prerequisites: [] as string[],
    assessment_type: 'none',
    passing_score: 70
  });

  // Helper functions for styling
  const getContentTypeColor = (contentType: string) => {
    const colors: Record<string, string> = {
      document: 'bg-blue-500',
      video: 'bg-red-500',
      interactive: 'bg-green-500',
      quiz: 'bg-purple-500',
      presentation: 'bg-orange-500',
      webinar: 'bg-indigo-500'
    };
    return colors[contentType] || 'bg-gray-500';
  };

  const getContentTypeIcon = (contentType: string) => {
    const icons: Record<string, JSX.Element> = {
      document: <FileText className="w-4 h-4 text-blue-500" />,
      video: <Play className="w-4 h-4 text-red-500" />,
      interactive: <Users className="w-4 h-4 text-green-500" />,
      quiz: <BookOpen className="w-4 h-4 text-purple-500" />,
      presentation: <FileText className="w-4 h-4 text-orange-500" />,
      webinar: <Users className="w-4 h-4 text-indigo-500" />
    };
    return icons[contentType] || <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-100 text-yellow-800',
      review: 'bg-orange-100 text-orange-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      draft: '✏️',
      review: '👀',
      published: '✅',
      archived: '📦'
    };
    return icons[status] || '❓';
  };

  const getRegulationColor = (regulation: string) => {
    const colors: Record<string, string> = {
      gdpr: 'bg-blue-100 text-blue-800',
      hipaa: 'bg-green-100 text-green-800',
      pci_dss: 'bg-purple-100 text-purple-800',
      sox: 'bg-red-100 text-red-800',
      ccpa: 'bg-yellow-100 text-yellow-800'
    };
    return colors[regulation.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getRegulationIcon = (regulation: string) => {
    const icons: Record<string, string> = {
      gdpr: '🇪🇺',
      hipaa: '🏥',
      pci_dss: '💳',
      sox: '📊',
      ccpa: '🏛️'
    };
    return icons[regulation.toLowerCase()] || '📋';
  };

  // Generate sample content for preview when content_data is missing
  const getSampleContent = (title: string, contentType: string) => {
    const contentMap: Record<string, Record<string, string>> = {
      'Password Security Best Practices': {
        interactive: `<div class="training-content">
          <h1>🔐 Password Security Best Practices</h1>
          <p>Strong passwords are your first line of defense against unauthorized access. This interactive module will teach you essential password security principles.</p>
          
          <h2>🎯 Key Learning Objectives</h2>
          <ul>
            <li>Understand the importance of strong, unique passwords</li>
            <li>Learn how to create memorable yet secure passwords</li>
            <li>Discover password management tools and techniques</li>
            <li>Implement multi-factor authentication</li>
          </ul>

          <h2>📚 Best Practices</h2>
          <div class="best-practices">
            <div class="practice-item">
              <h3>✅ Use Unique Passwords</h3>
              <p>Every account should have a different password. Reusing passwords puts all your accounts at risk if one is compromised.</p>
            </div>
            
            <div class="practice-item">
              <h3>✅ Enable Two-Factor Authentication</h3>
              <p>Add an extra layer of security with 2FA whenever possible. This significantly reduces the risk of unauthorized access.</p>
            </div>
            
            <div class="practice-item">
              <h3>✅ Use a Password Manager</h3>
              <p>Password managers generate and store complex passwords securely, so you only need to remember one master password.</p>
            </div>
            
            <div class="practice-item">
              <h3>❌ Avoid Common Passwords</h3>
              <p>Never use passwords like "password123", your name, or common dictionary words. These are easily guessed by attackers.</p>
            </div>
          </div>

          <h2>🧪 Interactive Exercise</h2>
          <div class="interactive-section">
            <p><strong>Try This:</strong> Create a strong password using the following techniques:</p>
            <ol>
              <li>Start with a memorable phrase: "I love coffee in the morning"</li>
              <li>Use first letters: "Ilcitm"</li>
              <li>Add numbers and symbols: "Ilcitm@2024!"</li>
              <li>Result: A strong, memorable password</li>
            </ol>
          </div>

          <h2>📋 Quick Checklist</h2>
          <ul class="checklist">
            <li>☐ Review all your current passwords</li>
            <li>☐ Install a reputable password manager</li>
            <li>☐ Enable 2FA on all important accounts</li>
            <li>☐ Update weak passwords immediately</li>
          </ul>

          <div class="completion-note">
            <p><em>Remember: Security is a journey, not a destination. Regular password updates and security awareness are key to staying protected.</em></p>
          </div>
        </div>`,
        document: `# Password Security Best Practices

Strong passwords are your first line of defense against cyber threats. This comprehensive guide covers everything you need to know about creating and managing secure passwords.

## Why Password Security Matters

Every day, millions of passwords are compromised through data breaches, phishing attacks, and brute force attempts. A weak password is like leaving your front door unlocked.

## Creating Strong Passwords

### The Foundation Rules
1. **Length**: Use at least 12 characters
2. **Complexity**: Mix uppercase, lowercase, numbers, and symbols  
3. **Uniqueness**: Each account needs its own password
4. **Unpredictability**: Avoid personal information and common patterns

### Password Creation Techniques
- **Passphrase Method**: "Coffee!Morning$Energy2024"
- **Acronym Method**: "ILove2DrinkCoffeeInTheMorning!" → "IL2DCitM!"
- **Pattern Substitution**: Replace letters with numbers/symbols

## Password Management

### Use a Password Manager
- **LastPass**, **1Password**, **Bitwarden** are popular options
- Generate complex passwords automatically
- Store passwords securely with encryption
- Sync across all your devices

### Multi-Factor Authentication (MFA)
- Add an extra layer beyond passwords
- Use authenticator apps like Google Authenticator
- Enable on all critical accounts (email, banking, work)

## Common Mistakes to Avoid

❌ Using personal information (birthdays, names)
❌ Reusing passwords across multiple sites  
❌ Sharing passwords via email or text
❌ Using simple patterns (password123, qwerty)
❌ Storing passwords in browsers without protection

## Action Items

✅ Audit your current passwords
✅ Install a password manager
✅ Enable MFA on critical accounts
✅ Update weak passwords immediately
✅ Train your team on these practices

Remember: A few minutes spent on password security can save you hours of recovery time if you're compromised.`
      },
      'Phishing Awareness Training': {
        interactive: `<div class="training-content">
          <h1>🎣 Phishing Awareness Training</h1>
          <p>Learn to identify and defend against phishing attacks - one of the most common cybersecurity threats.</p>
          
          <h2>🚨 What is Phishing?</h2>
          <p>Phishing is a cybercrime where attackers impersonate legitimate organizations to steal sensitive information like passwords, credit card numbers, or personal data.</p>
          
          <h2>🔍 Types of Phishing Attacks</h2>
          <div class="best-practices">
            <div class="practice-item">
              <h3>📧 Email Phishing</h3>
              <p>Fraudulent emails that appear to be from trusted sources asking for sensitive information or containing malicious links.</p>
            </div>
            
            <div class="practice-item">
              <h3>📱 SMS Phishing (Smishing)</h3>
              <p>Text messages containing suspicious links or requests for personal information.</p>
            </div>
            
            <div class="practice-item">
              <h3>📞 Voice Phishing (Vishing)</h3>
              <p>Phone calls where attackers impersonate legitimate organizations to extract information.</p>
            </div>
            
            <div class="practice-item">
              <h3>🌐 Website Phishing</h3>
              <p>Fake websites that look identical to legitimate ones, designed to capture login credentials.</p>
            </div>
          </div>

          <h2>🛡️ How to Protect Yourself</h2>
          <div class="interactive-section">
            <ol>
              <li><strong>Verify the sender:</strong> Check email addresses and phone numbers carefully</li>
              <li><strong>Look for urgency tactics:</strong> Be suspicious of "act now" or "urgent" messages</li>
              <li><strong>Check URLs:</strong> Hover over links to see where they actually lead</li>
              <li><strong>Use official channels:</strong> Contact organizations directly using known contact information</li>
              <li><strong>Trust your instincts:</strong> If something feels off, it probably is</li>
            </ol>
          </div>

          <h2>🚩 Red Flags to Watch For</h2>
          <ul class="checklist">
            <li>❌ Poor grammar and spelling errors</li>
            <li>❌ Generic greetings ("Dear Customer")</li>
            <li>❌ Urgent threats or deadlines</li>
            <li>❌ Requests for sensitive information via email</li>
            <li>❌ Suspicious email addresses or URLs</li>
            <li>❌ Unexpected attachments</li>
          </ul>
        </div>`,
        document: `# Phishing Awareness Training Guide

## Understanding Phishing Attacks

Phishing attacks are among the most successful cybercrime techniques, responsible for 90% of data breaches. Understanding how they work is your first line of defense.

## Common Phishing Scenarios

### Banking Phishing
- Fake emails claiming account suspension
- Requests to "verify" account information
- Counterfeit banking websites

### IT Support Phishing  
- Fake IT helpdesk calls requesting passwords
- Emails about "system updates" requiring login
- False security alerts requiring immediate action

### Social Media Phishing
- Fake login pages for social platforms
- Suspicious friend requests with malicious links
- Fake notifications about account issues

## Detection Techniques

### Email Analysis
1. **Sender verification**: Check the actual email address
2. **Content inspection**: Look for grammatical errors
3. **Link verification**: Hover without clicking to see destinations
4. **Attachment caution**: Be wary of unexpected files

### Website Verification
1. **URL inspection**: Look for misspellings or unusual domains
2. **Security indicators**: Check for SSL certificates (https://)
3. **Design consistency**: Compare with known legitimate sites

## Response Procedures

### If You Suspect Phishing:
1. **Don't click** any links or download attachments
2. **Report** the incident to your IT security team
3. **Delete** the suspicious message
4. **Warn** colleagues about the threat

### If You've Been Phished:
1. **Change passwords** immediately
2. **Contact IT security** team right away
3. **Monitor accounts** for suspicious activity
4. **Report** the incident following company procedures

## Best Practices

- Enable multi-factor authentication
- Keep software and browsers updated
- Use reputable antivirus software
- Regularly train and test employees
- Maintain incident response procedures

Remember: When in doubt, verify through official channels!`
      },
      'Data Protection Fundamentals': {
        interactive: `<div class="training-content">
          <h1>🛡️ Data Protection Fundamentals</h1>
          <p>Learn essential principles for protecting sensitive information and maintaining privacy compliance.</p>
          
          <h2>📊 Types of Sensitive Data</h2>
          <div class="best-practices">
            <div class="practice-item">
              <h3>🏥 Personal Health Information (PHI)</h3>
              <p>Medical records, health insurance information, and any health-related data protected under HIPAA.</p>
            </div>
            
            <div class="practice-item">
              <h3>💳 Payment Card Information (PCI)</h3>
              <p>Credit card numbers, security codes, and payment processing data governed by PCI DSS standards.</p>
            </div>
            
            <div class="practice-item">
              <h3>👤 Personally Identifiable Information (PII)</h3>
              <p>Names, addresses, social security numbers, and other information that can identify individuals.</p>
            </div>
            
            <div class="practice-item">
              <h3>🏢 Proprietary Business Data</h3>
              <p>Trade secrets, customer lists, financial reports, and confidential business information.</p>
            </div>
          </div>

          <h2>🔒 Protection Strategies</h2>
          <div class="interactive-section">
            <h3>Technical Safeguards</h3>
            <ul>
              <li><strong>Encryption:</strong> Protect data in transit and at rest</li>
              <li><strong>Access Controls:</strong> Limit data access to authorized personnel only</li>
              <li><strong>Backup Systems:</strong> Ensure data recovery capabilities</li>
              <li><strong>Monitoring:</strong> Track data access and usage patterns</li>
            </ul>
            
            <h3>Administrative Safeguards</h3>
            <ul>
              <li><strong>Data Classification:</strong> Categorize data by sensitivity level</li>
              <li><strong>Privacy Policies:</strong> Establish clear data handling procedures</li>
              <li><strong>Training Programs:</strong> Educate staff on data protection</li>
              <li><strong>Incident Response:</strong> Prepare for data breach scenarios</li>
            </ul>
          </div>

          <h2>⚖️ Regulatory Compliance</h2>
          <ul class="checklist">
            <li>✅ GDPR (General Data Protection Regulation)</li>
            <li>✅ HIPAA (Health Insurance Portability and Accountability Act)</li>
            <li>✅ PCI DSS (Payment Card Industry Data Security Standard)</li>
            <li>✅ SOX (Sarbanes-Oxley Act)</li>
            <li>✅ CCPA (California Consumer Privacy Act)</li>
          </ul>
        </div>`
      }
    };

    // Get content for specific title, fallback to generic content
    if (contentMap[title] && contentMap[title][contentType]) {
      return contentMap[title][contentType];
    }

    // Generic fallback content based on type
    const genericContent: Record<string, string> = {
      interactive: `<div class="training-content">
        <h1>${title}</h1>
        <p>This is an interactive training module covering important security concepts.</p>
        <h2>Learning Objectives</h2>
        <ul>
          <li>Understand key security principles</li>
          <li>Apply best practices in your daily work</li>
          <li>Recognize potential security threats</li>
        </ul>
        <h2>Interactive Elements</h2>
        <p>This module includes hands-on exercises and real-world scenarios to reinforce learning.</p>
        <div class="note">
          <p><em>Note: This is sample content. The full interactive experience will be available once content is properly configured.</em></p>
        </div>
      </div>`,
      document: `# ${title}

This training document provides comprehensive coverage of essential security topics.

## Overview
This module covers important security concepts and best practices that every employee should understand.

## Key Topics
- Security fundamentals
- Risk identification and mitigation
- Compliance requirements
- Best practices implementation

## Learning Outcomes
By completing this training, you will be able to:
- Identify common security threats
- Apply appropriate security measures
- Maintain compliance with regulations
- Contribute to overall organizational security

*Note: This is sample content. Complete materials will be provided once content is fully configured.*`,
      video: `<div class="video-content">
        <h1>${title}</h1>
        <p>This video training covers essential security concepts through engaging visual content.</p>
        <div class="video-placeholder" style="background: #f0f0f0; padding: 40px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <p>🎥 Video content placeholder</p>
          <p>Duration: Approximately 20-30 minutes</p>
        </div>
        <h2>What You'll Learn</h2>
        <ul>
          <li>Visual demonstrations of security concepts</li>
          <li>Real-world case studies and examples</li>
          <li>Step-by-step implementation guides</li>
        </ul>
      </div>`,
      quiz: `<div class="quiz-content">
        <h1>${title}</h1>
        <p>Test your knowledge with this comprehensive assessment.</p>
        <div class="quiz-info">
          <h2>Assessment Details</h2>
          <ul>
            <li>Multiple choice and scenario-based questions</li>
            <li>Immediate feedback on answers</li>
            <li>Passing score: 80%</li>
            <li>Retakes allowed if needed</li>
          </ul>
        </div>
        <div class="sample-question">
          <h3>Sample Question:</h3>
          <p><strong>Which of the following is the strongest password?</strong></p>
          <p>A) password123<br>
          B) MyBirthday1990<br>
          C) Coffee!Morning$Energy2024<br>
          D) 12345678</p>
          <p><em>Answer: C - Uses length, complexity, and unpredictable patterns</em></p>
        </div>
      </div>`
    };

    return genericContent[contentType] || `<div class="training-content">
      <h1>${title}</h1>
      <p>Training content for ${title} is being prepared. Please check back soon for the complete learning materials.</p>
      <p><em>Content type: ${contentType}</em></p>
    </div>`;
  };

  // Data fetching
  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      
      const [programsRes, contentRes, requirementsRes, statsRes] = await Promise.all([
        fetch('/api/training/programs'),
        fetch('/api/training/content'),
        fetch('/api/training/compliance-requirements'),
        fetch('/api/training/stats')
      ]);

      if (programsRes.ok) {
        const programsData = await programsRes.json();
        setPrograms(programsData.programs || []);
      }

      if (contentRes.ok) {
        const contentData = await contentRes.json();
        // Add sample content for items missing content_data
        const enrichedContent = (contentData.content || []).map(item => ({
          ...item,
          content_data: item.content_data || getSampleContent(item.title, item.content_type)
        }));
        setContent(enrichedContent);
      }

      if (requirementsRes.ok) {
        const requirementsData = await requirementsRes.json();
        setRequirements(requirementsData.requirements || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }

    } catch (error) {
      console.error('Failed to fetch training data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, []);

  // Event handlers - all defined early to avoid hoisting issues
  const handleCreateProgram = () => {
    setShowCreateProgramModal(true);
    console.log('Create program modal opened');
  };

  const handleEditProgram = (programId: number) => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setSelectedProgram(program);
      setProgramForm({
        name: program.name,
        description: program.description,
        program_type: program.program_type,
        applicable_regulations: program.applicable_regulations,
        is_mandatory: program.is_mandatory,
        total_duration_minutes: program.total_duration_minutes,
        difficulty_level: program.difficulty_level,
        target_departments: program.target_departments,
        target_roles: program.target_roles,
        is_active: program.is_active
      });
      setShowEditProgramModal(true);
    }
    console.log('Edit program:', programId);
  };

  const handleProgramSettings = (programId: number) => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setSelectedProgram(program);
      setShowProgramDetailsModal(true);
    }
    console.log('Program settings:', programId);
  };

  const handleAssignProgram = (programId: number) => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setSelectedProgram(program);
      setShowAssignmentModal(true);
    }
    console.log('Assign program:', programId);
  };

  const handleSaveProgram = async () => {
    try {
      const endpoint = selectedProgram ? `/api/training/programs/${selectedProgram.id}` : '/api/training/programs';
      const method = selectedProgram ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(programForm)
      });

      if (response.ok) {
        console.log('Program saved successfully');
        await fetchTrainingData();
        setShowCreateProgramModal(false);
        setShowEditProgramModal(false);
        setProgramForm({
          name: '',
          description: '',
          program_type: 'compliance',
          applicable_regulations: [],
          is_mandatory: false,
          total_duration_minutes: 30,
          difficulty_level: 1,
          target_departments: [],
          target_roles: [],
          is_active: true
        });
        setSelectedProgram(null);
        alert('Program saved successfully!');
      } else {
        alert('Failed to save program. Check console for details.');
      }
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Error saving program. Check console for details.');
    }
  };

  const handleToggleProgramStatus = async (programId: number) => {
    try {
      const program = programs.find(p => p.id === programId);
      if (!program) return;

      const response = await fetch(`/api/training/programs/${programId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...program,
          is_active: !program.is_active
        })
      });

      if (response.ok) {
        await fetchTrainingData();
        alert(`Program ${program.is_active ? 'deactivated' : 'activated'} successfully!`);
      }
    } catch (error) {
      console.error('Error toggling program status:', error);
    }
  };

  const handleGenerateAIContent = async () => {
    console.log('Generate AI Content clicked');
    alert('Generating AI content... Check console for progress.');
    
    try {
      const response = await fetch('/api/training/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          regulation: 'gdpr',
          content_type: 'overview',
          target_audience: 'all_employees',
          difficulty_level: 1,
          estimated_duration: 30,
          include_quiz: true,
          category_id: 1
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('AI content generated successfully:', result);
        await fetchTrainingData();
        setActiveTab('content');
        alert('AI content generated successfully! Check the Content Library tab.');
      } else {
        console.error('Failed to generate AI content');
        alert('Failed to generate AI content. Check console for details.');
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      alert('Error generating AI content. Check console for details.');
    }
  };



  const handleExportReport = async (reportType: string) => {
    console.log('Export Report clicked:', reportType);
    alert(`Exporting ${reportType} report... Download will start automatically.`);
    
    try {
      const endpoint = reportType === 'completion' ? '/api/training/reports/completion' :
                     reportType === 'compliance' ? '/api/training/reports/compliance' :
                     '/api/training/reports/analytics';
      
      const response = await fetch(endpoint);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `training-${reportType}-report.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        alert('Report downloaded successfully!');
      } else {
        alert('Failed to download report. Check console for details.');
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Error downloading report. Check console for details.');
    }
  };

  const handleAssignTraining = () => {
    setActiveTab('programs');
    console.log('Assign training clicked');
    alert('Assign Training clicked! Training assignment interface will be implemented.');
  };

  const handleComplianceReview = () => {
    setActiveTab('compliance');
    console.log('Compliance review clicked');
    alert('Compliance Review clicked! Compliance monitoring dashboard will be implemented.');
  };

  // Content Management Handlers
  const handleCreateContent = () => {
    setShowCreateContentModal(true);
    console.log('Create content modal opened');
  };

  const handleEditContent = (contentId: number) => {
    const contentItem = content.find(c => c.id === contentId);
    if (contentItem) {
      setSelectedContent(contentItem);
      setContentForm({
        title: contentItem.title,
        description: contentItem.description,
        content_type: contentItem.content_type,
        applicable_regulations: contentItem.applicable_regulations,
        compliance_level: contentItem.compliance_level,
        estimated_duration_minutes: contentItem.estimated_duration_minutes,
        status: contentItem.status,
        content_data: contentItem.content_data || '',
        tags: contentItem.tags || [],
        difficulty_level: contentItem.difficulty_level || 1,
        learning_objectives: contentItem.learning_objectives || [],
        prerequisites: contentItem.prerequisites || [],
        assessment_type: contentItem.assessment_type || 'none',
        passing_score: contentItem.passing_score || 70
      });
      setShowEditContentModal(true);
    }
    console.log('Edit content:', contentId);
  };

  const handlePreviewContent = (contentId: number) => {
    const contentItem = content.find(c => c.id === contentId);
    if (contentItem) {
      setSelectedContent(contentItem);
      setShowPreviewContentModal(true);
    }
    console.log('Preview content:', contentId);
  };

  const handleContentAnalytics = (contentId: number) => {
    const contentItem = content.find(c => c.id === contentId);
    if (contentItem) {
      setSelectedContent(contentItem);
      setShowContentAnalyticsModal(true);
    }
    console.log('Content analytics:', contentId);
  };

  const handleContentSettings = (contentId: number) => {
    const contentItem = content.find(c => c.id === contentId);
    if (contentItem) {
      setSelectedContent(contentItem);
      setShowContentSettingsModal(true);
    }
    console.log('Content settings:', contentId);
  };

  const handleGenerateAIContentModal = () => {
    setShowAIGenerationModal(true);
    console.log('AI generation modal opened');
  };

  const handleUploadContent = () => {
    setShowUploadContentModal(true);
    console.log('Upload content modal opened');
  };

  const handleSaveContent = async () => {
    try {
      const endpoint = selectedContent ? `/api/training/content/${selectedContent.id}` : '/api/training/content';
      const method = selectedContent ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contentForm)
      });

      if (response.ok) {
        console.log('Content saved successfully');
        await fetchTrainingData();
        setShowCreateContentModal(false);
        setShowEditContentModal(false);
        setContentForm({
          title: '',
          description: '',
          content_type: 'document',
          applicable_regulations: [],
          compliance_level: 'basic',
          estimated_duration_minutes: 30,
          status: 'draft',
          content_data: '',
          tags: [],
          difficulty_level: 1,
          learning_objectives: [],
          prerequisites: [],
          assessment_type: 'none',
          passing_score: 70
        });
        setSelectedContent(null);
        alert('Content saved successfully!');
      } else {
        alert('Failed to save content. Check console for details.');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      alert('Error saving content. Check console for details.');
    }
  };

  const handleGenerateAIContentAction = async (prompt: any) => {
    try {
      console.log('Generating AI content with prompt:', prompt);
      
      const response = await fetch('/api/training/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prompt)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('AI content generated successfully:', result);
        
        // Pre-populate the content form with AI generated content
        setContentForm({
          title: result.title || `${prompt.regulation.toUpperCase()} ${prompt.content_type} Training`,
          description: result.description || '',
          content_type: prompt.content_type === 'overview' ? 'document' : prompt.content_type,
          applicable_regulations: [prompt.regulation],
          compliance_level: 'basic',
          estimated_duration_minutes: prompt.estimated_duration,
          status: 'draft',
          content_data: result.content || '',
          tags: result.tags || [prompt.regulation, prompt.target_audience],
          difficulty_level: prompt.difficulty_level,
          learning_objectives: result.learning_objectives || [],
          prerequisites: result.prerequisites || [],
          assessment_type: prompt.include_quiz ? 'quiz' : 'none',
          passing_score: 70
        });
        
        setShowAIGenerationModal(false);
        setShowCreateContentModal(true);
        
        alert('AI content generated successfully! Review and save the content.');
      } else {
        console.error('Failed to generate AI content');
        alert('Failed to generate AI content. Check console for details.');
      }
    } catch (error) {
      console.error('Error generating AI content:', error);
      alert('Error generating AI content. Check console for details.');
    }
  };

  const handleUploadContentFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content_type', file.type.includes('video') ? 'video' : 'document');
      
      const response = await fetch('/api/training/content/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Content uploaded successfully:', result);
        
        // Pre-populate form with uploaded file data
        setContentForm({
          title: file.name.replace(/\.[^/.]+$/, ""),
          description: `Uploaded ${file.type.includes('video') ? 'video' : 'document'} content`,
          content_type: file.type.includes('video') ? 'video' : 'document',
          applicable_regulations: [],
          compliance_level: 'basic',
          estimated_duration_minutes: 30,
          status: 'draft',
          content_data: result.content || '',
          tags: [],
          difficulty_level: 1,
          learning_objectives: [],
          prerequisites: [],
          assessment_type: 'none',
          passing_score: 70
        });
        
        setShowUploadContentModal(false);
        setShowCreateContentModal(true);
        
        alert('Content uploaded successfully! Complete the details and save.');
      } else {
        alert('Failed to upload content. Check console for details.');
      }
    } catch (error) {
      console.error('Error uploading content:', error);
      alert('Error uploading content. Check console for details.');
    }
  };

  // Modal close handlers
  const handleCloseCreateModal = () => {
    setShowCreateProgramModal(false);
    setProgramForm({
      name: '',
      description: '',
      program_type: 'compliance',
      applicable_regulations: [],
      is_mandatory: false,
      total_duration_minutes: 30,
      difficulty_level: 1,
      target_departments: [],
      target_roles: [],
      is_active: true
    });
  };

  const handleCloseEditModal = () => {
    setShowEditProgramModal(false);
    setSelectedProgram(null);
  };

  const handleCloseAssignmentModal = () => {
    setShowAssignmentModal(false);
    setSelectedProgram(null);
  };

  const handleCloseDetailsModal = () => {
    setShowProgramDetailsModal(false);
    setSelectedProgram(null);
  };

  // Form update handler
  const handleFormChange = (field: string, value: any) => {
    setProgramForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Assignment handler
  const handleAssignProgramAction = async () => {
    try {
      // This would call an API to assign the program
      console.log('Assigning program:', selectedProgram?.id);
      alert('Program assignment functionality will be implemented with employee selection.');
      setShowAssignmentModal(false);
      setSelectedProgram(null);
    } catch (error) {
      console.error('Error assigning program:', error);
    }
  };

  // Content Modal close handlers
  const handleCloseCreateContentModal = () => {
    setShowCreateContentModal(false);
    setContentForm({
      title: '',
      description: '',
      content_type: 'document',
      applicable_regulations: [],
      compliance_level: 'basic',
      estimated_duration_minutes: 30,
      status: 'draft',
      content_data: '',
      tags: [],
      difficulty_level: 1,
      learning_objectives: [],
      prerequisites: [],
      assessment_type: 'none',
      passing_score: 70
    });
  };

  const handleCloseEditContentModal = () => {
    setShowEditContentModal(false);
    setSelectedContent(null);
  };

  const handleClosePreviewContentModal = () => {
    setShowPreviewContentModal(false);
    setSelectedContent(null);
  };

  const handleCloseAIGenerationModal = () => {
    setShowAIGenerationModal(false);
  };

  const handleCloseUploadContentModal = () => {
    setShowUploadContentModal(false);
  };

  const handleCloseContentAnalyticsModal = () => {
    setShowContentAnalyticsModal(false);
    setSelectedContent(null);
  };

  const handleCloseContentSettingsModal = () => {
    setShowContentSettingsModal(false);
    setSelectedContent(null);
  };

  // Content form update handler
  const handleContentFormChange = (field: string, value: any) => {
    setContentForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Helper components
  const regulations = ['gdpr', 'sox', 'hipaa', 'pci_dss'];
  const regulationColors = {
    gdpr: 'bg-blue-100 text-blue-800',
    sox: 'bg-green-100 text-green-800',
    hipaa: 'bg-purple-100 text-purple-800',
    pci_dss: 'bg-orange-100 text-orange-800'
  };

  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const statusConfig = {
      'draft': { color: 'bg-gray-100 text-gray-800', icon: Clock },
      'review': { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      'published': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'archived': { color: 'bg-red-100 text-red-800', icon: Clock }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const RegulationBadge: React.FC<{ regulation: string }> = ({ regulation }) => (
    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
      regulationColors[regulation as keyof typeof regulationColors] || 'bg-gray-100 text-gray-800'
    }`}>
      <Shield className="w-3 h-3 mr-1" />
      {regulation.toUpperCase()}
    </span>
  );

  // Filtered data
  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         program.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegulation = filterRegulation === 'all' || 
                              program.applicable_regulations.includes(filterRegulation);
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && program.is_active) ||
                         (filterStatus === 'inactive' && !program.is_active) ||
                         (filterStatus === 'mandatory' && program.is_mandatory);
    return matchesSearch && matchesRegulation && matchesStatus;
  });

  const filteredContent = content.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegulation = filterRegulation === 'all' ||
                             item.applicable_regulations.includes(filterRegulation);
    const matchesType = !contentTypeFilter || item.content_type === contentTypeFilter;
    const matchesStatus = !contentStatusFilter || item.status === contentStatusFilter;
    return matchesSearch && matchesRegulation && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Training Management
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage training programs, content, and compliance requirements
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => handleExportReport('analytics')}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </button>
              <button 
                onClick={handleCreateProgram}
                className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Program
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'programs', label: 'Training Programs', icon: BookOpen },
              { id: 'content', label: 'Content Library', icon: Users },
              { id: 'compliance', label: 'Compliance Requirements', icon: Shield },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Training Programs</dt>
                      <dd className="text-lg font-medium text-gray-900">{programs.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Content Library</dt>
                      <dd className="text-lg font-medium text-gray-900">{content.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Compliance Reqs</dt>
                      <dd className="text-lg font-medium text-gray-900">{requirements.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Completion Rate</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats?.completion_rate || 0}%</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={handleGenerateAIContent}
                  className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Brain className="w-8 h-8 text-blue-600 mr-4" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Generate AI Content</p>
                    <p className="text-sm text-gray-600">Create training materials with AI</p>
                  </div>
                </button>

                <button 
                  onClick={handleAssignTraining}
                  className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <Users className="w-8 h-8 text-green-600 mr-4" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Assign Training</p>
                    <p className="text-sm text-gray-600">Assign programs to employees</p>
                  </div>
                </button>

                <button 
                  onClick={handleComplianceReview}
                  className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Shield className="w-8 h-8 text-purple-600 mr-4" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900">Compliance Review</p>
                    <p className="text-sm text-gray-600">Monitor compliance status</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div className="space-y-6">
            {/* Programs Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search programs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={filterRegulation}
                    onChange={(e) => setFilterRegulation(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Regulations</option>
                    {regulations.map(reg => (
                      <option key={reg} value={reg}>{reg.toUpperCase()}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="mandatory">Mandatory</option>
                  </select>
                </div>

                <button 
                  onClick={handleCreateProgram}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Program
                </button>
              </div>
            </div>

            {/* Programs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredPrograms.map((program) => (
                <div key={program.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{program.name}</h3>
                    <div className="flex space-x-2">
                      {program.is_mandatory && (
                        <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          Mandatory
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                        program.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {program.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{program.description}</p>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {program.total_duration_minutes} minutes
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {program.applicable_regulations.map((reg) => (
                        <RegulationBadge key={reg} regulation={reg} />
                      ))}
                    </div>

                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Enrolled:</span>
                        <span className="font-medium">{program.total_assignments || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completion:</span>
                        <span className="font-medium">{program.completion_rate || 0}%</span>
                      </div>
                      {program.average_score && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Avg Score:</span>
                          <span className="font-medium">{Number(program.average_score)}%</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-2">
                    <button 
                      onClick={() => handleEditProgram(program.id)}
                      className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleAssignProgram(program.id)}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Assign
                    </button>
                    <button 
                      onClick={() => handleToggleProgramStatus(program.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        program.is_active 
                          ? 'bg-red-100 text-red-800 hover:bg-red-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {program.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button 
                      onClick={() => handleProgramSettings(program.id)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredPrograms.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No training programs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {programs.length === 0 
                    ? "Get started by creating your first training program."
                    : "No programs match your current filters."}
                </p>
                <div className="mt-6">
                  <button 
                    onClick={handleCreateProgram}
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
                  >
                    Create Program
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content Library Tab */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Content Library Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">📚 Content Library</h2>
                  <p className="text-gray-600">Manage training materials, resources, and educational content</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleGenerateAIContentModal}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Content
                  </button>
                  <button
                    onClick={handleUploadContent}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </button>
                  <button
                    onClick={handleCreateContent}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2 rounded-lg flex items-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Content
                  </button>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search content..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    />
                  </div>
                </div>
                
                <select
                  value={filterRegulation}
                  onChange={(e) => setFilterRegulation(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                >
                  <option value="all">All Regulations</option>
                  <option value="gdpr">🇪🇺 GDPR</option>
                  <option value="hipaa">🏥 HIPAA</option>
                  <option value="pci_dss">💳 PCI DSS</option>
                  <option value="sox">📊 SOX</option>
                </select>

                <select
                  value={contentTypeFilter}
                  onChange={(e) => setContentTypeFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                >
                  <option value="">All Types</option>
                  <option value="document">📄 Documents</option>
                  <option value="video">🎥 Videos</option>
                  <option value="interactive">🎯 Interactive</option>
                  <option value="quiz">❓ Quizzes</option>
                  <option value="presentation">📊 Presentations</option>
                </select>

                <select
                  value={contentStatusFilter}
                  onChange={(e) => setContentStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all duration-200"
                >
                  <option value="">All Status</option>
                  <option value="draft">✏️ Draft</option>
                  <option value="review">👀 Review</option>
                  <option value="published">✅ Published</option>
                  <option value="archived">📦 Archived</option>
                </select>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContent.map((item) => (
                <div key={item.id} className="group bg-white rounded-xl shadow-sm hover:shadow-xl border border-gray-100 hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                  {/* Content Type Header */}
                  <div className={`h-2 ${getContentTypeColor(item.content_type)}`}></div>
                  
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getContentTypeIcon(item.content_type)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getContentTypeColor(item.content_type)} bg-opacity-20`}>
                            {item.content_type}
                          </span>
                          {item.ai_generated && (
                            <span className="px-2 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 rounded-full text-xs font-medium flex items-center">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI Generated
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2 group-hover:text-blue-600 transition-colors duration-200 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                      </div>
                      
                      <div className="ml-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)} {item.status}
                        </span>
                      </div>
                    </div>

                    {/* Content Metadata */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium">{Number(item.estimated_duration_minutes || 0)} minutes</span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {item.applicable_regulations.map((reg) => (
                          <span key={reg} className={`px-2 py-1 rounded-full text-xs font-medium ${getRegulationColor(reg)}`}>
                            {getRegulationIcon(reg)} {reg.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Eye className="w-4 h-4 text-blue-500 mr-1" />
                            <span className="font-bold text-gray-900 text-lg">{Number(item.view_count || 0)}</span>
                          </div>
                          <div className="text-gray-600 text-xs">Views</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                            <span className="font-bold text-gray-900 text-lg">{Number(item.completion_count || 0)}</span>
                          </div>
                          <div className="text-gray-600 text-xs">Completed</div>
                        </div>
                        <div>
                          <div className="flex items-center justify-center mb-1">
                            <Star className="w-4 h-4 text-yellow-500 mr-1" />
                            <span className="font-bold text-gray-900 text-lg">{Number(item.average_rating || 0).toFixed(1)}</span>
                          </div>
                          <div className="text-gray-600 text-xs">Rating</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEditContent(item.id)}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handlePreviewContent(item.id)}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                      </button>
                      <button
                        onClick={() => handleContentAnalytics(item.id)}
                        className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Analytics
                      </button>
                      <button
                        onClick={() => handleContentSettings(item.id)}
                        className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-all duration-200 shadow hover:shadow-md transform hover:-translate-y-0.5"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Compliance Requirements Tab */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* Compliance Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search requirements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <select
                    value={filterRegulation}
                    onChange={(e) => setFilterRegulation(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Regulations</option>
                    {regulations.map(reg => (
                      <option key={reg} value={reg}>{reg.toUpperCase()}</option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <button 
                  onClick={() => handleCreateProgram()} // Changed to create program for compliance
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 flex items-center"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Requirement
                </button>
              </div>
            </div>

            {/* Compliance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {requirements.map((req) => (
                <div key={req.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">{req.requirement_title}</h3>
                    <div className="flex space-x-2">
                      <StatusBadge status={req.is_active ? 'active' : 'inactive'} />
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{req.requirement_description}</p>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Shield className="w-4 h-4 mr-2" />
                      {req.applies_to_departments.length > 0 && req.applies_to_departments.length === 1
                        ? req.applies_to_departments[0]
                        : `${req.applies_to_departments.length} departments`}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {req.applies_to_roles.length > 0 && req.applies_to_roles.length === 1
                        ? req.applies_to_roles[0]
                        : `${req.applies_to_roles.length} roles`}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {req.minimum_training_hours} hours
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="w-4 h-4 mr-2" />
                      {req.minimum_passing_score}%
                    </div>
                  </div>

                  <div className="mt-6 flex space-x-2">
                    <button 
                      onClick={() => handleEditProgram(req.id)} // Assuming edit is for program settings
                      className="flex-1 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-medium hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleProgramSettings(req.id)} // Assuming settings is for program settings
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {requirements.length === 0 && (
              <div className="text-center py-12">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No compliance requirements</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {requirements.length === 0 
                    ? "Get started by adding your first compliance requirement."
                    : "No requirements match your current filters."}
                </p>
                <div className="mt-6">
                  <button 
                    onClick={() => handleCreateProgram()} // Changed to create program for compliance
                    className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
                  >
                    Create Requirement
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Analytics Dashboard
              </h3>
              <p className="text-gray-600">
                This tab is under construction. Check back for detailed analytics.
              </p>
              <div className="mt-6 space-x-4">
                <button 
                  onClick={handleGenerateAIContent}
                  className="bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700"
                >
                  Test AI Content
                </button>
                <button 
                  onClick={() => handleExportReport('test')}
                  className="bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700"
                >
                  Test Export
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Program Management Modals */}
      <ProgramModals
        showCreateModal={showCreateProgramModal}
        showEditModal={showEditProgramModal}
        showAssignmentModal={showAssignmentModal}
        showDetailsModal={showProgramDetailsModal}
        selectedProgram={selectedProgram}
        programForm={programForm}
        regulations={regulations}
        onCloseCreateModal={handleCloseCreateModal}
        onCloseEditModal={handleCloseEditModal}
        onCloseAssignmentModal={handleCloseAssignmentModal}
        onCloseDetailsModal={handleCloseDetailsModal}
        onFormChange={handleFormChange}
        onSaveProgram={handleSaveProgram}
        onAssignProgram={handleAssignProgramAction}
      />

      {/* Content Modals */}
      <ContentModals
        showCreateModal={showCreateContentModal}
        showEditModal={showEditContentModal}
        showPreviewModal={showPreviewContentModal}
        showAIGenerationModal={showAIGenerationModal}
        showUploadModal={showUploadContentModal}
        showAnalyticsModal={showContentAnalyticsModal}
        showSettingsModal={showContentSettingsModal}
        selectedContent={selectedContent}
        contentForm={contentForm}
        regulations={regulations}
        onCloseCreateModal={handleCloseCreateContentModal}
        onCloseEditModal={handleCloseEditContentModal}
        onClosePreviewModal={handleClosePreviewContentModal}
        onCloseAIGenerationModal={handleCloseAIGenerationModal}
        onCloseUploadModal={handleCloseUploadContentModal}
        onCloseAnalyticsModal={handleCloseContentAnalyticsModal}
        onCloseSettingsModal={handleCloseContentSettingsModal}
        onFormChange={handleContentFormChange}
        onSaveContent={handleSaveContent}
        onGenerateAIContent={handleGenerateAIContentAction}
        onUploadContent={handleUploadContentFile}
        onUpdateContentSettings={(settings) => {
          console.log('Updating content settings:', settings);
          // Settings update logic would go here
        }}
      />
    </div>
  );
};

export default TrainingManagementPage; 