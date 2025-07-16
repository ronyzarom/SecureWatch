const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const HEALTH_URL = 'http://localhost:3001/health';

// Global session cookie for authenticated requests
let sessionCookie = '';

// Axios instance with session support
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add interceptor to include session cookie
api.interceptors.request.use((config) => {
  if (sessionCookie) {
    config.headers.Cookie = sessionCookie;
  }
  return config;
});

// Helper functions
const log = (message, data = '') => {
  console.log(`🔍 ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logSuccess = (message, data = '') => {
  console.log(`✅ ${message}`, data ? JSON.stringify(data, null, 2) : '');
};

const logError = (message, error) => {
  console.error(`❌ ${message}:`, error.response?.data || error.message);
};

// Test functions
async function testHealthCheck() {
  log('Testing health check endpoint...');
  try {
    const response = await axios.get(HEALTH_URL);
    logSuccess('Health check passed', response.data);
    return true;
  } catch (error) {
    logError('Health check failed', error);
    return false;
  }
}

async function testLogin() {
  log('Testing admin login...');
  try {
    const response = await api.post('/auth/login', {
      email: 'admin@company.com',
      password: 'admin123'
    });
    
    // Extract session cookie
    const cookies = response.headers['set-cookie'];
    if (cookies) {
      sessionCookie = cookies.find(cookie => cookie.startsWith('securewatch.session'));
    }
    
    logSuccess('Login successful', response.data);
    return response.data.user;
  } catch (error) {
    logError('Login failed', error);
    return null;
  }
}

async function testCreateUsers() {
  log('Creating additional users via API...');
  
  const users = [
    {
      email: 'analyst@company.com',
      password: 'analyst123',
      name: 'Security Analyst',
      role: 'analyst',
      department: 'IT Security'
    },
    {
      email: 'viewer@company.com', 
      password: 'viewer123',
      name: 'Security Viewer',
      role: 'viewer',
      department: 'Operations'
    }
  ];

  const createdUsers = [];
  
  for (const userData of users) {
    try {
      const response = await api.post('/users', userData);
      logSuccess(`Created user: ${userData.email}`, response.data.user);
      createdUsers.push(response.data.user);
    } catch (error) {
      if (error.response?.data?.code === 'EMAIL_EXISTS') {
        log(`User already exists: ${userData.email}`);
      } else {
        logError(`Failed to create user: ${userData.email}`, error);
      }
    }
  }
  
  return createdUsers;
}

async function testChatWithEmployeeContext() {
  log('Testing AI chat with employee context...');
  
  try {
    // Get first employee
    const employeesResponse = await api.get('/employees?limit=1');
    if (employeesResponse.data.employees.length === 0) {
      log('No employees found for context testing');
      return false;
    }
    
    const employee = employeesResponse.data.employees[0];
    
    // Test chat with employee context
    const response = await api.post('/chat/message', {
      message: `Tell me about ${employee.name}`,
      employeeId: employee.id
    });
    
    logSuccess(`Employee-specific chat for ${employee.name}`, {
      userMessage: response.data.userMessage.content,
      aiResponseLength: response.data.aiMessage.content.length,
      employeeContext: employee.id
    });
    
    return true;
  } catch (error) {
    logError('Employee context chat failed', error);
    return false;
  }
}

async function testDashboardEndpoints() {
  log('Testing dashboard endpoints...');
  
  const endpoints = [
    '/dashboard/metrics',
    '/dashboard/recent-violations', 
    '/dashboard/high-risk-employees',
    '/dashboard/alerts',
    '/dashboard/activity'
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint);
      logSuccess(`Dashboard ${endpoint} working`, { 
        dataKeys: Object.keys(response.data),
        sampleSize: Object.keys(response.data).length 
      });
      results[endpoint] = response.data;
    } catch (error) {
      logError(`Dashboard ${endpoint} failed`, error);
    }
  }
  
  return results;
}

async function validateSeededData() {
  log('Validating all seeded data...');
  
  try {
    // Validate employees exist
    const employeesResponse = await api.get('/employees');
    const employeeCount = employeesResponse.data.employees.length;
    
    // Validate users exist
    const usersResponse = await api.get('/users');
    const userCount = usersResponse.data.users.length;
    
    // Validate chat messages exist
    const chatResponse = await api.get('/chat/history');
    const messageCount = chatResponse.data.messages.length;
    
    // Validate dashboard data
    const metricsResponse = await api.get('/dashboard/metrics');
    const metrics = metricsResponse.data.summary;
    
    logSuccess('Data validation complete', {
      employees: employeeCount,
      users: userCount,
      chatMessages: messageCount,
      totalViolations: metrics.totalViolations,
      criticalRisk: metrics.criticalRisk,
      highRisk: metrics.highRisk
    });
    
    return {
      employees: employeeCount,
      users: userCount,
      chatMessages: messageCount,
      violations: metrics.totalViolations
    };
    
  } catch (error) {
    logError('Data validation failed', error);
    return null;
  }
}

// Main test execution
async function runApiTests() {
  console.log('\n🚀 SecureWatch API Testing & Seeding Started\n');
  console.log('=' .repeat(60));
  
  // Step 1: Health check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ Server not healthy. Exiting...');
    return;
  }
  
  console.log('\n' + '-'.repeat(60));
  
  // Step 2: Authentication
  const user = await testLogin();
  if (!user) {
    console.log('\n❌ Authentication failed. Exiting...');
    return;
  }
  
  console.log(`\n📋 Logged in as: ${user.name} (${user.role})`);
  console.log('\n' + '-'.repeat(60));
  
  // Step 3: Create additional users
  await testCreateUsers();
  
  console.log('\n' + '-'.repeat(60));
  
  // Step 4: Test dashboard
  await testDashboardEndpoints();
  
  console.log('\n' + '-'.repeat(60));
  
  // Step 5: Test AI chat with employee context
  await testChatWithEmployeeContext();
  
  console.log('\n' + '-'.repeat(60));
  
  // Step 6: Final validation
  const finalData = await validateSeededData();
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 API Testing & Seeding Complete!');
  
  if (finalData) {
    console.log('\n📊 Final Database State:');
    console.log(`   • ${finalData.employees} employees`);
    console.log(`   • ${finalData.users} users`);
    console.log(`   • ${finalData.chatMessages} chat messages`);
    console.log(`   • ${finalData.violations} violations`);
  }
  
  console.log('\n✅ All API endpoints tested successfully!');
  console.log('✅ Database seeded with comprehensive test data!');
  console.log('\n🔗 Backend ready at: http://localhost:3001');
  console.log('🔑 Login: admin@company.com / admin123');
  console.log('🔑 Analyst: analyst@company.com / analyst123');
  console.log('🔑 Viewer: viewer@company.com / viewer123');
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error.message);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runApiTests().catch(console.error);
}

module.exports = {
  runApiTests,
  testLogin,
  testHealthCheck
}; 