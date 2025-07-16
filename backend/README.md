# 🛡️ **SecureWatch Backend API**

**Employee Security Monitoring System - Backend Services**

[![API Status](https://img.shields.io/badge/API-Production%20Ready-green)](http://localhost:3001/health)
[![Node.js](https://img.shields.io/badge/Node.js-v23.11.0-blue)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19.2-blue)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://postgresql.org/)

---

## 📋 **Overview**

SecureWatch is a comprehensive employee security monitoring system designed to track and analyze employee behavior patterns, identify potential security risks, and provide real-time insights through an AI-powered assistant.

### **Key Features**
- 🔐 **Session-based Authentication** with role-based access control
- 📊 **Real-time Dashboard** metrics and analytics  
- 👥 **Employee Management** with risk assessment
- 🤖 **AI Security Assistant** for contextual support
- ⚙️ **Configurable Settings** and company management
- 📈 **Violation Tracking** and investigation tools
- 🔒 **Secure API** with rate limiting and validation

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js v18+ (tested with v23.11.0)
- PostgreSQL 12+ database
- npm or yarn package manager

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd SecureWatch/backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
npm run init-db

# Start the server
npm run dev
```

### **Environment Configuration**
Create a `.env` file with the following variables:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=securewatch
DB_USER=your_username
DB_PASSWORD=your_password

# Server Configuration
PORT=3001
NODE_ENV=development

# Session Configuration
SESSION_SECRET=your-super-secret-session-key
SESSION_NAME=securewatch.session

# Security Configuration
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 📚 **API Documentation**

### **Base URL:** `http://localhost:3001`

- **📖 Full Documentation:** [`docs/API-DOCUMENTATION.md`](docs/API-DOCUMENTATION.md)
- **🏥 Health Check:** `GET /health`
- **🔐 Authentication:** Session-based with secure cookies

### **Core Endpoints**
- **Auth:** `/api/auth/*` - Login, logout, session management
- **Dashboard:** `/api/dashboard/*` - Metrics, violations, alerts
- **Employees:** `/api/employees/*` - Employee data and management
- **Users:** `/api/users/*` - User administration (admin only)
- **Chat:** `/api/chat/*` - AI assistant interactions
- **Settings:** `/api/settings/*` - Application configuration

---

## 🗄️ **Database Schema**

### **Core Tables**
- **`users`** - System users with role-based access
- **`employees`** - Employee records with risk assessment
- **`violations`** - Policy violations and investigation data
- **`employee_metrics`** - Daily behavioral metrics
- **`chat_messages`** - AI assistant conversation history
- **`app_settings`** - Application configuration

### **Database Commands**
```bash
# Initialize database and schema
npm run init-db

# Seed with test data
npm run test-api

# View database schema
psql -d securewatch -c "\dt"
```

---

## 🧪 **Testing & Development**

### **Available Scripts**
```bash
# Development server with auto-restart
npm run dev

# Production server
npm start

# Initialize database
npm run init-db

# Run comprehensive API tests
npm run test-api

# Seed database with test data
npm run seed
```

### **Test Accounts**
- **Admin:** `admin@company.com` / `admin123`
- **Analyst:** `analyst@company.com` / `analyst123`  
- **Viewer:** `viewer@company.com` / `viewer123`

### **API Testing**
```bash
# Health check
curl http://localhost:3001/health

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'

# Run full test suite
npm run test-api
```

---

## 🏗️ **Project Structure**

```
backend/
├── server.js                 # Main server file
├── package.json              # Dependencies and scripts
├── .env                      # Environment configuration
├── 
├── src/
│   ├── routes/               # API route handlers
│   │   ├── auth.js          # Authentication endpoints
│   │   ├── dashboard.js     # Dashboard metrics
│   │   ├── employees.js     # Employee management
│   │   ├── users.js         # User administration
│   │   ├── chat.js          # AI assistant
│   │   └── settings.js      # Application settings
│   │   
│   ├── middleware/          # Express middleware
│   │   └── auth.js          # Authentication & authorization
│   │   
│   └── utils/               # Utility functions
│       └── database.js      # Database connection & helpers
│
├── database/                # Database files
│   ├── schema.sql          # Database schema
│   ├── init.js             # Database initialization
│   └── migrations/         # Future migrations
│
├── scripts/                # Utility scripts
│   └── test-api.js         # API testing and seeding
│
└── docs/                   # Documentation
    ├── API-DOCUMENTATION.md # Complete API reference
    └── swagger.js          # Swagger/OpenAPI configuration
```

---

## 🔒 **Security Features**

### **Authentication & Authorization**
- Session-based authentication with secure HTTP-only cookies
- Role-based access control (Admin, Analyst, Viewer)
- Password hashing with bcrypt
- Session timeouts and secure session management

### **API Security**
- Rate limiting on all endpoints (100 req/15min general, 5 req/15min auth)
- CORS protection with configurable origins
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- Request logging and monitoring

### **Data Protection**
- Secure database connections
- Environment variable configuration
- No sensitive data in logs
- Proper error handling without data leakage

---

## 📊 **Performance & Scalability**

### **Database Optimization**
- Connection pooling (20 max connections)
- Proper indexing on frequently queried fields
- Efficient pagination with limit/offset
- Optimized queries with minimal N+1 problems

### **API Performance**
- Async/await patterns for non-blocking operations
- Database query optimization
- Efficient JSON responses
- Graceful error handling

---

## 🔧 **Configuration**

### **Server Settings**
- **Port:** Configurable via `PORT` environment variable
- **CORS:** Configurable allowed origins
- **Session:** Customizable session duration and security
- **Rate Limiting:** Adjustable limits per endpoint

### **Database Settings**
- **Connection:** PostgreSQL with connection pooling
- **Schema:** Automated initialization and migrations
- **Backup:** Standard PostgreSQL backup procedures
- **Monitoring:** Built-in connection health checks

---

## 🚦 **Monitoring & Health**

### **Health Endpoints**
- `GET /health` - Server status and version
- Database connection monitoring
- Session store health checks
- Memory and performance metrics

### **Logging**
- Request/response logging
- Authentication attempt logging
- Error logging with stack traces
- Performance timing logs

---

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### **Development Guidelines**
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting

---

## 📞 **Support & Contact**

- **Issues:** Create a GitHub issue
- **Documentation:** See `docs/` directory
- **API Reference:** [`docs/API-DOCUMENTATION.md`](docs/API-DOCUMENTATION.md)
- **Health Check:** `http://localhost:3001/health`

---

## 📜 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🛡️ SecureWatch Backend - Production Ready API**  
**Version:** 1.0.0 | **Status:** ✅ Active | **Node.js:** v23.11.0 