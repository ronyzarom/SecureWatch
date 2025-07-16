import { Employee, PolicyViolation } from '../types';

export interface AIResponse {
  content: string;
  suggestions?: string[];
  actions?: {
    label: string;
    type: 'investigate' | 'monitor' | 'escalate' | 'report';
    priority: 'high' | 'medium' | 'low';
  }[];
}

export const generateAIResponse = (
  query: string, 
  context?: {
    employee?: Employee;
    violation?: PolicyViolation;
    riskLevel?: string;
  }
): AIResponse => {
  const lowerQuery = query.toLowerCase();
  
  // Employee-specific queries
  if (context?.employee) {
    const employee = context.employee;
    
    if (lowerQuery.includes('risk') || lowerQuery.includes('threat')) {
      return {
        content: `**Risk Assessment for ${employee.name}:**\n\n${employee.name} currently has a risk score of **${employee.riskScore}/100** (${employee.riskLevel} risk). Key factors contributing to this assessment:\n\n• **Email Volume**: ${employee.metrics.emailVolume} emails this week (${employee.metrics.emailVolume > 100 ? 'above average' : 'normal range'})\n• **External Contacts**: ${employee.metrics.externalContacts} unique external communications\n• **After-Hours Activity**: ${employee.metrics.afterHoursActivity}% of activity outside business hours\n• **Behavioral Changes**: ${employee.metrics.behaviorChange}% deviation from baseline patterns\n\n${employee.violations.length > 0 ? `**Active Violations**: ${employee.violations.length} policy violation${employee.violations.length > 1 ? 's' : ''} requiring attention.` : 'No active policy violations detected.'}`,
        suggestions: [
          'What specific behaviors triggered the risk increase?',
          'Show me the violation details',
          'Recommend investigation steps',
          'Compare with peer group behavior'
        ],
        actions: [
          { label: 'Start Investigation', type: 'investigate', priority: 'high' },
          { label: 'Monitor Activity', type: 'monitor', priority: 'medium' },
          { label: 'Generate Report', type: 'report', priority: 'low' }
        ]
      };
    }
    
    if (lowerQuery.includes('violation') || lowerQuery.includes('policy')) {
      if (employee.violations.length > 0) {
        const violation = employee.violations[0];
        return {
          content: `**Policy Violation Analysis for ${employee.name}:**\n\n**Most Recent Violation**: ${violation.type}\n• **Severity**: ${violation.severity}\n• **Description**: ${violation.description}\n• **Occurred**: ${new Date(violation.timestamp).toLocaleDateString()}\n• **Status**: ${violation.status}\n• **Evidence**: ${violation.evidence.join(', ')}\n\n**Risk Impact**: This violation contributed significantly to their current risk score of ${employee.riskScore}. The ${violation.severity.toLowerCase()} severity indicates ${violation.severity === 'Critical' ? 'immediate action required' : 'elevated monitoring needed'}.`,
          suggestions: [
            'What evidence supports this violation?',
            'Show similar violations across the organization',
            'Recommend disciplinary actions',
            'Check for related incidents'
          ],
          actions: [
            { label: 'Review Evidence', type: 'investigate', priority: 'high' },
            { label: 'Escalate to HR', type: 'escalate', priority: 'high' },
            { label: 'Document Incident', type: 'report', priority: 'medium' }
          ]
        };
      } else {
        return {
          content: `**Policy Compliance Status for ${employee.name}:**\n\n✅ No active policy violations detected\n✅ Current behavior within acceptable parameters\n✅ Risk score of ${employee.riskScore} indicates ${employee.riskLevel.toLowerCase()} risk level\n\nWhile ${employee.name} has no current violations, their risk score suggests continued monitoring is recommended, particularly around:\n• External communication patterns\n• After-hours activity levels\n• Data access behaviors`,
          suggestions: [
            'What factors contribute to their risk score?',
            'Set up proactive monitoring alerts',
            'Compare with department averages',
            'Review historical patterns'
          ]
        };
      }
    }
    
    if (lowerQuery.includes('recommend') || lowerQuery.includes('action') || lowerQuery.includes('next')) {
      const riskLevel = employee.riskLevel;
      let recommendations = '';
      let actions = [];
      
      if (riskLevel === 'Critical') {
        recommendations = `**Immediate Actions Required for ${employee.name}:**\n\n🚨 **Critical Risk Level** - Immediate intervention needed\n\n**Priority 1 Actions:**\n• Initiate formal security investigation\n• Review all recent email communications\n• Audit system access logs and file transfers\n• Consider temporary access restrictions\n• Notify legal and HR departments\n\n**Monitoring Enhancements:**\n• Enable real-time activity monitoring\n• Flag all external communications\n• Review network connections and collaborations`;
        actions = [
          { label: 'Start Investigation', type: 'investigate', priority: 'high' },
          { label: 'Restrict Access', type: 'escalate', priority: 'high' },
          { label: 'Alert Management', type: 'escalate', priority: 'high' }
        ];
      } else if (riskLevel === 'High') {
        recommendations = `**Recommended Actions for ${employee.name}:**\n\n⚠️ **High Risk Level** - Enhanced monitoring required\n\n**Priority Actions:**\n• Increase monitoring frequency\n• Review recent behavioral changes\n• Analyze communication patterns\n• Schedule security awareness training\n• Consider manager notification\n\n**Preventive Measures:**\n• Set up automated alerts for unusual activity\n• Review access permissions\n• Monitor external communications`;
        actions = [
          { label: 'Enhanced Monitoring', type: 'monitor', priority: 'high' },
          { label: 'Security Training', type: 'investigate', priority: 'medium' },
          { label: 'Manager Notification', type: 'escalate', priority: 'medium' }
        ];
      } else {
        recommendations = `**Standard Monitoring for ${employee.name}:**\n\n✅ **${riskLevel} Risk Level** - Routine monitoring sufficient\n\n**Maintenance Actions:**\n• Continue baseline monitoring\n• Quarterly risk assessment review\n• Standard security training compliance\n• Regular access permission audits\n\n**Optimization Opportunities:**\n• Use as positive behavior benchmark\n• Include in peer comparison analysis`;
        actions = [
          { label: 'Routine Monitoring', type: 'monitor', priority: 'low' },
          { label: 'Quarterly Review', type: 'report', priority: 'low' }
        ];
      }
      
      return {
        content: recommendations,
        suggestions: [
          'Show investigation checklist',
          'Compare with similar cases',
          'Generate action plan timeline',
          'Review legal requirements'
        ],
        actions
      };
    }
  }
  
  // General security queries
  if (lowerQuery.includes('threat') || lowerQuery.includes('risk')) {
    return {
      content: `**Current Threat Landscape:**\n\n📊 **Organization Risk Summary:**\n• **23 high-risk employees** requiring immediate attention\n• **7 active security incidents** under investigation\n• **12 policy violations** detected today\n• **5.2% decrease** in overall risk trend\n\n**Top Threat Categories:**\n1. **Unauthorized Data Access** - 3 critical incidents\n2. **External Communication Anomalies** - 8 employees flagged\n3. **After-Hours Activity Spikes** - 15 employees showing unusual patterns\n\n**Immediate Priorities:**\n• Review Sarah Mitchell (Risk Score: 92) - Critical unauthorized access\n• Investigate David Chen (Risk Score: 78) - Policy violations\n• Monitor James Wilson (Risk Score: 82) - Suspicious system access`,
      suggestions: [
        'Show me the highest risk employees',
        'What are the most common violations?',
        'Analyze network connections',
        'Generate executive summary'
      ],
      actions: [
        { label: 'Review Critical Cases', type: 'investigate', priority: 'high' },
        { label: 'Generate Report', type: 'report', priority: 'medium' }
      ]
    };
  }
  
  if (lowerQuery.includes('network') || lowerQuery.includes('connection')) {
    return {
      content: `**Network Analysis Insights:**\n\n🔗 **Communication Pattern Analysis:**\n• **High-risk cluster detected** in Finance department (3 employees)\n• **Unusual external communications** across 8 employees\n• **Cross-department collaboration** showing 12 anomalous patterns\n\n**Key Findings:**\n• Sarah Mitchell and David Chen show suspicious connection patterns\n• Finance team exhibiting coordinated unusual behavior\n• External contact surge detected across multiple departments\n\n**Risk Indicators:**\n• 45% increase in after-hours communications\n• 23 new external contacts this week\n• Unusual file sharing patterns between high-risk employees`,
      suggestions: [
        'Show me the network visualization',
        'Identify the highest risk connections',
        'Analyze communication timing patterns',
        'Check for coordinated activities'
      ],
      actions: [
        { label: 'Open Network Map', type: 'investigate', priority: 'high' },
        { label: 'Analyze Clusters', type: 'investigate', priority: 'medium' }
      ]
    };
  }
  
  if (lowerQuery.includes('investigate') || lowerQuery.includes('how to')) {
    return {
      content: `**Security Investigation Guide:**\n\n🔍 **Standard Investigation Process:**\n\n**Phase 1: Initial Assessment**\n• Review employee risk profile and recent activity\n• Identify specific policy violations or anomalies\n• Gather preliminary evidence and context\n\n**Phase 2: Deep Analysis**\n• Analyze email communication patterns\n• Review system access logs and file transfers\n• Examine network connections and collaborations\n• Check for coordinated activities with other employees\n\n**Phase 3: Evidence Collection**\n• Document all findings with timestamps\n• Preserve relevant email communications\n• Capture system logs and access records\n• Interview relevant stakeholders if needed\n\n**Phase 4: Action & Resolution**\n• Determine appropriate response measures\n• Coordinate with HR and legal teams\n• Implement security controls or restrictions\n• Document lessons learned and update policies`,
      suggestions: [
        'Show investigation checklist template',
        'What evidence should I collect?',
        'When should I involve legal/HR?',
        'How to document findings properly?'
      ],
      actions: [
        { label: 'Start Investigation', type: 'investigate', priority: 'high' },
        { label: 'Download Checklist', type: 'report', priority: 'medium' }
      ]
    };
  }
  
  // Default response
  return {
    content: `I'm your AI security analyst assistant. I can help you with:\n\n🔍 **Investigation Support:**\n• Analyze employee risk profiles and behaviors\n• Investigate policy violations and security incidents\n• Provide actionable recommendations and next steps\n\n📊 **Risk Analysis:**\n• Explain risk scores and contributing factors\n• Compare employee behaviors and patterns\n• Identify network connections and threat clusters\n\n⚡ **Incident Response:**\n• Guide you through investigation procedures\n• Suggest appropriate escalation paths\n• Help document findings and evidence\n\nTry asking me about specific employees, security threats, or investigation procedures. I have access to your organization's security data and can provide contextual insights.`,
    suggestions: [
      'Show me the highest risk employees',
      'What security threats should I prioritize?',
      'How do I investigate a policy violation?',
      'Analyze network connections and patterns'
    ]
  };
};