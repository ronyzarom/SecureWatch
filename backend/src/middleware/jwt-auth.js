const jwt = require('jsonwebtoken');
const { query } = require('../utils/database');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    department: user.department
  };
  
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'securewatch',
    audience: 'securewatch-api'
  });
};

// Middleware to require JWT authentication
const requireJWT = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'JWT token required in Authorization header',
        code: 'JWT_TOKEN_REQUIRED'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'securewatch',
        audience: 'securewatch-api'
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          error: 'JWT token has expired',
          code: 'JWT_TOKEN_EXPIRED'
        });
      } else if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          error: 'Invalid JWT token',
          code: 'JWT_TOKEN_INVALID'
        });
      } else {
        throw jwtError;
      }
    }

    // Get fresh user details from database
    const result = await query(
      'SELECT id, email, name, role, department, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = result.rows[0];

    // Check if user is still active
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account has been deactivated',
        code: 'ACCOUNT_INACTIVE'
      });
    }

    // Add user to request object
    req.user = user;
    req.jwtPayload = decoded;
    
    next();
  } catch (error) {
    console.error('JWT auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication service error',
      code: 'AUTH_SERVICE_ERROR'
    });
  }
};

// Middleware to require specific role with JWT
const requireJWTRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'JWT authentication required',
        code: 'JWT_AUTH_REQUIRED'
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

module.exports = {
  generateToken,
  requireJWT,
  requireJWTRole,
  JWT_SECRET,
  JWT_EXPIRES_IN
}; 