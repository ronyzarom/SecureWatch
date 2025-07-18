export interface Employee {
  id: string;
  name: string;
  department: string;
  role: string;
  email: string;
  photo: string;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  lastActivity: string;
  violations: PolicyViolation[];
  connections: Connection[];
  metrics: EmployeeMetrics;
}

export interface PolicyViolation {
  id: string;
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  timestamp: string;
  evidence: string[];
  status: 'Active' | 'Investigating' | 'Resolved';
}

export interface Connection {
  employeeId: string;
  name: string;
  connectionType: 'Internal' | 'External';
  frequency: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  lastContact: string;
}

export interface EmployeeMetrics {
  emailVolume: number;
  externalContacts: number;
  afterHoursActivity: number;
  dataTransfer: number;
  securityEvents: number;
  behaviorChange: number;
}

export interface DashboardMetrics {
  totalEmployees: number;
  highRiskEmployees: number;
  activeIncidents: number;
  violationsToday: number;
  riskTrend: number;
}

export interface NetworkNode {
  id: string;
  name: string;
  department: string;
  riskScore: number;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  photo: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string | NetworkNode;
  target: string | NetworkNode;
  strength: number;
  type: 'email' | 'meeting' | 'file_share' | 'suspicious';
  frequency: number;
  riskLevel: 'High' | 'Medium' | 'Low';
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: {
    employeeId?: string;
    violationId?: string;
    riskLevel?: string;
    actionType?: 'investigation' | 'analysis' | 'recommendation';
  };
}

// ============================================================
// EMAIL ANALYTICS TYPES
// ============================================================

export interface EmailAnalytics {
  overview: {
    totalEmails: number;
    flaggedEmails: number;
    externalEmails: number;
    suspiciousEmails: number;
    avgRiskScore: string;
    office365Emails: number;
    googleWorkspaceEmails: number;
  };
  topRiskSenders: Array<{
    name: string;
    email: string;
    emailCount: number;
    avgRiskScore: string;
    flaggedCount: number;
  }>;
  volumeByDay: Array<{
    date: string;
    count: number;
    flaggedCount: number;
  }>;
}

// ============================================================
// EXISTING TYPES
// ============================================================

export interface SecurityContext {
  currentEmployee?: Employee;
  activeViolations: PolicyViolation[];
  riskTrends: {
    period: string;
    change: number;
    factors: string[];
  };
  networkInsights: {
    suspiciousConnections: number;
    riskClusters: number;
    isolatedThreats: number;
  };
}

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  config?: Record<string, any>;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  department: string;
  lastLogin?: string;
  status: 'active' | 'inactive';
  permissions: string[];
}

export interface EmailServerConfig {
  host: string;
  port: number;
  encryption: 'none' | 'ssl' | 'tls';
  username: string;
  password: string;
  fromAddress: string;
  testConnection?: boolean;
}

export interface CompanyDetails {
  name: string;
  domain: string;
  address: string;
  phone: string;
  industry: string;
  employee_count: number;
  logo_url?: string;
}

export interface CompanyInfo {
  name: string;
  domain: string;
  address: string;
  phone: string;
  industry: string;
  employeeCount: number;
  logoUrl?: string;
}

export interface Policy {
  id: number;
  name: string;
  description: string;
  policyLevel: 'global' | 'group' | 'user';
  targetId?: number;
  targetType?: string;
  isActive: boolean;
  priority: number;
  
  // NEW: Category-based configuration
  categories?: number[]; // Selected threat category IDs
  categoryRules?: PolicyCategoryRule[]; // Category-specific rules
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  stats: {
    conditions: number;
    actions: number;
    recentExecutions: number;
    categoriesUsed?: number; // NEW
  };
}

// NEW: Policy Category Rule interface
export interface PolicyCategoryRule {
  id: number;
  policyId: number;
  categoryId: number;
  categoryName?: string; // For display purposes
  
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

// NEW: Category Action Configuration
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

// Updated condition types to include category-based conditions
export type PolicyConditionType = 
  | 'risk_score'
  | 'violation_severity' 
  | 'data_access'
  | 'time_based'
  | 'frequency'
  | 'any_violation'
  // NEW: Category-based conditions
  | 'category_match'
  | 'category_score'
  | 'category_frequency'
  | 'behavioral_anomaly'
  | 'custom_pattern'
  | 'communication_pattern'
  | 'data_access_anomaly'
  | 'time_pattern_deviation'
  | 'relationship_change';

// Enhanced action types
export type PolicyActionType = 
  | 'email_alert'
  | 'escalate_incident'
  | 'increase_monitoring'
  | 'disable_access'
  | 'log_detailed_activity'
  | 'immediate_alert'
  // NEW: Category-specific actions
  | 'category_investigation'
  | 'behavioral_analysis'
  | 'data_access_review'
  | 'manager_notification'
  | 'compliance_alert'
  | 'fraud_investigation'
  | 'immediate_lockdown';