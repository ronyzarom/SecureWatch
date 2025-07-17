// Custom Categories TypeScript Interfaces
// For advanced threat detection and behavioral analysis

export interface ThreatCategory {
  id: number;
  name: string;
  description?: string;
  categoryType: 'predefined' | 'custom' | 'industry_specific';
  industry?: string;
  
  // Risk Configuration
  baseRiskScore: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  
  // Alert Thresholds
  alertThreshold: number;
  investigationThreshold: number;
  criticalThreshold: number;
  
  // Pattern Configuration
  detectionPatterns: DetectionPatterns;
  riskMultipliers: RiskMultipliers;
  
  // Status and Metadata
  isActive: boolean;
  isSystemCategory: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  keywords?: CategoryKeyword[];
  policyRules?: PolicyCategoryRule[];
}

export interface CategoryKeyword {
  id: number;
  categoryId: number;
  keyword: string;
  weight: number;
  isPhrase: boolean;
  contextRequired?: string;
  createdAt: string;
}

export interface PolicyCategoryRule {
  id: number;
  policyId: number;
  categoryId: number;
  
  // Rule Configuration
  isEnabled: boolean;
  customThreshold?: number;
  customRiskScore?: number;
  customKeywords: string[];
  
  // Behavioral Rules
  frequencyLimit?: number;
  timeWindowHours: number;
  requireMultipleIndicators: boolean;
  
  // Actions
  actionConfig: CategoryActionConfig;
  
  createdAt: string;
  updatedAt: string;
}

export interface CategoryDetectionResult {
  id: number;
  
  // Link to analysis target
  emailId?: number;
  employeeId: number;
  categoryId: number;
  
  // Detection Results
  matchedKeywords: string[];
  patternMatches: string[];
  confidenceScore: number;
  riskScore: number;
  
  // Context Information
  detectionContext: DetectionContext;
  falsePositive?: boolean;
  analystNotes?: string;
  
  // Metadata
  analyzedAt: string;
  analyzerVersion: string;
  createdAt: string;
}

// Supporting Interfaces

export interface DetectionPatterns {
  emailPatterns?: string[];
  behavioralPatterns?: string[];
  timePatterns?: string[];
  attachmentPatterns?: string[];
  accessPatterns?: string[];
  communicationPatterns?: string[];
  compliancePatterns?: string[];
  documentPatterns?: string[];
  systemPatterns?: string[];
  paymentPatterns?: string[];
  relationshipPatterns?: string[];
}

export interface RiskMultipliers {
  afterHours?: number;
  externalRecipient?: number;
  largeAttachment?: number;
  frequency?: number;
  competitorContact?: number;
  externalContact?: number;
  bulkExport?: number;
  personalEmail?: number;
  weekendSubmission?: number;
  roundNumbers?: number;
  duplicateVendor?: number;
  personalCommunication?: number;
  paymentIrregularity?: number;
  giftMention?: number;
  urgentProcessing?: number;
  paymentChange?: number;
  vendorCommunication?: number;
  dataAccessSpike?: number;
  competitorCommunication?: number;
  accessPatternChange?: number;
  competitorDomain?: number;
  confidentialContext?: number;
  meetingCoordination?: number;
  systemBypass?: number;
  accessViolation?: number;
  policyMention?: number;
}

export interface CategoryActionConfig {
  emailAlert?: boolean;
  escalate?: boolean;
  lockdown?: boolean;
  increaseMonitoring?: boolean;
  notifyManager?: boolean;
  complianceAlert?: boolean;
  fraudInvestigation?: boolean;
  immediateAlert?: boolean;
  dataAccessReview?: boolean;
  behavioralAnalysis?: boolean;
  
  // Custom action parameters
  alertRecipients?: string[];
  escalationLevel?: 'low' | 'medium' | 'high' | 'critical';
  lockdownDuration?: number; // minutes
  monitoringDuration?: number; // hours
  customMessage?: string;
}

export interface DetectionContext {
  analysisType?: 'email' | 'behavioral' | 'system' | 'manual';
  triggerEvent?: string;
  additionalMetadata?: Record<string, any>;
  relatedDetections?: number[]; // IDs of related detection results
  investigationStatus?: 'pending' | 'in_progress' | 'completed' | 'false_positive';
  riskFactors?: string[];
  mitigatingFactors?: string[];
}

// Form and UI Interfaces

export interface CategoryFormData {
  name: string;
  description: string;
  categoryType: 'predefined' | 'custom' | 'industry_specific';
  industry: string;
  baseRiskScore: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  alertThreshold: number;
  investigationThreshold: number;
  criticalThreshold: number;
  keywords: string[];
  detectionPatterns: DetectionPatterns;
  riskMultipliers: RiskMultipliers;
  isActive: boolean;
}

export interface CategoryFilter {
  search?: string;
  categoryType?: 'all' | 'predefined' | 'custom' | 'industry_specific';
  industry?: string;
  severity?: 'all' | 'Critical' | 'High' | 'Medium' | 'Low';
  isActive?: boolean;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  customCategories: number;
  detectionResults: number;
  recentDetections: number;
  topCategories: Array<{
    categoryId: number;
    categoryName: string;
    detectionCount: number;
    averageRiskScore: number;
  }>;
}

// Predefined Category Templates

export interface CategoryTemplate {
  name: string;
  description: string;
  industry: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  keywords: string[];
  detectionPatterns: DetectionPatterns;
  riskMultipliers: RiskMultipliers;
  baseRiskScore: number;
  icon?: string;
  color?: string;
}

export const PREDEFINED_CATEGORY_TEMPLATES: CategoryTemplate[] = [
  // Data Protection Templates
  {
    name: 'Data Exfiltration',
    description: 'Unauthorized data export or transfer to external systems',
    industry: 'All',
    severity: 'Critical',
    keywords: ['export data', 'download database', 'backup', 'transfer files', 'personal account'],
    detectionPatterns: {
      emailPatterns: ['bulk_download', 'external_transfer', 'personal_account'],
      behavioralPatterns: ['after_hours_access', 'unusual_volume'],
      attachmentPatterns: ['large_files', 'encrypted_files']
    },
    riskMultipliers: {
      afterHours: 2.0,
      externalRecipient: 1.8,
      largeAttachment: 1.5,
      frequency: 1.3
    },
    baseRiskScore: 80,
    icon: 'database',
    color: 'red'
  },
  
  // Financial Fraud Templates
  {
    name: 'Expense Fraud',
    description: 'Fraudulent expense claims and reimbursement schemes',
    industry: 'All',
    severity: 'High',
    keywords: ['duplicate receipt', 'personal expense', 'reimbursement', 'expense report'],
    detectionPatterns: {
      emailPatterns: ['duplicate_receipts', 'personal_expenses', 'inflated_amounts'],
      behavioralPatterns: ['submission_timing', 'approval_bypass'],
      documentPatterns: ['receipt_manipulation', 'vendor_creation']
    },
    riskMultipliers: {
      weekendSubmission: 1.4,
      roundNumbers: 1.3,
      duplicateVendor: 1.6
    },
    baseRiskScore: 65,
    icon: 'dollar-sign',
    color: 'orange'
  },
  
  // Behavioral Risk Templates
  {
    name: 'Pre-Termination Indicators',
    description: 'Signs of employee planning to leave with potential data theft',
    industry: 'All',
    severity: 'Medium',
    keywords: ['job interview', 'resignation', 'new opportunity', 'leaving company', 'competitor'],
    detectionPatterns: {
      emailPatterns: ['job_search', 'competitor_contact', 'resignation_hints'],
      behavioralPatterns: ['data_hoarding', 'access_expansion', 'meeting_decline'],
      communicationPatterns: ['external_increase', 'internal_decrease']
    },
    riskMultipliers: {
      dataAccessSpike: 1.8,
      competitorCommunication: 2.2,
      accessPatternChange: 1.5
    },
    baseRiskScore: 60,
    icon: 'user-x',
    color: 'yellow'
  }
];

// Industry-Specific Templates

export const INDUSTRY_CATEGORY_TEMPLATES: Record<string, CategoryTemplate[]> = {
  healthcare: [
    {
      name: 'HIPAA Violations',
      description: 'Unauthorized disclosure of protected health information',
      industry: 'Healthcare',
      severity: 'Critical',
      keywords: ['PHI', 'patient data', 'medical records', 'HIPAA', 'health information'],
      detectionPatterns: {
        emailPatterns: ['patient_info_sharing', 'medical_record_transfer'],
        compliancePatterns: ['hipaa_violation', 'privacy_breach']
      },
      riskMultipliers: {
        externalRecipient: 2.5,
        personalEmail: 2.0
      },
      baseRiskScore: 90,
      icon: 'shield-alert',
      color: 'red'
    }
  ],
  
  finance: [
    {
      name: 'SOX Compliance Violations',
      description: 'Sarbanes-Oxley financial reporting violations',
      industry: 'Financial Services',
      severity: 'Critical',
      keywords: ['financial reporting', 'audit trail', 'internal controls', 'SOX', 'earnings'],
      detectionPatterns: {
        emailPatterns: ['financial_manipulation', 'audit_bypass'],
        compliancePatterns: ['sox_violation', 'financial_misstatement']
      },
      riskMultipliers: {
        urgentProcessing: 2.0,
        paymentChange: 1.8
      },
      baseRiskScore: 85,
      icon: 'trending-up',
      color: 'red'
    }
  ],
  
  technology: [
    {
      name: 'Source Code Theft',
      description: 'Unauthorized access and sharing of proprietary source code',
      industry: 'Technology',
      severity: 'Critical',
      keywords: ['source code', 'repository', 'git', 'algorithm', 'proprietary code'],
      detectionPatterns: {
        emailPatterns: ['code_sharing', 'repository_access'],
        behavioralPatterns: ['code_repository_access', 'bulk_download']
      },
      riskMultipliers: {
        competitorDomain: 3.0,
        externalRecipient: 2.5
      },
      baseRiskScore: 85,
      icon: 'code',
      color: 'red'
    }
  ]
};

export default ThreatCategory; 