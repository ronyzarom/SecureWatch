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
  testConnection?: boolean;
}

export interface CompanyDetails {
  name: string;
  domain: string;
  address: string;
  phone: string;
  industry: string;
  employeeCount: number;
  logo?: string;
}