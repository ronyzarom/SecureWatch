console.log('🔄 Loading SecureWatch Backend...');
console.log('📦 Loading dependencies...');

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./docs/swagger');

console.log('📁 Loading environment configuration...');
require('dotenv').config();

console.log('🚀 Initializing Express app...');
const app = express();
const PORT = process.env.PORT || 3001;

console.log(`🔧 Configuration loaded:`);
console.log(`   - PORT: ${PORT}`);
console.log(`   - NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`   - DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`   - FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
console.log(`   - SESSION_SECRET: ${process.env.SESSION_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   - OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Not set'}`);

// Import routes
console.log('📋 Loading route modules...');
const authRoutes = require('./src/routes/auth');
console.log('   ✅ Auth routes loaded');
const employeeRoutes = require('./src/routes/employees');
console.log('   ✅ Employee routes loaded');
const dashboardRoutes = require('./src/routes/dashboard');
console.log('   ✅ Dashboard routes loaded');
const emailRoutes = require('./src/routes/emails');
console.log('   ✅ Email routes loaded');
const violationRoutes = require('./src/routes/violations');
console.log('   ✅ Violation routes loaded');
const activityReportsRoutes = require('./src/routes/activity-reports');
console.log('   ✅ Activity reports routes loaded');
const userRoutes = require('./src/routes/users');
console.log('   ✅ User routes loaded');
const adminRoutes = require('./src/routes/admin');
console.log('   ✅ Admin routes loaded');
const policyRoutes = require('./src/routes/policies');
console.log('   ✅ Policy routes loaded');
const chatRoutes = require('./src/routes/chat');
console.log('   ✅ Chat routes loaded');
const settingsRoutes = require('./src/routes/settings');
console.log('   ✅ Settings routes loaded');
const integrationsRoutes = require('./src/routes/integrations');
console.log('   ✅ Integrations routes loaded');
const categoriesRoutes = require('./src/routes/categories');
console.log('   ✅ Categories routes loaded');
const mfaRoutes = require('./src/routes/mfa');
console.log('   ✅ MFA routes loaded');
const notificationRoutes = require('./src/routes/notifications');
console.log('   ✅ Notification routes loaded');

// Import services
console.log('🔧 Loading services...');
const policyActionExecutor = require('./src/services/policyActionExecutor');
console.log('   ✅ Policy Action Executor loaded');

// Middleware
console.log('🔗 Setting up middleware...');
app.use(express.json({ limit: '10mb' }));
console.log('   ✅ JSON parser middleware configured');
app.use(express.urlencoded({ extended: true }));
console.log('   ✅ URL-encoded parser middleware configured');

// CORS configuration
console.log('🌐 Configuring CORS...');
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
console.log(`   ✅ CORS configured for: ${process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'localhost development'}`);

// Session configuration
console.log('🔐 Configuring session middleware...');
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to false for development (HTTP)
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax' // Allow cross-origin in dev
  },
  name: 'securewatch.session'
}));
console.log('   ✅ Session middleware configured');

// Request logging middleware
console.log('📝 Setting up request logging...');
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
console.log('   ✅ Request logging middleware configured');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if the API server is running and healthy
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-01-27T20:30:57.247Z"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *             example:
 *               status: OK
 *               timestamp: "2025-01-27T20:30:57.247Z"
 *               version: "1.0.0"
 */
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Root endpoint will be handled by static file serving in production
// In development, show API information
if (process.env.NODE_ENV !== 'production') {
  app.get('/', (req, res) => {
    res.json({
      name: 'SecureWatch API',
      version: '1.0.0',
      description: 'Enterprise security monitoring and threat detection platform',
      status: 'running',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: '/health',
        documentation: '/api-docs',
        api: {
          authentication: '/api/auth',
          dashboard: '/api/dashboard',
          employees: '/api/employees',
          violations: '/api/violations',
          policies: '/api/policies',
          integrations: '/api/integrations',
          reports: '/api/activity-reports',
          settings: '/api/settings',
          chat: '/api/chat'
        }
      },
      environment: process.env.NODE_ENV || 'development'
    });
  });
}

// CORS test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    message: 'CORS test successful',
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    method: req.method,
    headers: req.headers
  });
});

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SecureWatch API Documentation'
}));

// API Routes
console.log('🛣️  Registering API routes...');
app.use('/api/auth', authRoutes);
console.log('   ✅ /api/auth routes registered');
app.use('/api/dashboard', dashboardRoutes);
console.log('   ✅ /api/dashboard routes registered');
app.use('/api/employees', employeeRoutes);
console.log('   ✅ /api/employees routes registered');
app.use('/api/violations', violationRoutes);
console.log('   ✅ /api/violations routes registered');
app.use('/api/policies', policyRoutes);
console.log('   ✅ /api/policies routes registered');
app.use('/api/categories', categoriesRoutes);
console.log('   ✅ /api/categories routes registered');
app.use('/api/emails', emailRoutes);
console.log('   ✅ /api/emails routes registered');
app.use('/api/integrations', integrationsRoutes);
console.log('   ✅ /api/integrations routes registered');
app.use('/api/activity-reports', activityReportsRoutes);
console.log('   ✅ /api/activity-reports routes registered');
app.use('/api/users', userRoutes);
console.log('   ✅ /api/users routes registered');
app.use('/api/admin', adminRoutes);
console.log('   ✅ /api/admin routes registered');
app.use('/api/chat', chatRoutes);
console.log('   ✅ /api/chat routes registered');
app.use('/api/settings', settingsRoutes);
console.log('   ✅ /api/settings routes registered');
app.use('/api/mfa', mfaRoutes);
console.log('   ✅ /api/mfa routes registered');
app.use('/api/notifications', notificationRoutes);
console.log('   ✅ /api/notifications routes registered');

// Static file serving for frontend
console.log('🌐 Configuring static file serving...');
const path = require('path');

// Serve static files from the frontend build directory
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../dist');
  console.log(`   📁 Serving static files from: ${frontendPath}`);
  
  // Serve static assets
  app.use(express.static(frontendPath));
  console.log('   ✅ Static file middleware configured');
  
  // Serve index.html for all non-API routes (SPA routing)
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/api-docs')) {
      return res.status(404).json({ 
        error: 'API route not found',
        path: req.originalUrl 
      });
    }
    
    const indexPath = path.join(frontendPath, 'index.html');
    console.log(`   📄 Serving SPA: ${req.path} -> index.html`);
    res.sendFile(indexPath);
  });
  console.log('   ✅ SPA routing configured');
} else {
  console.log('   ⚠️  Static serving disabled in development mode');
  
  // 404 handler for development
  app.use('*', (req, res) => {
    res.status(404).json({ 
      error: 'Route not found (development mode)',
      path: req.originalUrl,
      message: 'In development, frontend runs separately on port 5173'
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
console.log('🚀 Starting HTTP server...');
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
console.log(`   📍 Host: ${HOST}`);
console.log(`   📍 Port: ${PORT}`);
console.log(`   📍 Environment: ${process.env.NODE_ENV || 'development'}`);

const server = app.listen(PORT, HOST, () => {
  console.log('');
  console.log('🎉 ==================================================');
  console.log('🚀 SecureWatch Backend Successfully Started!');
  console.log('🎉 ==================================================');
  console.log(`🌐 Server running on: http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
  console.log(`🛠️  Test endpoint: http://${HOST}:${PORT}/api/test`);
  console.log('');
  
  // Log database status
  if (process.env.DATABASE_URL) {
    console.log('💾 Database: ✅ Connected (PostgreSQL)');
  } else {
    console.log('💾 Database: ⚠️  No DATABASE_URL configured');
  }
  
  // Log security status
  console.log(`🔐 Session Secret: ${process.env.SESSION_SECRET ? '✅ Configured' : '⚠️  Using default'}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '⚠️  Using default'}`);
  console.log(`🤖 OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  
  console.log('');
  console.log('📋 Starting background services...');
  
  // Start policy action executor after a brief delay to ensure server is ready
  setTimeout(() => {
    try {
      console.log('🔄 Initializing Policy Action Executor...');
      policyActionExecutor.start();
      console.log('✅ Policy Action Executor started successfully');
    } catch (error) {
      console.error('⚠️  Failed to start Policy Action Executor:', error.message);
      console.error('Stack:', error.stack);
    }
  }, 2000);
  
  console.log('');
  console.log('🎯 Server is ready to accept requests!');
  console.log('==================================================');
});

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`💥 Port ${PORT} is already in use!`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  policyActionExecutor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  policyActionExecutor.stop();
  process.exit(0);
}); 