import { Employee, DashboardMetrics } from '../types';

export const mockEmployees: Employee[] = [
  {
    id: '1',
    name: 'Sarah Mitchell',
    department: 'Finance',
    role: 'Senior Analyst',
    email: 'sarah.mitchell@company.com',
    photo: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 92,
    riskLevel: 'Critical',
    lastActivity: '2025-01-27T14:30:00Z',
    violations: [
      {
        id: 'v1',
        type: 'Unauthorized Data Access',
        severity: 'Critical',
        description: 'Accessed financial records outside normal working hours',
        timestamp: '2025-01-27T02:15:00Z',
        evidence: ['Email metadata', 'System logs'],
        status: 'Active'
      }
    ],
    connections: [
      {
        employeeId: '2',
        name: 'External Contact',
        connectionType: 'External',
        frequency: 45,
        riskLevel: 'High',
        lastContact: '2025-01-27T10:00:00Z'
      }
    ],
    metrics: {
      emailVolume: 156,
      externalContacts: 23,
      afterHoursActivity: 78,
      dataTransfer: 2.3,
      securityEvents: 5,
      behaviorChange: 85
    }
  },
  {
    id: '2',
    name: 'David Chen',
    department: 'Engineering',
    role: 'Software Developer',
    email: 'david.chen@company.com',
    photo: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 78,
    riskLevel: 'High',
    lastActivity: '2025-01-27T16:45:00Z',
    violations: [
      {
        id: 'v2',
        type: 'Policy Violation',
        severity: 'High',
        description: 'Forwarded confidential emails to personal account',
        timestamp: '2025-01-26T18:30:00Z',
        evidence: ['Email forwarding logs'],
        status: 'Investigating'
      }
    ],
    connections: [],
    metrics: {
      emailVolume: 89,
      externalContacts: 12,
      afterHoursActivity: 34,
      dataTransfer: 1.7,
      securityEvents: 3,
      behaviorChange: 45
    }
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    department: 'Marketing',
    role: 'Marketing Manager',
    email: 'emily.rodriguez@company.com',
    photo: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 65,
    riskLevel: 'High',
    lastActivity: '2025-01-27T15:20:00Z',
    violations: [],
    connections: [],
    metrics: {
      emailVolume: 134,
      externalContacts: 18,
      afterHoursActivity: 25,
      dataTransfer: 0.8,
      securityEvents: 2,
      behaviorChange: 20
    }
  },
  {
    id: '4',
    name: 'Michael Thompson',
    department: 'Sales',
    role: 'Account Executive',
    email: 'michael.thompson@company.com',
    photo: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 45,
    riskLevel: 'Medium',
    lastActivity: '2025-01-27T17:00:00Z',
    violations: [],
    connections: [],
    metrics: {
      emailVolume: 78,
      externalContacts: 15,
      afterHoursActivity: 12,
      dataTransfer: 0.4,
      securityEvents: 1,
      behaviorChange: 10
    }
  },
  {
    id: '5',
    name: 'Lisa Wang',
    department: 'HR',
    role: 'HR Specialist',
    email: 'lisa.wang@company.com',
    photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 28,
    riskLevel: 'Low',
    lastActivity: '2025-01-27T16:30:00Z',
    violations: [],
    connections: [],
    metrics: {
      emailVolume: 45,
      externalContacts: 8,
      afterHoursActivity: 5,
      dataTransfer: 0.2,
      securityEvents: 0,
      behaviorChange: 5
    }
  },
  {
    id: '6',
    name: 'James Wilson',
    department: 'IT',
    role: 'System Administrator',
    email: 'james.wilson@company.com',
    photo: 'https://images.pexels.com/photos/1674666/pexels-photo-1674666.jpeg?auto=compress&cs=tinysrgb&w=400',
    riskScore: 82,
    riskLevel: 'High',
    lastActivity: '2025-01-27T13:15:00Z',
    violations: [
      {
        id: 'v3',
        type: 'Suspicious Activity',
        severity: 'High',
        description: 'Unusual system access patterns detected',
        timestamp: '2025-01-27T01:00:00Z',
        evidence: ['System logs', 'Access patterns'],
        status: 'Investigating'
      }
    ],
    connections: [],
    metrics: {
      emailVolume: 67,
      externalContacts: 6,
      afterHoursActivity: 67,
      dataTransfer: 3.1,
      securityEvents: 4,
      behaviorChange: 72
    }
  }
];

export const dashboardMetrics: DashboardMetrics = {
  totalEmployees: 1247,
  highRiskEmployees: 23,
  activeIncidents: 7,
  violationsToday: 12,
  riskTrend: -5.2
};