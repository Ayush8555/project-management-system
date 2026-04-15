import express from 'express';
import bcrypt from 'bcrypt';
import prisma from '../configs/prisma.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../utils/jwt.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Register new user
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email, and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    // Check for pending invites
    const pendingInvites = await prisma.pendingInvite.findMany({
      where: { email: email.toLowerCase() },
    });

    if (pendingInvites.length > 0) {
      const memberships = pendingInvites.map((invite) => ({
        userId: user.id,
        workspaceId: invite.workspaceId,
        role: invite.role,
      }));

      await prisma.workspaceMember.createMany({
        data: memberships,
        skipDuplicates: true,
      });

      // Delete pending invites
      await prisma.pendingInvite.deleteMany({
        where: { email: email.toLowerCase() },
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshTokenValue = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      user,
      accessToken,
    });
  } catch (error) {
    // Enhanced error logging
    console.error('\n=== REGISTER ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error meta:', error.meta);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    console.error('=====================\n');
    
    // Handle specific Prisma errors
    if (error.code) {
      // Unique constraint violation
      if (error.code === 'P2002') {
        return res.status(409).json({
          error: 'User with this email already exists',
          code: 'USER_EXISTS'
        });
      }
      // Database connection failed
      if (error.code === 'P1001' || error.code === 'P1010') {
        return res.status(503).json({
          error: 'Database connection failed. Please check your DATABASE_URL.',
          code: 'DB_CONNECTION_ERROR'
        });
      }
      // Column doesn't exist (schema not pushed)
      if (error.code === 'P2025' || error.message?.includes('Unknown column') || error.message?.includes('does not exist')) {
        return res.status(500).json({
          error: 'Database schema mismatch. Please run: npx prisma db push',
          code: 'SCHEMA_MISMATCH'
        });
      }
    }

    // Handle missing fields in database
    if (error.message?.includes('Unknown field') || error.message?.includes('Unknown arg')) {
      return res.status(500).json({
        error: 'Database schema is out of date. Please run: npx prisma db push',
        code: 'SCHEMA_OUT_OF_DATE'
      });
    }

    // Generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred during registration',
      code: 'INTERNAL_ERROR',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        meta: error.meta
      } : undefined
    });
  }
});

/**
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_FIELDS'
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
    });

    const refreshTokenValue = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    // Store refresh token in database
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshTokenExpiry,
      },
    });

    // Set refresh token as HttpOnly cookie
    res.cookie('refreshToken', refreshTokenValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
      accessToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token is required',
        code: 'NO_REFRESH_TOKEN'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      return res.status(403).json({
        error: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    // Check if refresh token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      res.clearCookie('refreshToken');
      return res.status(403).json({
        error: 'Refresh token not found',
        code: 'TOKEN_NOT_FOUND'
      });
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { token: refreshToken },
      });
      res.clearCookie('refreshToken');
      return res.status(403).json({
        error: 'Refresh token has expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
    });

    res.json({
      message: 'Token refreshed successfully',
      accessToken,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Logout user (clear refresh token)
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      // Delete refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * Get current user info
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;

