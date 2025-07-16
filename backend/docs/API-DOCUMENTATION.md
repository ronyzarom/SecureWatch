# 📚 SecureWatch API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:3001`  
**Authentication:** Session-based with secure cookies

---

## 🔐 **Authentication**

### POST `/api/auth/login`
**Summary:** User login  
**Description:** Authenticate user with email and password, create session  
**Rate Limit:** 5 requests per 15 minutes

#### Request Body
```json
{
  "email": "admin@company.com",
  "password": "admin123"
}
```

#### Response (200)
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "name": "System Administrator",
    "role": "admin",
    "department": "IT Security"
  }
}
```

#### Error Responses
- **400:** Missing credentials
- **401:** Invalid credentials or inactive account
- **429:** Rate limit exceeded (15 min timeout)
- **500:** Server error

---

### POST `/api/auth/logout`
**Summary:** User logout  
**Description:** Destroy user session and clear session cookie

#### Response (200)
```json
{
  "message": "Logout successful"
}
```

---

### GET `/api/auth/me`
**Summary:** Get current user  
**Description:** Get information about the currently logged-in user  
**Authentication:** Required

#### Response (200)
```json
{
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "name": "System Administrator",
    "role": "admin",
    "department": "IT Security"
  }
}
```

---

### GET `/api/auth/status`
**Summary:** Check session status  
**Description:** Check if user is authenticated

#### Response (200)
```json
{
  "authenticated": true,
  "sessionId": "abc123..."
}
```

---

### PUT `/api/auth/change-password`
**Summary:** Change password  
**Description:** Change user's password  
**Authentication:** Required

#### Request Body
```json
{
  "currentPassword": "admin123",
  "newPassword": "newpassword123"
}
```

#### Response (200)
```json
{
  "message": "Password changed successfully"
}
```

---

### PUT `/api/auth/profile`
**Summary:** Update profile  
**Description:** Update user profile information  
**Authentication:** Required

#### Request Body
```json
{
  "name": "Updated Name",
  "department": "Updated Department"
}
```

#### Response (200)
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "admin@company.com",
    "name": "Updated Name",
    "role": "admin",
    "department": "Updated Department"
  }
}
```

---

## 📊 **Dashboard**

### GET `/api/dashboard/metrics`
**Summary:** Get dashboard metrics  
**Description:** Comprehensive dashboard metrics including employee counts, risk distribution, violations, and trends  
**Authentication:** Required

#### Response (200)
```json
{
  "summary": {
    "totalEmployees": 6,
    "criticalRisk": 1,
    "highRisk": 3,
    "mediumRisk": 1,
    "lowRisk": 1,
    "totalViolations": 3,
    "activeViolations": 2,
    "criticalViolations": 1,
    "recentActivity": 5
  },
  "riskDistribution": {
    "Critical": 1,
    "High": 3,
    "Medium": 1,
    "Low": 1
  },
  "departmentBreakdown": [
    {
      "department": "Finance",
      "count": 1,
      "avgRiskScore": "92.0"
    }
  ],
  "trend": [
    {
      "date": "2025-01-27",
      "violations": 2,
      "avgSeverity": "3.50"
    }
  ]
}
```

---

### GET `/api/dashboard/recent-violations`
**Summary:** Get recent violations  
**Description:** Retrieve most recent policy violations  
**Authentication:** Required

#### Query Parameters
- `limit` (integer, optional): Number of violations to return (default: 10)

#### Response (200)
```json
{
  "violations": [
    {
      "id": 1,
      "type": "Unauthorized Data Access",
      "severity": "Critical",
      "description": "Accessed financial records outside normal working hours",
      "status": "Active",
      "createdAt": "2025-01-27T20:30:57.597Z",
      "employee": {
        "name": "Sarah Mitchell",
        "email": "sarah.mitchell@company.com",
        "department": "Finance"
      }
    }
  ]
}
```

---

### GET `/api/dashboard/high-risk-employees`
**Summary:** Get high-risk employees  
**Description:** Retrieve employees with high or critical risk levels  
**Authentication:** Required

#### Query Parameters
- `limit` (integer, optional): Number of employees to return (default: 10)

#### Response (200)
```json
{
  "employees": [
    {
      "id": 1,
      "name": "Sarah Mitchell",
      "email": "sarah.mitchell@company.com",
      "department": "Finance",
      "jobTitle": "Senior Analyst",
      "riskScore": 92,
      "riskLevel": "Critical",
      "lastActivity": "2025-01-27T18:30:57.597Z",
      "violationCount": 1,
      "activeViolations": 1
    }
  ]
}
```

---

### GET `/api/dashboard/alerts`
**Summary:** Get system alerts  
**Description:** Retrieve current system alerts and notifications  
**Authentication:** Required

#### Response (200)
```json
{
  "alerts": [
    {
      "id": "critical_violations",
      "type": "critical",
      "title": "Critical Violations",
      "message": "1 critical violations require immediate attention",
      "count": 1,
      "priority": "high"
    }
  ]
}
```

---

### GET `/api/dashboard/activity`
**Summary:** Get activity timeline  
**Description:** Retrieve recent activity and events  
**Authentication:** Required

#### Query Parameters
- `hours` (integer, optional): Hours of activity to retrieve (default: 24)

#### Response (200)
```json
{
  "activity": [
    {
      "id": 1,
      "type": "violation",
      "eventType": "Unauthorized Data Access",
      "severity": "Critical",
      "timestamp": "2025-01-27T20:30:57.597Z",
      "employee": {
        "name": "Sarah Mitchell",
        "department": "Finance"
      },
      "description": "Accessed financial records outside normal working hours"
    }
  ]
}
```

---

## 👥 **Employees**

### GET `/api/employees`
**Summary:** Get employees list  
**Description:** Retrieve employees with filtering, pagination, and sorting  
**Authentication:** Required

#### Query Parameters
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 25, max: 100)
- `department` (string): Filter by department
- `riskLevel` (string): Filter by risk level (Critical, High, Medium, Low)
- `search` (string): Search by name or email
- `sortBy` (string): Sort field (name, email, department, risk_score, last_activity)
- `sortOrder` (string): Sort order (asc, desc)

#### Response (200)
```json
{
  "employees": [
    {
      "id": 1,
      "name": "Sarah Mitchell",
      "email": "sarah.mitchell@company.com",
      "department": "Finance",
      "jobTitle": "Senior Analyst",
      "riskScore": 92,
      "riskLevel": "Critical",
      "lastActivity": "2025-01-27T18:30:57.597Z",
      "photoUrl": null,
      "violationCount": 1,
      "activeViolations": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 6,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

---

### GET `/api/employees/:id`
**Summary:** Get employee details  
**Description:** Retrieve detailed information about a specific employee  
**Authentication:** Required

#### Response (200)
```json
{
  "employee": {
    "id": 1,
    "name": "Sarah Mitchell",
    "email": "sarah.mitchell@company.com",
    "department": "Finance",
    "jobTitle": "Senior Analyst",
    "photoUrl": null,
    "riskScore": 92,
    "riskLevel": "Critical",
    "lastActivity": "2025-01-27T18:30:57.597Z",
    "isActive": true,
    "createdAt": "2025-01-27T20:30:57.597Z",
    "updatedAt": "2025-01-27T20:30:57.597Z"
  },
  "violations": [
    {
      "id": 1,
      "type": "Unauthorized Data Access",
      "severity": "Critical",
      "description": "Accessed financial records outside normal working hours",
      "status": "Active",
      "evidence": ["Email metadata", "System logs"],
      "createdAt": "2025-01-27T20:30:57.597Z",
      "resolvedAt": null
    }
  ],
  "metrics": [
    {
      "date": "2025-01-27",
      "emailVolume": 156,
      "externalContacts": 23,
      "afterHoursActivity": 78,
      "dataTransfer": 2.3,
      "securityEvents": 5,
      "behaviorChange": 85
    }
  ]
}
```

---

### PUT `/api/employees/:id`
**Summary:** Update employee  
**Description:** Update employee information (analyst+ role required)  
**Authentication:** Required (Analyst or Admin)

#### Request Body
```json
{
  "name": "Sarah Mitchell",
  "email": "sarah.mitchell@company.com",
  "department": "Finance",
  "jobTitle": "Senior Financial Analyst",
  "riskScore": 95,
  "riskLevel": "Critical"
}
```

#### Response (200)
```json
{
  "message": "Employee updated successfully",
  "employee": {
    "id": 1,
    "name": "Sarah Mitchell",
    "email": "sarah.mitchell@company.com",
    "department": "Finance",
    "job_title": "Senior Financial Analyst",
    "risk_score": 95,
    "risk_level": "Critical",
    "updated_at": "2025-01-27T20:30:57.597Z"
  }
}
```

---

### GET `/api/employees/meta/departments`
**Summary:** Get departments list  
**Description:** Retrieve list of all departments with statistics  
**Authentication:** Required

#### Response (200)
```json
{
  "departments": [
    {
      "name": "Finance",
      "employeeCount": 1,
      "avgRiskScore": "92.0"
    },
    {
      "name": "Engineering",
      "employeeCount": 1,
      "avgRiskScore": "78.0"
    }
  ]
}
```

---

### GET `/api/employees/meta/risk-levels`
**Summary:** Get risk levels distribution  
**Description:** Retrieve risk level distribution statistics  
**Authentication:** Required

#### Response (200)
```json
{
  "riskLevels": [
    {
      "level": "Critical",
      "count": 1
    },
    {
      "level": "High",
      "count": 3
    },
    {
      "level": "Medium",
      "count": 1
    },
    {
      "level": "Low",
      "count": 1
    }
  ]
}
```

---

## 👤 **Users** (Admin Only)

### GET `/api/users`
**Summary:** Get all users  
**Description:** Retrieve list of all system users  
**Authentication:** Admin required

#### Response (200)
```json
{
  "users": [
    {
      "id": 1,
      "email": "admin@company.com",
      "name": "System Administrator",
      "role": "admin",
      "department": "IT Security",
      "isActive": true,
      "lastLogin": "2025-01-27T20:30:57.597Z",
      "createdAt": "2025-01-27T20:30:57.597Z",
      "updatedAt": "2025-01-27T20:30:57.597Z"
    }
  ]
}
```

---

### GET `/api/users/:id`
**Summary:** Get user details  
**Description:** Retrieve details of a specific user  
**Authentication:** Admin required

---

### POST `/api/users`
**Summary:** Create new user  
**Description:** Create a new system user account  
**Authentication:** Admin required

#### Request Body
```json
{
  "email": "analyst@company.com",
  "password": "analyst123",
  "name": "Security Analyst",
  "role": "analyst",
  "department": "IT Security"
}
```

#### Response (201)
```json
{
  "message": "User created successfully",
  "user": {
    "id": 2,
    "email": "analyst@company.com",
    "name": "Security Analyst",
    "role": "analyst",
    "department": "IT Security",
    "isActive": true,
    "createdAt": "2025-01-27T20:30:57.597Z"
  }
}
```

---

### PUT `/api/users/:id`
**Summary:** Update user  
**Description:** Update user information  
**Authentication:** Admin required

---

### POST `/api/users/:id/reset-password`
**Summary:** Reset user password  
**Description:** Reset password for a specific user  
**Authentication:** Admin required

#### Request Body
```json
{
  "newPassword": "newpassword123"
}
```

---

### DELETE `/api/users/:id`
**Summary:** Deactivate user  
**Description:** Soft delete user (set inactive)  
**Authentication:** Admin required

---

### GET `/api/users/meta/roles`
**Summary:** Get user roles  
**Description:** Retrieve available user roles and descriptions  
**Authentication:** Admin required

#### Response (200)
```json
{
  "roles": [
    {
      "name": "admin",
      "label": "Administrator",
      "description": "Full system access and user management"
    },
    {
      "name": "analyst",
      "label": "Security Analyst",
      "description": "Can view and manage employee data and violations"
    },
    {
      "name": "viewer",
      "label": "Viewer",
      "description": "Read-only access to dashboard and reports"
    }
  ]
}
```

---

## 💬 **Chat (AI Assistant)**

### GET `/api/chat/history`
**Summary:** Get chat history  
**Description:** Retrieve chat message history for current user  
**Authentication:** Required

#### Query Parameters
- `limit` (integer): Number of messages to return (default: 50)
- `employeeId` (integer): Filter by employee context

#### Response (200)
```json
{
  "messages": [
    {
      "id": 1,
      "type": "user",
      "content": "What are the current security risks?",
      "createdAt": "2025-01-27T20:30:57.597Z",
      "employee": null
    },
    {
      "id": 2,
      "type": "assistant",
      "content": "There are currently 3 employees with high or critical risk levels...",
      "createdAt": "2025-01-27T20:30:57.598Z",
      "employee": null
    }
  ]
}
```

---

### POST `/api/chat/message`
**Summary:** Send chat message to AI assistant  
**Description:** Send message to AI security assistant and receive context-aware response  
**Authentication:** Required

#### Request Body
```json
{
  "message": "Tell me about Sarah Mitchell's risk level",
  "employeeId": 1
}
```

#### Response (200)
```json
{
  "userMessage": {
    "id": 1,
    "type": "user",
    "content": "Tell me about Sarah Mitchell's risk level",
    "createdAt": "2025-01-27T20:30:57.597Z"
  },
  "aiMessage": {
    "id": 2,
    "type": "assistant",
    "content": "Sarah Mitchell currently has a critical risk level with a score of 92/100. This is based on recent behavioral patterns and security events. I recommend increased monitoring and potential investigation.",
    "createdAt": "2025-01-27T20:30:57.598Z"
  }
}
```

---

### DELETE `/api/chat/message/:id`
**Summary:** Delete chat message  
**Description:** Delete a specific chat message (user's own messages only)  
**Authentication:** Required

---

### DELETE `/api/chat/history`
**Summary:** Clear chat history  
**Description:** Clear all chat history for current user  
**Authentication:** Required

#### Query Parameters
- `employeeId` (integer): Clear only messages for specific employee context

---

## ⚙️ **Settings**

### GET `/api/settings`
**Summary:** Get all settings  
**Description:** Retrieve all application settings  
**Authentication:** Required

#### Response (200)
```json
{
  "settings": {
    "company_info": {
      "value": {
        "name": "SecureWatch Corporation",
        "domain": "company.com",
        "address": "123 Business Ave, Suite 100\nNew York, NY 10001",
        "phone": "+1 (555) 123-4567",
        "industry": "Technology",
        "employee_count": 1247,
        "logo_url": ""
      },
      "updatedAt": "2025-01-27T20:30:57.597Z"
    }
  }
}
```

---

### GET `/api/settings/:key`
**Summary:** Get specific setting  
**Description:** Retrieve a specific setting by key  
**Authentication:** Required

---

### PUT `/api/settings/:key`
**Summary:** Update setting  
**Description:** Update a specific setting (admin only)  
**Authentication:** Admin required

---

### GET `/api/settings/company/info`
**Summary:** Get company information  
**Description:** Retrieve company information settings  
**Authentication:** Required

---

### PUT `/api/settings/company/info`
**Summary:** Update company information  
**Description:** Update company information settings  
**Authentication:** Admin required

#### Request Body
```json
{
  "name": "SecureWatch Demo Corporation",
  "domain": "demo.securewatch.com",
  "address": "123 Demo Street\nDemo City, DC 12345",
  "phone": "+1 (555) 123-DEMO",
  "industry": "Cybersecurity",
  "employeeCount": 150,
  "logoUrl": "https://example.com/logo.png"
}
```

---

### GET `/api/settings/email/config`
**Summary:** Get email configuration  
**Description:** Retrieve email configuration (admin only)  
**Authentication:** Admin required

---

### PUT `/api/settings/email/config`
**Summary:** Update email configuration  
**Description:** Update email configuration settings  
**Authentication:** Admin required

---

### GET `/api/settings/dashboard/config`
**Summary:** Get dashboard configuration  
**Description:** Retrieve dashboard configuration settings  
**Authentication:** Required

---

### PUT `/api/settings/dashboard/config`
**Summary:** Update dashboard configuration  
**Description:** Update dashboard configuration settings  
**Authentication:** Admin required

#### Request Body
```json
{
  "refreshInterval": 45,
  "defaultView": "high-risk",
  "alertsEnabled": true,
  "autoRefresh": true
}
```

---

## 🏥 **Health**

### GET `/health`
**Summary:** Health check  
**Description:** Check if the API server is running and healthy  
**Authentication:** None

#### Response (200)
```json
{
  "status": "OK",
  "timestamp": "2025-01-27T20:30:57.247Z",
  "version": "1.0.0"
}
```

---

## 🔑 **Authentication & Authorization**

### Session-Based Authentication
- **Method:** Secure HTTP-only cookies
- **Session Duration:** 8 hours
- **Cookie Name:** `securewatch.session`

### User Roles
- **Admin:** Full system access, user management
- **Analyst:** Employee data management, violations
- **Viewer:** Read-only dashboard access

### Rate Limiting
- **Login endpoint:** 5 attempts per 15 minutes per IP
- **General endpoints:** 100 requests per 15 minutes per IP

---

## 📊 **Response Codes**

- **200:** Success
- **201:** Created
- **400:** Bad Request (validation error)
- **401:** Unauthorized (authentication required)
- **403:** Forbidden (insufficient permissions)
- **404:** Not Found
- **429:** Too Many Requests (rate limited)
- **500:** Internal Server Error

---

## 📝 **Error Response Format**

All error responses follow this format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Common Error Codes
- `NOT_AUTHENTICATED`: User not logged in
- `INSUFFICIENT_PERMISSIONS`: User lacks required role
- `VALIDATION_ERROR`: Request data validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `USER_NOT_FOUND`: User doesn't exist
- `EMPLOYEE_NOT_FOUND`: Employee doesn't exist
- `INVALID_CREDENTIALS`: Wrong email/password

---

## 🧪 **Testing**

### Available Test Accounts
- **Admin:** `admin@company.com` / `admin123`
- **Analyst:** `analyst@company.com` / `analyst123`
- **Viewer:** `viewer@company.com` / `viewer123`

### Test Commands
```bash
# Run API tests and seed database
npm run test-api

# Health check
curl http://localhost:3001/health

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

---

**Base URL:** `http://localhost:3001`  
**Interactive Documentation:** `http://localhost:3001/api-docs` *(when available)*  
**API Status:** 🟢 **Production Ready** 