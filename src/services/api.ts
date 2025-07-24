import axios, { AxiosInstance, AxiosError } from 'axios';

// Create axios instance with base configuration
const getBaseURL = () => {
  // In production, API is served from the same domain
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, API runs on port 3001
  return 'http://localhost:3001';
};

console.log(`[API] Base URL: ${getBaseURL()}`);

const api = axios.create({
  baseURL: getBaseURL(),
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
  sendMessage: async (message: string, employeeId?: number) => {
    // No frontend timeout - let backend handle LLM processing time
    const response = await api.post('/api/chat/message', { 
      message, 
      employeeId 
    }, {
      timeout: 0 // No timeout - backend controls this
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
// VIOLATIONS MANAGEMENT 
// ============================================================

export const violationAPI = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    severity?: string;
    employeeId?: number;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const response = await api.get('/api/violations', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/api/violations/${id}`);
    return response.data;
  },

  updateStatus: async (id: number, status: string, reason: string, aiAssisted = false) => {
    const response = await api.put(`/api/violations/${id}/status`, {
      status,
      reason,
      aiAssisted
    });
    return response.data;
  },

  requestAIValidation: async (id: number, validationType = 'evidence_validation', additionalContext?: string) => {
    const response = await api.post(`/api/violations/${id}/ai-validate`, {
      validationType,
      additionalContext
    });
    return response.data;
  },

  getStatistics: async () => {
    const response = await api.get('/api/violations/stats');
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

export const activityReportsAPI = {
  // Get activity overview statistics
  getOverview: async (params?: {
    days?: number;
    department?: string;
  }) => {
    const response = await api.get('/api/activity-reports/overview', { params });
    return response.data;
  },

  // Get detailed activity report for specific employee
  getEmployeeReport: async (employeeId: number, days: number = 30) => {
    const response = await api.get(`/api/activity-reports/employee/${employeeId}`, {
      params: { days }
    });
    return response.data;
  },

  // Get activity trends and patterns
  getTrends: async (params?: {
    days?: number;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    const response = await api.get('/api/activity-reports/trends', { params });
    return response.data;
  },

  // Detect activity anomalies
  getAnomalies: async (params?: {
    days?: number;
    threshold?: number;
  }) => {
    const response = await api.get('/api/activity-reports/anomalies', { params });
    return response.data;
  },

  // Compare activity between employees or departments
  getComparison: async (params: {
    type: 'employees' | 'departments';
    days?: number;
    ids?: string; // comma-separated employee IDs
    departments?: string; // comma-separated department names
  }) => {
    const response = await api.get('/api/activity-reports/comparison', { params });
    return response.data;
  }
};

// ============================================================
// COMPLIANCE MANAGEMENT
// ============================================================

export const complianceAPI = {
  // Dashboard and overview
  getDashboard: async () => {
    const response = await api.get('/api/compliance/dashboard');
    return response.data;
  },

  // Regulations management
  regulations: {
    getAll: async () => {
      const response = await api.get('/api/compliance/regulations');
      return response.data;
    },

    getActive: async () => {
      const response = await api.get('/api/compliance/regulations/active');
      return response.data;
    },

    activate: async (code: string, isActive: boolean, configuration?: any) => {
      const response = await api.put(`/api/compliance/regulations/${code}/activate`, {
        is_active: isActive,
        configuration
      });
      return response.data;
    }
  },

  // Internal policies management
  policies: {
    getAll: async () => {
      const response = await api.get('/api/compliance/policies');
      return response.data;
    },

    create: async (policyData: any) => {
      const response = await api.post('/api/compliance/policies', policyData);
      return response.data;
    },

    update: async (id: number, policyData: any) => {
      const response = await api.put(`/api/compliance/policies/${id}`, policyData);
      return response.data;
    },

    delete: async (id: number) => {
      const response = await api.delete(`/api/compliance/policies/${id}`);
      return response.data;
    }
  },

  // Compliance profiles management
  profiles: {
    getAll: async () => {
      const response = await api.get('/api/compliance/profiles');
      return response.data;
    },

    create: async (profileData: any) => {
      const response = await api.post('/api/compliance/profiles', profileData);
      return response.data;
    },

    update: async (id: number, profileData: any) => {
      const response = await api.put(`/api/compliance/profiles/${id}`, profileData);
      return response.data;
    },

    delete: async (id: number) => {
      const response = await api.delete(`/api/compliance/profiles/${id}`);
      return response.data;
    }
  },

  // Employee compliance management
  employees: {
    getAll: async () => {
      const response = await api.get('/api/compliance/employees');
      return response.data;
    },

    evaluate: async (employeeId: number) => {
      const response = await api.get(`/api/compliance/employees/${employeeId}/evaluate`);
      return response.data;
    },

    assignProfile: async (employeeId: number, profileId: number) => {
      const response = await api.put(`/api/compliance/employees/${employeeId}/profile`, {
        compliance_profile_id: profileId
      });
      return response.data;
    },

    bulkEvaluate: async () => {
      const response = await api.post('/api/compliance/employees/bulk-evaluate');
      return response.data;
    },

    updateProfile: async (employeeId: number, complianceProfileId: number, notes?: string) => {
      const response = await api.put(`/api/compliance/employees/${employeeId}/profile`, {
        compliance_profile_id: complianceProfileId,
        compliance_notes: notes
      });
      return response.data;
    },

    getStatus: async (params?: {
      department?: string;
      profile?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }) => {
      const response = await api.get('/api/compliance/employees/status', { params });
      return response.data;
    }
  },

  // Compliance incidents management
  incidents: {
    getAll: async (params?: {
      status?: string;
      severity?: string;
      employeeId?: number;
      limit?: number;
      offset?: number;
    }) => {
      const response = await api.get('/api/compliance/incidents', { params });
      return response.data;
    },

    create: async (incidentData: any) => {
      const response = await api.post('/api/compliance/incidents', incidentData);
      return response.data;
    },

    update: async (id: number, incidentData: any) => {
      const response = await api.put(`/api/compliance/incidents/${id}`, incidentData);
      return response.data;
    },

    resolve: async (id: number, resolution: string) => {
      const response = await api.put(`/api/compliance/incidents/${id}`, {
        status: 'resolved',
        remediation_plan: resolution,
        resolved_at: new Date().toISOString()
      });
      return response.data;
    }
  },

  // Audit trail
  audit: {
    getLog: async (params?: {
      entityType?: string;
      entityId?: number;
      performedBy?: number;
      limit?: number;
      offset?: number;
    }) => {
      const response = await api.get('/api/compliance/audit-log', { params });
      return response.data;
    }
  },

  // Audit logs (alias for AuditTrail component)
  auditLogs: {
    getAll: async (params?: {
      days?: number;
      action?: string;
      entity_type?: string;
      performed_by?: string;
      limit?: number;
      offset?: number;
    }) => {
      const response = await api.get('/api/compliance/audit-log', { params });
      return response.data;
    }
  },

  // System operations
  refreshEngine: async () => {
    const response = await api.post('/api/compliance/refresh');
    return response.data;
  },

  // Bulk operations
  bulkEvaluate: async (employeeIds: number[]) => {
    const results = await Promise.all(
      employeeIds.map(id => api.get(`/api/compliance/employees/${id}/evaluate`))
    );
    return results.map(response => response.data);
  },

  bulkAssignProfile: async (employeeIds: number[], profileId: number) => {
    const results = await Promise.all(
      employeeIds.map(id => 
        api.put(`/api/compliance/employees/${id}/profile`, {
          compliance_profile_id: profileId
        })
      )
    );
    return results.map(response => response.data);
  }
};

// ============================================================
// CATEGORY DETECTION RESULTS
// ============================================================

export const categoryDetectionAPI = {
  getEmployeeCategoryDetections: async (employeeId: number, days: number = 30) => {
    const response = await api.get(`/api/employees/${employeeId}/category-detections`, {
      params: { days }
    });
    return response.data;
  }
};

export default api; 