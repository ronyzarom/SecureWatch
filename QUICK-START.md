# 🚀 **SecureWatch Quick Start Guide**

Get your SecureWatch application running in seconds with our automated utility scripts!

---

## ⚡ **One-Command Setup**

### **🛑 Clean Shutdown:**
```bash
./kill-app.sh
```
Safely stops all SecureWatch processes and frees up ports.

### **🚀 Full Startup:**
```bash
./start-app.sh
```
Intelligent startup with system diagnostics, database testing, and service monitoring.

---

## 🎯 **What You Get**

### **📊 System Status Dashboard**
- ✅ **OS & Environment:** Node.js, npm, PostgreSQL versions
- ✅ **Database Health:** Connection testing and configuration display
- ✅ **Port Monitoring:** Real-time port availability checking
- ✅ **Service Health:** Backend/frontend startup verification

### **🔗 Live Service URLs**
- **🌐 Frontend App:** http://localhost:5173 (or 5174)
- **🔧 Backend API:** http://localhost:3001
- **🏥 Health Check:** http://localhost:3001/health
- **📚 API Documentation:** http://localhost:3001/api-docs

### **🧪 Ready-to-Use Test Accounts**
- **👑 Admin:** `admin@company.com` / `admin123`
- **🔍 Analyst:** `analyst@company.com` / `analyst123`
- **👀 Viewer:** `viewer@company.com` / `viewer123`

---

## 🔄 **Development Workflow**

### **Daily Routine:**
```bash
# Morning startup
./kill-app.sh      # Clean slate
./start-app.sh     # Full system startup

# During development
tail -f backend.log    # Monitor backend
tail -f frontend.log   # Monitor frontend

# End of day
./kill-app.sh      # Clean shutdown
```

### **Troubleshooting:**
```bash
# If something's stuck
./kill-app.sh && ./start-app.sh

# Check logs
tail -f backend.log
tail -f frontend.log

# Manual port check
lsof -i:3001    # Backend
lsof -i:5173    # Frontend
```

---

## 📋 **Script Output Examples**

### **🛑 Kill Script Success:**
```
🛑 Stopping SecureWatch Application...
🎯 Stopping Backend Services...
✅ Port 3001 is now free
🎯 Stopping Frontend Services...
✅ Port 5173 is now free
🎉 SecureWatch application cleanup complete!
```

### **🚀 Start Script Success:**
```
🚀 Starting SecureWatch Application...
📋 System Information
🖥️  OS: Darwin 24.5.0
📦 Node.js: v23.11.0
🗄️  Database Configuration
✅ Database connection successful
🎯 Starting Backend Services...
✅ Backend API is running on port 3001
🎯 Starting Frontend Services...
✅ Frontend is running on port 5173
🎉 SecureWatch Application Status
✅ Backend API: Running on http://localhost:3001
✅ Frontend: Running on http://localhost:5173
```

---

## 🛠️ **Prerequisites Check**

Before running scripts, ensure you have:

### **✅ Required Software:**
- **Node.js v18+** (tested with v23.11.0)
- **PostgreSQL** running and accessible
- **npm** package manager

### **✅ Configuration Files:**
- **`backend/.env`** with database credentials
- **`backend/package.json`** with dependencies
- **`package.json`** (frontend) with vite scripts

### **✅ Database Setup:**
```bash
# One-time database initialization
cd backend && npm run init-db
```

---

## 🔧 **Script Features**

### **🛡️ Intelligent Process Management**
- **Multi-strategy killing:** Graceful → Force termination
- **Pattern matching:** Finds processes by port AND name
- **Verification:** Confirms processes are actually stopped
- **Safety checks:** Prevents accidental system process killing

### **📊 Comprehensive Monitoring**
- **Real-time status:** Service health checking
- **Database testing:** Connection verification
- **Dependency checking:** Version compatibility
- **Error reporting:** Detailed failure diagnostics

### **🎨 User Experience**
- **Color-coded output:** Easy visual scanning
- **Progress indicators:** Real-time status updates
- **Helpful URLs:** Direct links to services
- **Log file locations:** Easy troubleshooting access

---

## 🆘 **Common Issues & Solutions**

### **❌ "Permission denied" on scripts:**
```bash
chmod +x kill-app.sh start-app.sh
```

### **❌ "Database connection failed":**
1. Check PostgreSQL is running: `brew services start postgresql`
2. Verify credentials in `backend/.env`
3. Test manually: `psql -h localhost -U username -d securewatch`

### **❌ "Port already in use":**
```bash
./kill-app.sh    # Force cleanup
lsof -i:3001     # Check what's using port
```

### **❌ "Frontend won't start":**
1. Install dependencies: `npm install`
2. Check Node.js version: `node --version`
3. Verify package.json exists and has "dev" script

### **❌ "Backend fails to start":**
1. Check database is running
2. Verify `backend/.env` configuration  
3. Install backend dependencies: `cd backend && npm install`

---

## 📁 **File Locations**

```
SecureWatch/
├── kill-app.sh          # Process cleanup script
├── start-app.sh         # Application startup script
├── backend.log          # Backend service logs
├── frontend.log         # Frontend service logs
├── backend/
│   ├── .env            # Database configuration
│   ├── server.js       # Backend entry point
│   └── package.json    # Backend dependencies
└── package.json        # Frontend dependencies
```

---

## 🎯 **Pro Tips**

### **⚡ Speed up development:**
- Create shell aliases: `alias start='./start-app.sh'`
- Use tmux/screen for persistent sessions
- Set up IDE terminal splits for logs

### **🔍 Advanced monitoring:**
```bash
# Watch logs in real-time
tail -f backend.log frontend.log

# Monitor all ports
watch 'lsof -i:3001,5173,5174'

# System resource usage
htop -p $(pgrep -f "node.*server")
```

### **🚀 Production deployment:**
- Scripts work great for staging environments
- Modify ports for production settings
- Add environment-specific configurations

---

**🚀 Ready to develop? Just run `./start-app.sh` and you're live in seconds!**

---

**🔧 SecureWatch Quick Start - Zero-Configuration Development**  
**Last Updated:** 2025-01-27 | **Scripts Version:** 1.0.0 