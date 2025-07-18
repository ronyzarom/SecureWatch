# 🚀 Render Deployment Guide for SecureWatch

This guide will help you deploy SecureWatch to Render with proper environment configuration.

## 🔧 **Required Environment Variables**

### **Step 1: Set Up PostgreSQL Database**

1. In your Render dashboard, create a **PostgreSQL** database
2. Note the database connection details (host, port, name, user, password)
3. You can use either individual DB variables OR the DATABASE_URL

### **Step 2: Configure Environment Variables in Render**

Go to your Render service → **Environment** tab and add these variables:

#### **🔐 Database Configuration**
```bash
# Option A: Individual database variables
DB_HOST=your_render_postgres_host
DB_PORT=5432
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password

# Option B: Use Render's DATABASE_URL (recommended)
# DATABASE_URL=postgresql://user:password@host:port/database
# (Render provides this automatically if you link a PostgreSQL database)
```

#### **🌐 Application Settings**
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-app.onrender.com
```

#### **🔑 Security & Authentication**
```bash
# Generate strong random strings for these
SESSION_SECRET=your_super_secret_session_key_change_this_in_production
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
```

#### **🤖 AI Configuration**
```bash
# Required for AI-powered security analysis
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

## 🛠️ **Deployment Steps**

### **Step 1: Prepare Your Repository**

Ensure your repository has these files in the root:
- `start-app.sh` (deployment script)
- `package.json` (with all dependencies)

### **Step 2: Create Render Services**

1. **Backend Service**:
   - **Type**: Web Service
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `./start-app.sh`
   - **Environment**: Node.js

2. **Frontend Service** (if separate):
   - **Type**: Static Site
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### **Step 3: Link PostgreSQL Database**

1. Create PostgreSQL database in Render
2. Link it to your backend service
3. Render will automatically provide `DATABASE_URL`

### **Step 4: Configure Environment Variables**

Add all the environment variables listed above in your service's Environment tab.

## 🔧 **Fix Common Issues**

### **Issue: Backend fails to start**

**Symptoms**: "Backend API failed to start within 30 seconds"

**Solutions**:
1. **Check environment variables** - Ensure all required vars are set
2. **Database connection** - Verify DATABASE_URL or DB_* variables
3. **OpenAI API Key** - Make sure it's valid and has credits
4. **Port configuration** - Render sets PORT automatically
5. **Build logs** - Check Render build logs for specific errors

### **Issue: Database connection fails**

**Solutions**:
1. Use `DATABASE_URL` provided by Render PostgreSQL
2. Or set individual DB_* variables manually
3. Ensure database is linked to your service
4. Check database credentials in Render dashboard

### **Issue: AI features not working**

**Solutions**:
1. Set valid `OPENAI_API_KEY`
2. Ensure OpenAI account has sufficient credits
3. Check API key permissions

## 🎯 **Environment Variables Checklist**

**✅ Required for Basic Functionality:**
- [ ] `DATABASE_URL` or `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- [ ] `SESSION_SECRET`
- [ ] `JWT_SECRET`
- [ ] `NODE_ENV=production`
- [ ] `FRONTEND_URL`

**✅ Required for AI Features:**
- [ ] `OPENAI_API_KEY`

**✅ Optional but Recommended:**
- [ ] `BCRYPT_ROUNDS=12`
- [ ] `JWT_EXPIRES_IN=24h`

## 🚨 **Security Notes**

1. **Never commit `.env` files** to your repository
2. **Use strong, random secrets** for SESSION_SECRET and JWT_SECRET
3. **Rotate secrets regularly** in production
4. **Limit API key permissions** (OpenAI, integrations)
5. **Use Render's environment variables** instead of hardcoded values

## 🔄 **Database Setup Commands**

After deployment, you may need to run database migrations:

```bash
# SSH into your Render service or run locally against Render DB
cd backend
node -e "
const { query } = require('./src/utils/database');
const fs = require('fs');

// Apply schemas
const schemas = [
  './database/schema.sql',
  './database/google-workspace-schema.sql',
  './database/teams-schema.sql',
  './database/mfa-schema.sql',
  './database/custom-categories-schema.sql',
  './database/violation-status-enhancement.sql'
];

schemas.forEach(async (schema) => {
  if (fs.existsSync(schema)) {
    const sql = fs.readFileSync(schema, 'utf8');
    await query(sql);
    console.log('Applied:', schema);
  }
});
"
```

## 📞 **Support**

If you encounter issues:

1. **Check Render logs** in your service dashboard
2. **Verify environment variables** are set correctly
3. **Test database connection** using Render's console
4. **Review this guide** for missing steps

## 🎉 **Success Checklist**

Your deployment is successful when:
- [ ] Backend starts without errors
- [ ] Database connection works
- [ ] Frontend can connect to backend
- [ ] AI features work (if OpenAI key is set)
- [ ] Authentication works
- [ ] Integration pages load

---

**🚀 Happy deploying!** Your SecureWatch application should now be running smoothly on Render. 