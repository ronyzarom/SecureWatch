import axios, { AxiosInstance, AxiosError } from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000,
  withCredentials: true, // Important for session cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`[API] ✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    const url = error.config?.url;
    const status = error.response?.status;
    
    // 401 on auth/me is expected when checking for existing sessions
    if (status === 401 && url?.includes('/api/auth/me')) {
      console.log(`[API] ℹ️ ${status} ${url}: No existing session`);
    } else {
      console.error(`[API] ❌ ${status} ${url}:`, error.response?.data);
    }
    
    if (status === 401) {
      // Handle authentication errors
      console.log('[API] Authentication required - redirecting to login');
    }
    return Promise.reject(error);
  }
);

// ============================================================
// CONNECTION & HEALTH
// ============================================================

export const testConnection = async () => {
  try {
    const response = await api.get('/health');
    console.log('✅ Backend connected successfully:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error);
    return { success: false, error: error };
  }
};

export const testAuth = async () => {
  try {
    const response = await api.get('/api/auth/me');
    console.log('✅ Auth check successful:', response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.log('ℹ️ Not authenticated (expected):', error);
    return { success: false, error: error };
  }
};

// ============================================================
// AUTHENTICATION
// ============================================================

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  me: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/api/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  updateProfile: async (profileData: any) => {
    const response = await api.put('/api/auth/profile', profileData);
    return response.data;
  }
};

// ============================================================
// DASHBOARD
// ============================================================

export const dashboardAPI = {
  getMetrics: async () => {
    const response = await api.get('/api/dashboard/metrics');
    return response.data;
  },

  getRecentViolations: async () => {
    const response = await api.get('/api/dashboard/recent-violations');
    return response.data;
  },

  getHighRiskEmployees: async () => {
    const response = await api.get('/api/dashboard/high-risk-employees');
    return response.data;
  },

  getAlerts: async () => {
    const response = await api.get('/api/dashboard/alerts');
    return response.data;
  },

  getActivity: async () => {
    const response = await api.get('/api/dashboard/activity');
    return response.data;
  }
};

// ============================================================
// EMAIL ANALYTICS
// ============================================================

export const emailAPI = {
  getAnalytics: async () => {
    const response = await api.get('/api/emails/analytics');
    return response.data;
  },

  // Minimal function to support employee investigation in NetworkMapModal
  getAll: async (params?: { 
    employee_id?: number; 
    limit?: number; 
  }) => {
    const response = await api.get('/api/emails', { params });
    return response.data;
  }
};

// ============================================================
// EMPLOYEES
// ============================================================

export const employeeAPI = {
  getAll: async (params?: { page?: number; limit?: number; department?: string; riskLevel?: string }) => {
    const response = await api.get('/api/employees', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/api/employees/${id}`);
    return response.data;
  },

  update: async (id: number, data: any) => {
    const response = await api.put(`/api/employees/${id}`, data);
    return response.data;
  },

  getMetadata: async () => {
    const response = await api.get('/api/employees/metadata');
    return response.data;
  },



  getMetrics: async (id: number) => {
    const response = await api.get(`/api/employees/${id}/metrics`);
    return response.data;
  }
};

// ============================================================
// CHAT/AI ASSISTANT
// ============================================================

export const chatAPI = {
  sendMessage: async (message: string, employeeContext?: number) => {
    const response = await api.post('/api/chat/message', { 
      message, 
      employeeContext 
    });
    return response.data;
  },

  getHistory: async (limit?: number) => {
    const response = await api.get('/api/chat/history', { 
      params: { limit } 
    });
    return response.data;
  },

  getEmployeeHistory: async (employeeId: number, limit?: number) => {
    const response = await api.get(`/api/chat/employee/${employeeId}/history`, {
      params: { limit }
    });
    return response.data;
  },

  clearHistory: async () => {
    const response = await api.delete('/api/chat/history');
    return response.data;
  }
};

// ============================================================
// USERS MANAGEMENT
// ============================================================

export const userAPI = {
  getAll: async () => {
    const response = await api.get('/api/users');
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/api/users/${id}`);
    return response.data;
  },

  create: async (userData: any) => {
    const response = await api.post('/api/users', userData);
    return response.data;
  },

  update: async (id: number, userData: any) => {
    const response = await api.put(`/api/users/${id}`, userData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/users/${id}`);
    return response.data;
  },

  resetPassword: async (id: number, newPassword: string) => {
    const response = await api.post(`/api/users/${id}/reset-password`, { 
      newPassword 
    });
    return response.data;
  },

  getRoles: async () => {
    const response = await api.get('/api/users/roles');
    return response.data;
  }
};

// ============================================================
// SETTINGS
// ============================================================

export const settingsAPI = {
  // General Settings
  getGeneral: async () => {
    const response = await api.get('/api/settings/general');
    return response.data;
  },

  updateGeneral: async (settings: any) => {
    const response = await api.put('/api/settings/general', settings);
    return response.data;
  },

  // Company Settings
  getCompany: async () => {
    const response = await api.get('/api/settings/company');
    return response.data;
  },

  updateCompany: async (companyData: any) => {
    const response = await api.put('/api/settings/company', companyData);
    return response.data;
  },

  // Email Settings
  getEmail: async () => {
    const response = await api.get('/api/settings/email/config');
    return response.data;
  },

  updateEmail: async (emailConfig: any) => {
    const response = await api.put('/api/settings/email/config', emailConfig);
    return response.data;
  },

  testEmail: async (emailConfig: any) => {
    const response = await api.post('/api/settings/email/test', emailConfig);
    return response.data;
  },

  // Dashboard Settings
  getDashboard: async () => {
    const response = await api.get('/api/settings/dashboard');
    return response.data;
  },

  updateDashboard: async (dashboardConfig: any) => {
    const response = await api.put('/api/settings/dashboard', dashboardConfig);
    return response.data;
  }
};

// ============================================================
// CATEGORIES
// ============================================================

export const categoryAPI = {
  getAll: async (includeKeywords: boolean = false) => {
    const response = await api.get(`/api/categories?includeKeywords=${includeKeywords}`);
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/api/categories/${id}`);
    return response.data;
  },

  create: async (categoryData: any) => {
    const response = await api.post('/api/categories', categoryData);
    return response.data;
  },

  update: async (id: number, categoryData: any) => {
    const response = await api.put(`/api/categories/${id}`, categoryData);
    return response.data;
  },

  delete: async (id: number) => {
    const response = await api.delete(`/api/categories/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await api.get('/api/categories/stats/overview');
    return response.data;
  },

  getTemplates: async () => {
    const response = await api.get('/api/categories/templates');
    return response.data;
  }
};

// Export the configured axios instance
export default api; 