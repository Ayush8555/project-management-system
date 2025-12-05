import { verifyAccessToken } from '../utils/jwt.js';

/**
 * Middleware to verify access token and attach user to request
 */
export const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token is required',
        code: 'NO_TOKEN'
      });
    }

    // Verify token
    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(403).json({ 
        error: 'Invalid or expired access token',
        code: 'INVALID_TOKEN'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.user = {
          id: decoded.userId || decoded.id,
          email: decoded.email,
        };
      }
    }

    next();
  } catch (error) {
    // Continue even if auth fails
    next();
  }
};

