const { query } = require('../utils/database');

// Middleware to require authentication
const requireAuth = async (req, res, next) => {
  try {
    // Check if user is logged in
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Get user details from database
    const result = await query(
      'SELECT id, email, name, role, department, is_active FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      // User not found, clear session
      req.session.destroy();
      return res.status(401).json({ 
        error: 'Invalid user session',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      req.session.destroy();
      return res.status(401).json({ 
        error: 'Account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Add user to request object
    req.user = user;
    
    // Update last login timestamp
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Middleware to require specific role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has required role
    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        error: `${requiredRole} role required`,
        code: 'INSUFFICIENT_PERMISSIONS',
        userRole: req.user.role,
        requiredRole
      });
    }

    next();
  };
};

// Middleware to require admin role
const requireAdmin = requireRole('admin');

// Middleware to require analyst or admin role
const requireAnalyst = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
  }

  if (!['admin', 'analyst'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Analyst or Admin role required',
      code: 'INSUFFICIENT_PERMISSIONS',
      userRole: req.user.role,
      requiredRoles: ['admin', 'analyst']
    });
  }

  next();
};

// Optional auth middleware (doesn't block if not authenticated)
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const result = await query(
        'SELECT id, email, name, role, department, is_active FROM users WHERE id = $1',
        [req.session.userId]
      );

      if (result.rows.length > 0 && result.rows[0].is_active) {
        req.user = result.rows[0];
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without authentication
    next();
  }
};

// Rate limiting middleware (simple implementation)
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get existing requests for this IP
    let userRequests = requests.get(key) || [];
    
    // Filter out old requests
    userRequests = userRequests.filter(time => time > windowStart);

    // Check if limit exceeded
    if (userRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    userRequests.push(now);
    requests.set(key, userRequests);

    next();
  };
};

// Input validation middleware
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.body = value; // Use validated/sanitized data
    next();
  };
};

// Log request middleware
const logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const user = req.user ? req.user.email : 'anonymous';
    console.log(`📝 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - ${user}`);
  });

  next();
};

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAnalyst,
  optionalAuth,
  rateLimit,
  validateInput,
  logRequest
}; 