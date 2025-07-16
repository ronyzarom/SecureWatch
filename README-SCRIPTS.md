# 🔧 **SecureWatch Utility Scripts**

Two powerful shell scripts to manage your SecureWatch application development workflow.

---

## 📜 **Available Scripts**

### **🛑 `./kill-app.sh`** - Stop All Processes
Comprehensive cleanup script that kills all SecureWatch processes and frees up ports.

### **🚀 `./start-app.sh`** - Start Application Stack
Intelligent startup script that launches both backend and frontend with full status monitoring.

---

## 🔧 **Script Features**

### **🛑 Kill App Script (`./kill-app.sh`)**

#### **What it does:**
- 🔍 **Port Cleanup:** Kills processes on ports 3001, 5173, 5174
- 🎯 **Process Hunting:** Finds and terminates Node.js, Vite, and related processes
- 🧹 **Smart Cleanup:** Uses multiple killing strategies (SIGTERM → SIGKILL)
- ✅ **Verification:** Confirms all processes are actually stopped
- 📊 **Status Report:** Shows final port status

#### **Usage:**
```bash
./kill-app.sh
```

#### **Output Example:**
```
🛑 Stopping SecureWatch Application...
==================================================
🎯 Stopping Backend Services...
🔍 Checking port 3001 (Backend API)...
⚠️  Found processes on port 3001: 12345
🔫 Killing process 12345...
✅ Successfully killed process 12345
✅ Port 3001 is now free

🎯 Stopping Frontend Services...
🔍 Checking port 5173 (Frontend (Vite))...
✅ Port 5173 is already free

📊 Final Port Status Check...
==================================================
✅ Port 3001: FREE
✅ Port 5173: FREE
✅ Port 5174: FREE

🎉 SecureWatch application cleanup complete!
```

---

### **🚀 Start App Script (`./start-app.sh`)**

#### **What it does:**
- 📋 **System Check:** Displays OS, Node.js, npm, PostgreSQL versions
- 🗄️ **Database Info:** Shows DB connection details from `.env` file
- 🔍 **DB Connection Test:** Verifies PostgreSQL connectivity
- 🔌 **Port Status:** Checks if required ports are available
- 🎯 **Smart Startup:** Starts backend first, then frontend
- ⏳ **Health Monitoring:** Waits for services to be ready
- 📖 **Comprehensive Info:** Shows URLs, test accounts, log locations

#### **Usage:**
```bash
./start-app.sh
```

#### **Output Example:**
```
🚀 Starting SecureWatch Application...
==================================================

📋 System Information
==================================================
🖥️  OS: Darwin 24.5.0
📦 Node.js: v23.11.0
📦 npm: 10.9.0
🐘 PostgreSQL: psql (PostgreSQL) 15.4

🗄️  Database Configuration
==================================================
📁 Configuration file: backend/.env
🌐 Host: localhost
🔌 Port: 5432
📊 Database: securewatch
👤 User: ronyzaromil
🔍 Testing database connection...
✅ Database connection successful

🔌 Port Status Check
==================================================
✅ Port 3001 (Backend): FREE
✅ Port 5173 (Frontend): FREE
✅ Port 5174 (Frontend Alt): FREE

🎯 Starting Backend Services...
==================================================
🚀 Starting backend server...
✅ Backend started with PID: 12345
⏳ Waiting for Backend API to start on port 3001...
✅ Backend API is running on port 3001
🌐 Backend API URL: http://localhost:3001
🏥 Health Check: http://localhost:3001/health
📚 API Docs: http://localhost:3001/api-docs

🎯 Starting Frontend Services...
==================================================
🚀 Starting frontend development server...
✅ Frontend started with PID: 12346
✅ Frontend is running on port 5173
🌐 Frontend URL: http://localhost:5173

🎉 SecureWatch Application Status
==================================================
✅ Backend API: Running on http://localhost:3001
✅ Frontend: Running on http://localhost:5173

📖 Useful URLs:
   • Frontend App: http://localhost:5173 (or 5174)
   • Backend API: http://localhost:3001
   • Health Check: http://localhost:3001/health
   • API Documentation: http://localhost:3001/api-docs

🧪 Test Accounts:
   • Admin: admin@company.com / admin123
   • Analyst: analyst@company.com / analyst123
   • Viewer: viewer@company.com / viewer123

📜 Log Files:
   • Backend: tail -f backend.log
   • Frontend: tail -f frontend.log

🛑 To stop the application: ./kill-app.sh
```

---

## 🔄 **Typical Workflow**

### **Daily Development Cycle:**
```bash
# 1. Clean slate start
./kill-app.sh    # Clean up any running processes
./start-app.sh   # Start both services with full diagnostics

# 2. During development
tail -f backend.log   # Monitor backend
tail -f frontend.log  # Monitor frontend

# 3. End of session
./kill-app.sh    # Clean shutdown
```

### **Troubleshooting:**
```bash
# If ports are stuck
./kill-app.sh    # Force cleanup

# If database issues
./start-app.sh   # Will show DB connection status

# Check individual logs
tail -f backend.log
tail -f frontend.log
```

---

## 🧩 **Advanced Features**

### **🔍 Intelligent Process Detection**
- Searches by port number AND process pattern
- Handles multiple Node.js versions
- Detects both npm and direct node processes
- Supports nodemon and development servers

### **🛡️ Safe Process Termination**
- Graceful shutdown attempts first (SIGTERM)
- Force kill as fallback (SIGKILL)
- Process verification after termination
- Port liberation confirmation

### **📊 Comprehensive Status Reporting**
- Color-coded output for easy reading
- Real-time service health monitoring
- Database connectivity testing
- Dependency version checking

### **🚨 Error Handling**
- Pre-flight checks before starting
- Dependency installation verification
- Port conflict detection
- Service startup timeout handling

---

## 🔧 **Configuration**

### **Environment Requirements:**
- **Shell:** Bash (macOS default)
- **Commands:** `lsof`, `pgrep`, `pkill`, `psql`
- **Files:** `backend/.env` for database config

### **Script Customization:**
Edit the scripts to modify:
- **Timeout Values:** Service startup wait times
- **Port Numbers:** Add/remove monitored ports
- **Log Locations:** Change log file paths
- **Color Schemes:** Modify output colors

---

## 📝 **Script Locations**

- **Kill Script:** `./kill-app.sh` (Project root)
- **Start Script:** `./start-app.sh` (Project root)
- **Backend Logs:** `./backend.log` (Project root)
- **Frontend Logs:** `./frontend.log` (Project root)

---

## 🆘 **Troubleshooting**

### **Common Issues:**

#### **Scripts won't run:**
```bash
chmod +x kill-app.sh start-app.sh
```

#### **Permission denied:**
```bash
sudo ./kill-app.sh    # If needed for system processes
```

#### **Database connection fails:**
- Check PostgreSQL is running
- Verify `backend/.env` credentials
- Test manual connection: `psql -h localhost -U username -d securewatch`

#### **Ports still in use:**
```bash
lsof -i:3001    # Check what's using the port
sudo lsof -i:3001    # If system process
```

#### **Frontend won't start:**
- Check Node.js version compatibility
- Verify `package.json` exists
- Try: `npm install` in project root

---

## 🎯 **Benefits**

- **⚡ Fast Development:** One-command startup/shutdown
- **🔍 Visibility:** Complete system status at a glance
- **🛡️ Reliability:** Handles edge cases and conflicts
- **📊 Monitoring:** Real-time service health checks
- **🧹 Clean State:** Ensures fresh starts every time
- **📚 Documentation:** Built-in help and URLs

---

**🔧 SecureWatch Utility Scripts - Streamlined Development Workflow**  
**Version:** 1.0.0 | **Compatibility:** macOS/Linux | **Shell:** Bash 