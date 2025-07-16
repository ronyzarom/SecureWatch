# ⚡ **Frontend-Backend Integration Quick Start**

Get your SecureWatch integration running in the next few hours!

---

## 🚀 **Immediate Next Steps (Today)**

### **Step 1: Install Dependencies** ⏱️ *5 minutes*
```bash
# Add axios for API calls
npm install axios

# Add TypeScript types for development
npm install -D @types/axios
```

### **Step 2: Test Backend Connection** ⏱️ *10 minutes*
```bash
# Make sure backend is running
./start-app.sh

# Test API in browser
# http://localhost:3001/health
# http://localhost:3001/api/dashboard/metrics (requires auth)
```

### **Step 3: Create API Service Base** ⏱️ *15 minutes*
Create `src/services/api.ts`:
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
});

// Test the connection
export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    console.log('✅ Backend connected:', response.data);
    return true;
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return false;
  }
};

export default api;
```

### **Step 4: Test Frontend-Backend Connection** ⏱️ *10 minutes*
Add to `App.tsx`:
```typescript
import { useEffect } from 'react';
import { testConnection } from './services/api';

function App() {
  useEffect(() => {
    testConnection();
  }, []);
  
  // ... rest of your component
}
```

---

## 📋 **Phase 1: Authentication (Day 1-2)**

### **Priority Tasks:**
1. **✅ Create login page component**
2. **✅ Implement authentication context**  
3. **✅ Test login with backend API**
4. **✅ Add session persistence**

### **Quick Implementation:**

#### **1. Create `src/components/LoginPage.tsx`**
```typescript
import React, { useState } from 'react';
import axios from 'axios';

export const LoginPage = () => {
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:3001/api/auth/login', {
        email,
        password
      }, { withCredentials: true });
      
      console.log('✅ Login successful:', response.data);
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.error('❌ Login failed:', error);
      alert('Login failed!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="max-w-md w-full space-y-4 p-8 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center">SecureWatch Login</h2>
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 border rounded"
          required
        />
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 border rounded"
          required
        />
        
        <button
          type="submit"
          disabled={loading}
          className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        
        <div className="text-sm text-gray-600 text-center">
          <p>Admin: admin@company.com / admin123</p>
          <p>Analyst: analyst@company.com / analyst123</p>
        </div>
      </form>
    </div>
  );
};
```

#### **2. Update `App.tsx` for Authentication Check**
```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LoginPage } from './components/LoginPage';
// ... other imports

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/auth/me', {
        withCredentials: true
      });
      setUser(response.data.user);
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  // Loading state
  if (isAuthenticated === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show main app if authenticated
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header user={user} onLogout={() => setIsAuthenticated(false)} />
        {/* ... rest of your app */}
      </div>
    </ThemeProvider>
  );
}
```

#### **3. Add Logout to Header**
```typescript
// In Header.tsx, add logout function
const handleLogout = async () => {
  try {
    await axios.post('http://localhost:3001/api/auth/logout', {}, {
      withCredentials: true
    });
    props.onLogout();
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

---

## 📊 **Phase 2: Dashboard Data (Day 3-4)**

### **Quick Dashboard API Integration:**

#### **1. Create `src/hooks/useDashboardData.ts`**
```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDashboardData = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/dashboard/metrics', {
        withCredentials: true
      });
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data error:', err);
    } finally {
      setLoading(false);
    }
  };

  return { metrics, loading, error, refetch: fetchDashboardData };
};
```

#### **2. Update Dashboard Component**
```typescript
// In App.tsx or dashboard component
import { useDashboardData } from './hooks/useDashboardData';

function Dashboard() {
  const { metrics, loading, error } = useDashboardData();

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metrics) return <div>No data available</div>;

  return (
    <div>
      <h2>Real Dashboard Data!</h2>
      <p>Total Employees: {metrics.summary?.totalEmployees}</p>
      <p>Critical Risk: {metrics.summary?.criticalRisk}</p>
      {/* Use real metrics instead of mock data */}
    </div>
  );
}
```

---

## 👥 **Phase 3: Employee Data (Day 5-6)**

### **Quick Employee Integration:**

#### **1. Create Employee API Hook**
```typescript
// src/hooks/useEmployees.ts
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/employees', {
        withCredentials: true
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  return { employees, loading, refetch: fetchEmployees };
};
```

#### **2. Update EmployeesPage**
```typescript
// In EmployeesPage.tsx
import { useEmployees } from '../hooks/useEmployees';

export const EmployeesPage = () => {
  const { employees, loading } = useEmployees();

  if (loading) return <div>Loading employees...</div>;

  return (
    <div>
      <h2>Employees ({employees.length})</h2>
      {employees.map(employee => (
        <EmployeeCard key={employee.id} employee={employee} />
      ))}
    </div>
  );
};
```

---

## 🤖 **Phase 4: AI Chat (Day 7-8)**

### **Quick Chat Integration:**

#### **1. Update SecurityChatbot Component**
```typescript
// In SecurityChatbot.tsx
const sendMessage = async (message: string) => {
  try {
    const response = await axios.post('http://localhost:3001/api/chat/message', {
      message
    }, { withCredentials: true });
    
    // Add both user and AI messages to chat
    setMessages(prev => [
      ...prev,
      response.data.userMessage,
      response.data.aiMessage
    ]);
  } catch (error) {
    console.error('Chat error:', error);
  }
};
```

---

## ✅ **Daily Progress Checklist**

### **Day 1: Authentication**
- [ ] Install axios dependency
- [ ] Create basic API service
- [ ] Test backend connection
- [ ] Create login page
- [ ] Test login with backend

### **Day 2: Authentication Polish**
- [ ] Add authentication context
- [ ] Implement logout functionality
- [ ] Add loading states
- [ ] Test session persistence

### **Day 3: Dashboard Integration**
- [ ] Create dashboard data hook
- [ ] Replace mock dashboard data
- [ ] Test real metrics display
- [ ] Add error handling

### **Day 4: Dashboard Polish**
- [ ] Add auto-refresh
- [ ] Improve loading states
- [ ] Style real data components
- [ ] Test data updates

### **Day 5: Employee Data**
- [ ] Create employee hooks
- [ ] Replace mock employee data
- [ ] Test employee listing
- [ ] Add filtering/search

### **Day 6: Employee Details**
- [ ] Implement employee details API
- [ ] Update employee cards
- [ ] Test employee updates
- [ ] Add error handling

### **Day 7: AI Chat**
- [ ] Update chat component
- [ ] Test message sending
- [ ] Implement chat history
- [ ] Add context support

### **Day 8: Polish & Testing**
- [ ] Test all integrations
- [ ] Fix any bugs
- [ ] Performance optimization
- [ ] Final testing

---

## 🚨 **Common Issues & Solutions**

### **CORS Errors**
```javascript
// If you get CORS errors, make sure backend has:
app.use(cors({
  origin: 'http://localhost:5173', // or 5174
  credentials: true
}));
```

### **Session/Cookie Issues**
```javascript
// Make sure to use withCredentials: true in all requests
axios.defaults.withCredentials = true;
```

### **TypeScript Errors**
```bash
# Ignore TypeScript errors temporarily while developing
// @ts-ignore
```

### **404 Errors**
```bash
# Make sure backend is running on port 3001
./start-app.sh

# Check backend health
curl http://localhost:3001/health
```

---

## 🎯 **Success Criteria**

### **End of Day 1:**
- ✅ Can login with test account
- ✅ Authentication redirects work
- ✅ Backend connection established

### **End of Day 3:**
- ✅ Dashboard shows real data
- ✅ Employee count is accurate
- ✅ Risk metrics are live

### **End of Day 5:**
- ✅ Employee list shows real employees
- ✅ Employee details work
- ✅ Filtering functions

### **End of Day 7:**
- ✅ AI chat responds with real data
- ✅ Chat history persists
- ✅ Employee context works

---

## 📞 **Quick Help**

### **Test Commands:**
```bash
# Backend health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Test dashboard (after login)
curl http://localhost:3001/api/dashboard/metrics \
  -H "Cookie: your-session-cookie"
```

### **Debug Console:**
```javascript
// In browser console - test API directly
fetch('http://localhost:3001/health')
  .then(r => r.json())
  .then(console.log);
```

---

**⚡ Ready to integrate? Start with Step 1 and work through each phase!**

**🎯 Goal: Live integration in 1-2 weeks with 4-8 hours of focused work per day.** 