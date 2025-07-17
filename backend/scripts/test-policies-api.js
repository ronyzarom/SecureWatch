const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const credentials = {
  email: 'admin@company.com',
  password: 'admin123'
};

let authCookie = '';

async function login() {
  try {
    console.log('🔐 Logging in...');
    const response = await axios.post(`${BASE_URL}/auth/login`, credentials, {
      withCredentials: true
    });
    
    // Extract session cookie
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      authCookie = cookies.find(cookie => cookie.startsWith('securewatch.session'));
    }
    
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetPolicies() {
  try {
    console.log('\n📋 Testing GET /api/policies...');
    const response = await axios.get(`${BASE_URL}/policies`, {
      headers: {
        'Cookie': authCookie
      },
      withCredentials: true
    });
    
    console.log('✅ GET policies successful');
    console.log(`   Found ${response.data.policies.length} policies`);
    
    response.data.policies.forEach(policy => {
      console.log(`   - ${policy.policyLevel.toUpperCase()}: ${policy.name} (Active: ${policy.isActive})`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ GET policies failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetPolicyDetails(policyId) {
  try {
    console.log(`\n🔍 Testing GET /api/policies/${policyId}...`);
    const response = await axios.get(`${BASE_URL}/policies/${policyId}`, {
      headers: {
        'Cookie': authCookie
      },
      withCredentials: true
    });
    
    console.log('✅ GET policy details successful');
    console.log(`   Policy: ${response.data.name}`);
    console.log(`   Conditions: ${response.data.conditions.length}`);
    console.log(`   Actions: ${response.data.actions.length}`);
    console.log(`   Recent Executions: ${response.data.recentExecutions.length}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ GET policy details failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testCreatePolicy() {
  try {
    console.log('\n➕ Testing POST /api/policies (create new policy)...');
    
    const newPolicy = {
      name: 'Test Automated Policy',
      description: 'A test policy created via API',
      policyLevel: 'global',
      priority: 75,
      isActive: true,
      conditions: [
        {
          type: 'risk_score',
          operator: 'greater_than',
          value: '90',
          logicalOperator: 'AND',
          order: 1
        }
      ],
      actions: [
        {
          type: 'email_alert',
          config: {
            recipients: ['test@company.com'],
            subject: 'High Risk Alert - Test Policy'
          },
          order: 1,
          delay: 0,
          isEnabled: true
        }
      ]
    };
    
    const response = await axios.post(`${BASE_URL}/policies`, newPolicy, {
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ CREATE policy successful');
    console.log(`   Created policy ID: ${response.data.policy.id}`);
    console.log(`   Name: ${response.data.policy.name}`);
    
    return response.data.policy;
  } catch (error) {
    console.error('❌ CREATE policy failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testUpdatePolicy(policyId) {
  try {
    console.log(`\n✏️  Testing PUT /api/policies/${policyId}...`);
    
    const updateData = {
      description: 'Updated test policy description',
      priority: 85
    };
    
    const response = await axios.put(`${BASE_URL}/policies/${policyId}`, updateData, {
      headers: {
        'Cookie': authCookie,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ UPDATE policy successful');
    console.log(`   Updated priority to: ${response.data.policy.priority}`);
    
    return response.data.policy;
  } catch (error) {
    console.error('❌ UPDATE policy failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testTogglePolicy(policyId) {
  try {
    console.log(`\n🔄 Testing PATCH /api/policies/${policyId}/toggle...`);
    
    const response = await axios.patch(`${BASE_URL}/policies/${policyId}/toggle`, {}, {
      headers: {
        'Cookie': authCookie
      },
      withCredentials: true
    });
    
    console.log('✅ TOGGLE policy successful');
    console.log(`   Policy is now: ${response.data.policy.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    
    return response.data.policy;
  } catch (error) {
    console.error('❌ TOGGLE policy failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testGetEffectivePolicies(employeeId = 1) {
  try {
    console.log(`\n🎯 Testing GET /api/policies/effective/${employeeId}...`);
    
    const response = await axios.get(`${BASE_URL}/policies/effective/${employeeId}`, {
      headers: {
        'Cookie': authCookie
      },
      withCredentials: true
    });
    
    console.log('✅ GET effective policies successful');
    console.log(`   Found ${response.data.effectivePolicies.length} effective policies for employee ${employeeId}`);
    
    response.data.effectivePolicies.forEach(policy => {
      console.log(`   - ${policy.level.toUpperCase()}: ${policy.name} (Priority: ${policy.priority})`);
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ GET effective policies failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testDeletePolicy(policyId) {
  try {
    console.log(`\n🗑️  Testing DELETE /api/policies/${policyId}...`);
    
    const response = await axios.delete(`${BASE_URL}/policies/${policyId}`, {
      headers: {
        'Cookie': authCookie
      },
      withCredentials: true
    });
    
    console.log('✅ DELETE policy successful');
    console.log(`   Deleted policy ID: ${response.data.deletedId}`);
    
    return response.data;
  } catch (error) {
    console.error('❌ DELETE policy failed:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('🧪 Starting Policy API Tests...\n');
    
    // Step 1: Login
    await login();
    
    // Step 2: Get all policies
    const policiesData = await testGetPolicies();
    
    // Step 3: Get details of first policy
    if (policiesData.policies.length > 0) {
      await testGetPolicyDetails(policiesData.policies[0].id);
    }
    
    // Step 4: Create new policy
    const newPolicy = await testCreatePolicy();
    
    // Step 5: Update the new policy
    await testUpdatePolicy(newPolicy.id);
    
    // Step 6: Toggle policy status
    await testTogglePolicy(newPolicy.id);
    
    // Step 7: Get effective policies for employee
    await testGetEffectivePolicies(1);
    
    // Step 8: Delete the test policy
    await testDeletePolicy(newPolicy.id);
    
    console.log('\n🎉 All Policy API tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 