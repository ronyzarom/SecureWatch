# 🧪 SecureWatch Policy System - Testing Guide

## 📋 Overview

This guide provides comprehensive testing procedures for the newly implemented Policy System, covering everything from basic functionality to end-to-end integration testing.

---

## 🚀 **Quick Test Setup**

### **1. Start the Server**
```bash
cd backend
node server.js
```

**Expected Output:**
```
✅ Policy Action Executor loaded
🚀 Starting Policy Action Executor Service
   ✅ Policy Action Executor started
```

### **2. Verify Service Status**
```bash
curl http://localhost:3001/health
```

---

## 🎯 **Testing Levels**

### **Level 1: Basic Functionality Tests** ✅

#### **Test 1.1: Server Startup**
- ✅ Policy Action Executor service starts
- ✅ Background processing every 5 seconds
- ✅ Clean shutdown handling

#### **Test 1.2: API Endpoints**
```bash
# Test policy endpoints
curl http://localhost:3001/api/policies
curl http://localhost:3001/api/violations  
curl http://localhost:3001/api/activity-reports
```

---

### **Level 2: Policy Configuration Tests**

#### **Test 2.1: Create Test Policy**
```bash
curl -X POST http://localhost:3001/api/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test High Risk Email Policy",
    "description": "Test policy for high-risk email detection",
    "is_enabled": true,
    "conditions": [
      {
        "condition_type": "risk_score",
        "operator": "greater_than", 
        "value": "80"
      }
    ],
    "actions": [
      {
        "action_type": "email_alert",
        "action_config": {
          "recipients": ["admin@test.com"],
          "subject": "Test Policy Alert"
        }
      }
    ]
  }'
```

#### **Test 2.2: Verify Policy Creation**
```bash
curl http://localhost:3001/api/policies | jq '.'
```

---

### **Level 3: Violation Trigger Tests**

#### **Test 3.1: Manual Violation Creation**
```bash
curl -X POST http://localhost:3001/api/violations \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": 1,
    "type": "high_risk_email",
    "severity": "High",
    "description": "Test violation for policy testing",
    "source": "manual_test",
    "status": "Active",
    "metadata": {
      "riskScore": 85,
      "testViolation": true
    }
  }'
```

#### **Test 3.2: Check Policy Execution**
```bash
# Check if policy was triggered
curl http://localhost:3001/api/activity-reports | jq '.[] | select(.action_type == "policy_executed")'

# Check policy execution logs
tail -f backend/logs/policy-execution.log
```

---

### **Level 4: Individual Action Tests**

#### **Test 4.1: Email Alert Action**
```javascript
// Test email alert directly
const policyActionExecutor = require('./src/services/policyActionExecutor');

const testExecution = {
  id: 'test-1',
  policy_name: 'Test Email Policy',
  employee_name: 'Test User',
  employee_email: 'test@example.com',
  violation_type: 'test_violation',
  violation_severity: 'High'
};

const testAction = {
  action_type: 'email_alert',
  action_config: {
    recipients: ['admin@test.com'],
    subject: 'Test Policy Alert'
  }
};

await policyActionExecutor.executeEmailAlert(testAction, testExecution);
```

#### **Test 4.2: Escalate Incident Action**
```bash
# Create test incident escalation
curl -X POST http://localhost:3001/api/test/policy-action \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "escalate_incident",
    "employee_id": 1,
    "config": {
      "escalation_level": "high",
      "notify_management": true
    }
  }'
```

#### **Test 4.3: Access Restriction Action**
```bash
# Test access restriction
curl -X POST http://localhost:3001/api/test/policy-action \
  -H "Content-Type: application/json" \
  -d '{
    "action_type": "disable_access",
    "employee_id": 1,
    "config": {
      "access_type": "email",
      "duration_hours": 2,
      "notify_employee": true
    }
  }'
```

---

### **Level 5: Integration Tests**

#### **Test 5.1: Office 365 Email Integration**
```javascript
// Simulate high-risk email processing
const office365Connector = require('./src/services/office365Connector');

const testEmailData = {
  messageId: 'test-message-123',
  subject: 'Suspicious email test',
  from: 'test@company.com',
  recipients: ['external@badactor.com'],
  content: 'This is a test email with suspicious content for data exfiltration testing'
};

// This should trigger policy evaluation
await office365Connector.processEmailWithRisk(testEmailData);
```

#### **Test 5.2: End-to-End Flow Test**
```bash
# 1. Create employee
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Employee",
    "email": "testuser@company.com",
    "department": "Testing",
    "role": "employee"
  }'

# 2. Simulate high-risk email
curl -X POST http://localhost:3001/api/test/simulate-email \
  -H "Content-Type: application/json" \
  -d '{
    "employee_email": "testuser@company.com",
    "risk_score": 90,
    "violation_type": "data_exfiltration"
  }'

# 3. Check policy execution results
sleep 10
curl http://localhost:3001/api/violations | jq '.[] | select(.employee_id == EMPLOYEE_ID)'
curl http://localhost:3001/api/activity-reports | jq '.[] | select(.action_type == "policy_executed")'
```

---

## 🔍 **Monitoring & Verification**

### **Database Verification**
```sql
-- Check violations created
SELECT * FROM violations WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check policy executions
SELECT * FROM policy_executions WHERE created_at > NOW() - INTERVAL '1 hour';

-- Check activity logs
SELECT * FROM activity_logs WHERE action_type LIKE '%policy%' AND created_at > NOW() - INTERVAL '1 hour';

-- Check incidents created
SELECT * FROM incidents WHERE created_at > NOW() - INTERVAL '1 hour';
```

### **Log Monitoring**
```bash
# Server logs
tail -f backend/logs/server.log

# Policy execution logs
tail -f backend/logs/policy-execution.log

# Email service logs
tail -f backend/logs/email-service.log
```

---

## 🎯 **Performance Tests**

### **Load Testing**
```bash
# Test multiple concurrent violations
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/violations \
    -H "Content-Type: application/json" \
    -d "{\"employee_id\": $i, \"type\": \"test_load\", \"severity\": \"High\"}" &
done
wait

# Check processing performance
curl http://localhost:3001/api/metrics/policy-performance
```

### **Background Service Performance**
```bash
# Monitor processing intervals
grep "Processing.*pending policy executions" backend/logs/server.log | tail -20

# Check execution timing
grep "Execution.*completed" backend/logs/server.log | tail -10
```

---

## 🚨 **Error Testing**

### **Database Failure Simulation**
```bash
# Stop database temporarily
# Policy system should gracefully handle and log failures

# Check fallback logging
grep "Database schema pending" backend/logs/server.log
```

### **Email Service Failure**
```bash
# Test with invalid email configuration
# System should log errors but continue processing

# Check error handling
grep "Email service not configured" backend/logs/server.log
```

---

## 📊 **Test Results Validation**

### **Success Criteria**
- ✅ Policies automatically triggered on violations (risk score ≥ 70)
- ✅ All 6 action types execute without errors
- ✅ Email alerts sent with professional templates
- ✅ Database records created for incidents, monitoring, restrictions
- ✅ Activity logs track all policy executions
- ✅ Background service runs continuously without crashes
- ✅ Graceful error handling for missing database tables
- ✅ Clean startup and shutdown procedures

### **Performance Benchmarks**
- Policy evaluation: < 100ms per violation
- Action execution: < 5 seconds per action
- Background processing: 5-second intervals maintained
- Email delivery: < 30 seconds
- Database operations: < 1 second per query

---

## 🛠️ **Test Utilities**

### **Policy Test Script**
```javascript
// Create: backend/test/policy-test.js
const { exec } = require('child_process');

async function runPolicyTests() {
  console.log('🧪 Starting Policy System Tests...');
  
  // Test 1: Basic functionality
  console.log('📋 Test 1: Basic Functionality');
  // ... test implementation
  
  // Test 2: Policy creation
  console.log('📋 Test 2: Policy Creation');
  // ... test implementation
  
  // Test 3: Action execution
  console.log('📋 Test 3: Action Execution');
  // ... test implementation
  
  console.log('✅ All tests completed!');
}

runPolicyTests();
```

### **Automated Test Runner**
```bash
#!/bin/bash
# Create: backend/scripts/test-policies.sh

echo "🚀 Starting SecureWatch Policy System Tests"

# Start server in background
cd backend
node server.js &
SERVER_PID=$!

# Wait for startup
sleep 5

# Run test suite
echo "📋 Running test suite..."
npm test -- --grep "policy"

# Cleanup
kill $SERVER_PID
echo "✅ Tests completed"
```

---

## 🏆 **Expected Results**

When properly implemented and tested, you should see:

1. **Real-time policy enforcement** on every violation
2. **Professional email alerts** sent to management
3. **Incident records** created in database
4. **Employee access controls** applied automatically
5. **Comprehensive audit trails** for compliance
6. **24/7 background processing** without interruption

The policy system transforms your security from reactive to **proactive automated protection**! 🔒✨ 