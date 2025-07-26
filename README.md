# SecureWatch - Enterprise Communication Monitoring Platform

SecureWatch is a comprehensive enterprise communication monitoring and compliance platform that provides real-time security analysis, policy enforcement, and regulatory compliance across email, messaging, and collaboration platforms.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- Google Workspace and/or Office365 API credentials (optional)

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd SecureWatch
   npm install
   cd backend && npm install
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp backend/.env.example backend/.env
   # Configure your database and API credentials
   ```

3. **Database Setup**
   ```bash
   cd backend
   node database/init.js
   ```

4. **Start Development Servers**
   
   **Backend (Port 3001):**
   ```bash
   cd backend
   npm run dev
   # or
   node server.js
   ```
   
   **Frontend (Port 5173):**
   ```bash
   npm run dev
   ```

5. **Stop Development Servers**
   ```bash
   # Use the convenient kill script (runs immediately)
   ./kill_app.sh
   
   # With confirmation prompt
   ./kill_app.sh --confirm
   
   # Get help
   ./kill_app.sh --help
   ```

## 🔪 Kill App Script

The `kill_app.sh` script provides a reliable way to terminate all SecureWatch processes:

### Features
- **Graceful Termination**: Attempts SIGTERM first, then SIGKILL if necessary
- **Port-Based Detection**: Finds processes on ports 3001 (backend) and 5173 (frontend)
- **Name-Based Detection**: Backup method using process name patterns
- **Detailed Logging**: Shows which processes are being terminated
- **Immediate Execution**: Runs without confirmation by default for convenience
- **Optional Confirmation**: Use --confirm flag for safety prompt when needed
- **Status Verification**: Confirms all processes are successfully terminated

### Usage
```bash
# Default mode (immediate execution)
./kill_app.sh

# With confirmation prompt
./kill_app.sh --confirm

# Help
./kill_app.sh --help
```

### What It Kills
- **Backend processes** running on port 3001 (Express.js server)
- **Frontend processes** running on port 5173 (Vite dev server)
- **Related processes** by name patterns (node server.js, vite dev, npm dev, yarn dev)

## 🛡️ Features

### Core Capabilities
- **📧 Email Monitoring**: Bidirectional email sync (inbox + sent) with Google Workspace and Office365
- **💬 Messaging Integration**: Teams, Slack, and other collaboration platforms
- **🔍 AI-Powered Analysis**: Multi-layered threat detection with LLM integration
- **📋 Compliance Framework**: GDPR, SOX, HIPAA, PCI DSS automated monitoring
- **📊 Risk Scoring**: Comprehensive risk assessment and behavioral analysis
- **🚨 Real-time Alerts**: Instant notification of policy violations and security threats

### Enhanced Features
- **Sent Email Monitoring**: Complete bidirectional communication monitoring (NEW)
- **Message Direction Tracking**: Inbound/outbound analysis for complete context
- **Enhanced Compliance**: DLP capabilities for outbound communications
- **Insider Threat Detection**: Advanced behavioral analysis through sent emails
- **Unified Analytics**: Cross-platform communication insights

### Security Features
- **Multi-layered Detection**: Rules-based, pattern matching, and AI analysis
- **Policy Enforcement**: Automated policy evaluation and violation detection
- **Audit Trails**: Complete compliance documentation and reporting
- **Data Protection**: Encrypted storage and secure API communication

## 🗄️ Database

SecureWatch uses PostgreSQL with enhanced schema for message direction tracking:
- **Enhanced Tables**: All message tables include `message_type` and `message_direction` columns
- **Bidirectional Support**: Complete tracking of inbound and outbound communications
- **Compliance Ready**: Built-in support for regulatory frameworks

### Database Management
```bash
# Clean database for testing
cd backend
node scripts/cleanup-all-connectors.js --nuclear

# Regular cleanup (preserves core data)
node scripts/cleanup-all-connectors.js
```

## 📁 Project Structure

```
SecureWatch/
├── src/                          # Frontend React application
├── backend/                      # Node.js backend server
│   ├── src/
│   │   ├── routes/              # API endpoints
│   │   ├── services/            # Integration connectors
│   │   └── middleware/          # Authentication & security
│   ├── database/                # Database schema and migrations
│   └── scripts/                 # Utility scripts
├── config/                       # Configuration files
├── kill_app.sh                  # Process termination script
└── SENT-EMAILS-IMPLEMENTATION.md # Implementation documentation
```

## 🔧 Development

### Available Scripts
- `npm run dev` - Start frontend development server
- `npm run build` - Build for production
- `./kill_app.sh` - Stop all development servers
- `backend/scripts/cleanup-all-connectors.js` - Database cleanup

### Key Technologies
- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js, PostgreSQL
- **Integration**: Google APIs, Microsoft Graph API, Slack API
- **Security**: JWT authentication, session management, encryption

## 📚 Documentation

- [Sent Emails Implementation](SENT-EMAILS-IMPLEMENTATION.md) - Comprehensive guide to bidirectional email monitoring
- [Quick Start Guide](QUICK-START.md) - Getting started with SecureWatch
- [Deployment Guide](DEPLOYMENT-GUIDE.md) - Production deployment instructions
- [Policy System Implementation](POLICY-SYSTEM-IMPLEMENTATION.md) - Policy framework details

## 🔒 Security & Compliance

SecureWatch provides enterprise-grade security monitoring with:
- **Complete Communication Coverage**: Bidirectional email and messaging monitoring
- **Regulatory Compliance**: Automated GDPR, SOX, HIPAA, PCI DSS monitoring
- **Advanced Threat Detection**: AI-powered analysis with multiple detection layers
- **Data Loss Prevention**: Outbound communication monitoring for data protection
- **Audit & Reporting**: Complete compliance documentation and reporting

## 📞 Support

For technical support or questions about SecureWatch implementation, please refer to the documentation files or contact the development team.

---

**SecureWatch - Comprehensive Enterprise Communication Security** 🛡️ 