#!/usr/bin/env node

/**
 * Real-Time Email Sync & Policy Classification Monitor
 * 
 * This script demonstrates and monitors:
 * 1. Email synchronization from Office 365/Google Workspace/Teams
 * 2. AI-powered risk analysis and classification
 * 3. Automatic violation detection
 * 4. Policy evaluation and triggering
 * 5. Policy action execution
 */

const { query } = require('./src/utils/database');
const emailRiskAnalyzer = require('./src/services/emailRiskAnalyzer');

class EmailPolicyMonitor {
  constructor() {
    this.isMonitoring = false;
    this.stats = {
      emailsProcessed: 0,
      violationsCreated: 0,
      policiesTriggered: 0,
      actionsExecuted: 0,
      lastUpdate: new Date()
    };
    this.connectors = {};
  }

  /**
   * Initialize monitoring system
   */
  async initialize() {
    console.log('🚀 Initializing Email & Policy Classification Monitor');
    console.log('=====================================================');
    
    try {
      // Test database connection
      console.log('📀 Testing database connection...');
      const dbTest = await query('SELECT NOW() as current_time');
      console.log(`✅ Database connected: ${dbTest.rows[0].current_time}`);
      
      // Initialize connectors (if configured)
      await this.initializeConnectors();
      
      // Load current statistics
      await this.loadCurrentStats();
      
      console.log('✅ Monitor initialized successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Monitor initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize email connectors if configured
   */
  async initializeConnectors() {
    try {
      // Try to load Office 365 Connector
      try {
        const Office365Connector = require('./src/services/office365Connector');
        this.connectors.office365 = new Office365Connector();
        console.log('📧 Office 365 Connector loaded');
      } catch (e) {
        console.log('⚠️  Office 365 Connector not available');
      }

      // Try to load Google Workspace Connector
      try {
        const GoogleWorkspaceConnector = require('./src/services/googleWorkspaceConnector');
        this.connectors.googleWorkspace = new GoogleWorkspaceConnector();
        console.log('📧 Google Workspace Connector loaded');
      } catch (e) {
        console.log('⚠️  Google Workspace Connector not available');
      }

      // Try to load Teams Connector
      try {
        const TeamsConnector = require('./src/services/teamsConnector');
        this.connectors.teams = new TeamsConnector();
        console.log('📧 Teams Connector loaded');
      } catch (e) {
        console.log('⚠️  Teams Connector not available');
      }

    } catch (error) {
      console.log('⚠️  Some connectors failed to load:', error.message);
    }
  }

  /**
   * Load current system statistics
   */
  async loadCurrentStats() {
    try {
      // Get email processing stats
      const emailStats = await query(`
        SELECT 
          COUNT(*) as total_emails,
          COUNT(*) FILTER (WHERE is_flagged = true) as flagged_emails,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as recent_emails
        FROM email_communications
      `);

      // Get violation stats
      const violationStats = await query(`
        SELECT 
          COUNT(*) as total_violations,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as recent_violations
        FROM violations
      `);

      // Get policy execution stats
      const policyStats = await query(`
        SELECT 
          COUNT(*) as total_executions,
          COUNT(*) FILTER (WHERE execution_status = 'success') as successful_executions,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as recent_executions
        FROM policy_executions
      `);

      this.stats = {
        totalEmails: parseInt(emailStats.rows[0]?.total_emails || 0),
        flaggedEmails: parseInt(emailStats.rows[0]?.flagged_emails || 0),
        recentEmails: parseInt(emailStats.rows[0]?.recent_emails || 0),
        totalViolations: parseInt(violationStats.rows[0]?.total_violations || 0),
        recentViolations: parseInt(violationStats.rows[0]?.recent_violations || 0),
        totalPolicyExecutions: parseInt(policyStats.rows[0]?.total_executions || 0),
        successfulExecutions: parseInt(policyStats.rows[0]?.successful_executions || 0),
        recentExecutions: parseInt(policyStats.rows[0]?.recent_executions || 0),
        lastUpdate: new Date()
      };

      console.log('📊 Current System Stats:');
      console.log(`   📧 Total emails: ${this.stats.totalEmails} (${this.stats.recentEmails} in last hour)`);
      console.log(`   🚨 Total violations: ${this.stats.totalViolations} (${this.stats.recentViolations} in last hour)`);
      console.log(`   ⚖️  Policy executions: ${this.stats.totalPolicyExecutions} (${this.stats.recentExecutions} in last hour)`);

    } catch (error) {
      console.error('❌ Error loading stats:', error);
    }
  }

  /**
   * Start real-time monitoring
   */
  async startMonitoring() {
    this.isMonitoring = true;
    console.log('\n🔄 Starting real-time monitoring...');
    console.log('📊 Monitoring dashboard will update every 30 seconds');
    console.log('🛑 Press Ctrl+C to stop monitoring');
    
    // Monitor database changes
    setInterval(() => this.monitorDatabaseChanges(), 5000);
    
    // Update dashboard
    setInterval(() => this.updateDashboard(), 30000);
    
    // Monitor policy executions
    setInterval(() => this.monitorPolicyExecutions(), 10000);
    
    // Show initial dashboard
    await this.updateDashboard();
  }

  /**
   * Monitor database changes for new emails, violations, and policy executions
   */
  async monitorDatabaseChanges() {
    try {
      // Check for new emails in last 5 seconds
      const newEmails = await query(`
        SELECT id, sender_email, subject, risk_score, is_flagged, created_at
        FROM email_communications 
        WHERE created_at >= NOW() - INTERVAL '5 seconds'
        ORDER BY created_at DESC
      `);

      for (const email of newEmails.rows) {
        this.logEmailProcessed(email);
      }

      // Check for new violations
      const newViolations = await query(`
        SELECT v.id, v.type, v.severity, e.name as employee_name, v.created_at
        FROM violations v
        JOIN employees e ON v.employee_id = e.id
        WHERE v.created_at >= NOW() - INTERVAL '5 seconds'
        ORDER BY v.created_at DESC
      `);

      for (const violation of newViolations.rows) {
        this.logViolationCreated(violation);
      }

      // Check for new policy executions
      const newExecutions = await query(`
        SELECT pe.id, sp.name as policy_name, pe.execution_status, e.name as employee_name, pe.created_at
        FROM policy_executions pe
        JOIN security_policies sp ON pe.policy_id = sp.id
        JOIN employees e ON pe.employee_id = e.id
        WHERE pe.created_at >= NOW() - INTERVAL '5 seconds'
        ORDER BY pe.created_at DESC
      `);

      for (const execution of newExecutions.rows) {
        this.logPolicyExecution(execution);
      }

    } catch (error) {
      console.error('❌ Error monitoring database changes:', error);
    }
  }

  /**
   * Monitor policy executions status changes
   */
  async monitorPolicyExecutions() {
    try {
      // Check for recent policy execution status changes
      const recentExecutions = await query(`
        SELECT 
          pe.id, sp.name as policy_name, pe.execution_status, 
          e.name as employee_name, pe.updated_at,
          pe.execution_details
        FROM policy_executions pe
        JOIN security_policies sp ON pe.policy_id = sp.id
        JOIN employees e ON pe.employee_id = e.id
        WHERE pe.updated_at >= NOW() - INTERVAL '10 seconds'
        AND pe.execution_status IN ('success', 'failed')
        ORDER BY pe.updated_at DESC
      `);

      for (const execution of recentExecutions.rows) {
        this.logPolicyExecutionComplete(execution);
      }

    } catch (error) {
      console.error('❌ Error monitoring policy executions:', error);
    }
  }

  /**
   * Log when an email is processed
   */
  logEmailProcessed(email) {
    const time = new Date().toLocaleTimeString();
    const riskLevel = email.risk_score >= 80 ? '🔴 HIGH' :
                     email.risk_score >= 60 ? '🟡 MEDIUM' :
                     email.risk_score >= 30 ? '🟢 LOW' : '⚪ MINIMAL';
    
    console.log(`[${time}] 📧 EMAIL PROCESSED: ${email.sender_email}`);
    console.log(`   📝 Subject: ${email.subject?.substring(0, 50)}...`);
    console.log(`   🎯 Risk Score: ${email.risk_score}/100 (${riskLevel})`);
    console.log(`   ${email.is_flagged ? '🚨 FLAGGED FOR REVIEW' : '✅ CLEARED'}`);
  }

  /**
   * Log when a violation is created
   */
  logViolationCreated(violation) {
    const time = new Date().toLocaleTimeString();
    const severityIcon = violation.severity === 'Critical' ? '🔴' :
                        violation.severity === 'High' ? '🟠' :
                        violation.severity === 'Medium' ? '🟡' : '🟢';
    
    console.log(`[${time}] 🚨 VIOLATION CREATED: ${violation.employee_name}`);
    console.log(`   ${severityIcon} Type: ${violation.type} (${violation.severity})`);
    console.log(`   🔍 This will trigger policy evaluation...`);
  }

  /**
   * Log when a policy is triggered
   */
  logPolicyExecution(execution) {
    const time = new Date().toLocaleTimeString();
    
    console.log(`[${time}] ⚖️  POLICY TRIGGERED: "${execution.policy_name}"`);
    console.log(`   👤 Employee: ${execution.employee_name}`);
    console.log(`   📋 Status: ${execution.execution_status.toUpperCase()}`);
    console.log(`   🔄 Policy action executor will process this...`);
  }

  /**
   * Log when a policy execution completes
   */
  logPolicyExecutionComplete(execution) {
    const time = new Date().toLocaleTimeString();
    const statusIcon = execution.execution_status === 'success' ? '✅' : '❌';
    
    console.log(`[${time}] ${statusIcon} POLICY ACTION COMPLETED: "${execution.policy_name}"`);
    console.log(`   👤 Employee: ${execution.employee_name}`);
    console.log(`   📊 Result: ${execution.execution_status.toUpperCase()}`);
    
    if (execution.execution_details) {
      try {
        const details = JSON.parse(execution.execution_details);
        console.log(`   📋 Details: ${JSON.stringify(details, null, 2)}`);
      } catch (e) {
        console.log(`   📋 Details: ${execution.execution_details}`);
      }
    }
  }

  /**
   * Update monitoring dashboard
   */
  async updateDashboard() {
    await this.loadCurrentStats();
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 EMAIL SYNC & POLICY CLASSIFICATION MONITOR');
    console.log('='.repeat(80));
    console.log(`⏰ Last Updated: ${this.stats.lastUpdate.toLocaleString()}`);
    console.log('');
    
    console.log('📧 EMAIL PROCESSING:');
    console.log(`   Total Emails: ${this.stats.totalEmails}`);
    console.log(`   Flagged (High Risk): ${this.stats.flaggedEmails}`);
    console.log(`   Processed (Last Hour): ${this.stats.recentEmails}`);
    console.log('');
    
    console.log('🚨 VIOLATION DETECTION:');
    console.log(`   Total Violations: ${this.stats.totalViolations}`);
    console.log(`   Recent (Last Hour): ${this.stats.recentViolations}`);
    console.log('');
    
    console.log('⚖️  POLICY ENFORCEMENT:');
    console.log(`   Total Executions: ${this.stats.totalPolicyExecutions}`);
    console.log(`   Successful: ${this.stats.successfulExecutions}`);
    console.log(`   Recent (Last Hour): ${this.stats.recentExecutions}`);
    console.log('');
    
    // Show recent activity
    await this.showRecentActivity();
    
    console.log('🔄 Monitoring for real-time changes...\n');
  }

  /**
   * Show recent system activity
   */
  async showRecentActivity() {
    try {
      console.log('📋 RECENT ACTIVITY (Last 10 minutes):');
      
      // Get recent policy executions with details
      const recentActivity = await query(`
        SELECT 
          pe.created_at,
          'policy_execution' as activity_type,
          sp.name as policy_name,
          e.name as employee_name,
          pe.execution_status
        FROM policy_executions pe
        JOIN security_policies sp ON pe.policy_id = sp.id
        JOIN employees e ON pe.employee_id = e.id
        WHERE pe.created_at >= NOW() - INTERVAL '10 minutes'
        
        UNION ALL
        
        SELECT 
          v.created_at,
          'violation' as activity_type,
          v.type as policy_name,
          e.name as employee_name,
          v.severity as execution_status
        FROM violations v
        JOIN employees e ON v.employee_id = e.id
        WHERE v.created_at >= NOW() - INTERVAL '10 minutes'
        
        UNION ALL
        
        SELECT 
          ec.created_at,
          'email_processed' as activity_type,
          ec.subject as policy_name,
          ec.sender_email as employee_name,
          CASE WHEN ec.is_flagged THEN 'flagged' ELSE 'cleared' END as execution_status
        FROM email_communications ec
        WHERE ec.created_at >= NOW() - INTERVAL '10 minutes'
        
        ORDER BY created_at DESC
        LIMIT 15
      `);

      if (recentActivity.rows.length === 0) {
        console.log('   (No recent activity)');
      } else {
        for (const activity of recentActivity.rows) {
          const time = new Date(activity.created_at).toLocaleTimeString();
          const icon = activity.activity_type === 'email_processed' ? '📧' :
                      activity.activity_type === 'violation' ? '🚨' : '⚖️';
          
          console.log(`   ${icon} [${time}] ${activity.employee_name} - ${activity.policy_name?.substring(0, 40)}... (${activity.execution_status})`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error loading recent activity:', error);
    }
  }

  /**
   * Simulate email processing for demonstration
   */
  async simulateEmailProcessing() {
    console.log('\n🎭 DEMONSTRATION MODE: Simulating email processing...');
    
    const sampleEmails = [
      {
        from: 'john.doe@company.com',
        subject: 'Quarterly financial results - CONFIDENTIAL',
        bodyText: 'Please find attached our Q3 financial results. This information is highly confidential and should not be shared outside the organization.',
        recipients: ['external.partner@competitor.com'],
        hasAttachments: true
      },
      {
        from: 'jane.smith@company.com',
        subject: 'Customer database backup',
        bodyText: 'I am sending the customer database backup file to my personal email for safekeeping.',
        recipients: ['jane.personal@gmail.com'],
        hasAttachments: true
      },
      {
        from: 'mike.wilson@company.com',
        subject: 'Meeting notes',
        bodyText: 'Here are the notes from our team meeting today. Let me know if you have any questions.',
        recipients: ['team@company.com'],
        hasAttachments: false
      }
    ];

    for (let i = 0; i < sampleEmails.length; i++) {
      const email = sampleEmails[i];
      
      console.log(`\n📧 Processing sample email ${i + 1}/3...`);
      console.log(`   From: ${email.from}`);
      console.log(`   Subject: ${email.subject}`);
      
      try {
        // Simulate AI risk analysis
        console.log('🤖 Running AI risk analysis...');
        const analysis = await emailRiskAnalyzer.analyzeEmail({
          id: `demo-${Date.now()}-${i}`,
          subject: email.subject,
          bodyText: email.bodyText,
          recipients: email.recipients,
          attachments: email.hasAttachments ? [{ filename: 'document.pdf' }] : [],
          sentAt: new Date(),
          sender: {
            email: email.from,
            name: email.from.split('@')[0].replace('.', ' ')
          }
        });
        
        console.log(`   🎯 Risk Score: ${analysis.riskScore}/100`);
        console.log(`   📊 Risk Level: ${analysis.riskLevel}`);
        console.log(`   🔍 Risk Factors: ${analysis.riskFactors.slice(0, 3).join(', ')}`);
        
        if (analysis.riskScore >= 70) {
          console.log('   🚨 HIGH RISK - Would create violation and trigger policies');
        } else if (analysis.riskScore >= 40) {
          console.log('   ⚠️  MEDIUM RISK - Flagged for monitoring');
        } else {
          console.log('   ✅ LOW RISK - Cleared');
        }
        
      } catch (error) {
        console.log(`   ❌ Analysis failed: ${error.message}`);
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n✅ Simulation complete. Resume real-time monitoring...\n');
  }

  /**
   * Show the complete email-to-policy flow
   */
  showSystemFlow() {
    console.log('\n🔄 EMAIL SYNC & POLICY CLASSIFICATION FLOW');
    console.log('============================================');
    console.log('');
    console.log('1. 📧 EMAIL SYNC:');
    console.log('   ├── Office 365 Connector fetches emails via Microsoft Graph API');
    console.log('   ├── Google Workspace Connector fetches Gmail via Google APIs');
    console.log('   └── Teams Connector fetches messages via Microsoft Graph API');
    console.log('');
    console.log('2. 🤖 AI RISK ANALYSIS:');
    console.log('   ├── Content analysis (keywords, patterns, sentiment)');
    console.log('   ├── Recipient analysis (internal vs external)');
    console.log('   ├── Attachment analysis (file types, sizes)');
    console.log('   ├── Timing analysis (business hours vs off-hours)');
    console.log('   └── Behavioral analysis (user patterns)');
    console.log('');
    console.log('3. 📊 RISK SCORING & CLASSIFICATION:');
    console.log('   ├── Risk score: 0-100 (AI-generated)');
    console.log('   ├── Categories: internal, external, suspicious, policy_violation');
    console.log('   └── Flagging: High-risk emails flagged for review');
    console.log('');
    console.log('4. 🚨 VIOLATION DETECTION:');
    console.log('   ├── Risk Score ≥ 70 → Automatic violation creation');
    console.log('   ├── Violation types: data_exfiltration, external_sharing, etc.');
    console.log('   └── Severity: Critical, High, Medium based on risk score');
    console.log('');
    console.log('5. ⚖️  POLICY EVALUATION:');
    console.log('   ├── PolicyEvaluationEngine.evaluatePoliciesForViolation()');
    console.log('   ├── Complex condition matching (risk score, frequency, etc.)');
    console.log('   └── Creates policy_executions with "pending" status');
    console.log('');
    console.log('6. 🎯 POLICY ACTION EXECUTION:');
    console.log('   ├── PolicyActionExecutor processes pending executions');
    console.log('   ├── Actions: email alerts, disable access, escalate incident');
    console.log('   └── Real-time enforcement and notifications');
    console.log('');
    console.log('🔄 This entire flow happens automatically for every email!');
    console.log('');
  }
}

// Main execution
async function main() {
  const monitor = new EmailPolicyMonitor();
  
  // Show system architecture
  monitor.showSystemFlow();
  
  // Initialize monitor
  const initialized = await monitor.initialize();
  if (!initialized) {
    console.error('❌ Failed to initialize monitor');
    process.exit(1);
  }
  
  // Ask user what they want to do
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  console.log('\n🎛️  MONITORING OPTIONS:');
  console.log('1. Start real-time monitoring');
  console.log('2. Run email processing simulation');
  console.log('3. Show current system statistics');
  console.log('4. Exit');
  
  rl.question('\nSelect option (1-4): ', async (answer) => {
    switch (answer.trim()) {
      case '1':
        rl.close();
        await monitor.startMonitoring();
        break;
        
      case '2':
        await monitor.simulateEmailProcessing();
        rl.close();
        break;
        
      case '3':
        await monitor.updateDashboard();
        rl.close();
        break;
        
      case '4':
      default:
        console.log('👋 Goodbye!');
        rl.close();
        break;
    }
  });
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Monitoring stopped by user');
    console.log('👋 Goodbye!');
    process.exit(0);
  });
}

// Run the monitor
main().catch(error => {
  console.error('❌ Monitor failed:', error);
  process.exit(1);
}); 