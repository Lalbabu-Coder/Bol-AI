import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { BadRequestError, UnauthorizedError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Helper: Generate JWT Access Token (Short-lived: 15 minutes)
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    config.jwtSecret,
    { expiresIn: '15m' }
  );
};

// Helper: Generate JWT Refresh Token (Long-lived: 7 days)
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
};

// Helper: Set Refresh Token Cookie
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/api/auth' // Restrict cookie paths to auth endpoints for security
  });
};

// Helper: Parse cookie header manually to keep dependencies lean
const getCookie = (req, name) => {
  const headers = req.headers.cookie;
  if (!headers) return null;
  const cookie = headers.split(';').find(c => c.trim().startsWith(`${name}=`));
  if (!cookie) return null;
  return decodeURIComponent(cookie.split('=')[1]);
};

/**
 * Register Company and Owner User together (Transactional sequential saves with fallback cleanup)
 */
export const register = asyncHandler(async (req, res) => {
  const { companyName, userName, email, password } = req.body;

  if (!companyName || !userName || !email || !password) {
    throw new BadRequestError('All parameters (companyName, userName, email, password) are required.');
  }

  // Pre-emptive duplicate checks
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('This email is already registered.', 'EMAIL_TAKEN');
  }

  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  if (!slug) {
    throw new BadRequestError('Company name must contain valid alphanumeric characters.');
  }

  const existingCompany = await Company.findOne({ slug });
  if (existingCompany) {
    throw new ConflictError('A company with a similar name already exists. Please choose a different company name.', 'COMPANY_TAKEN');
  }

  let createdCompany = null;

  try {
    // 1. Create the Company tenant with default growth trialing subscription
    createdCompany = await Company.create({
      name: companyName,
      slug,
      plan: 'growth',
      subscription: {
        planId: 'growth',
        status: 'trialing',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      },
      isActive: true
    });

    // 2. Create the owner User pointing to this company
    // Note: We bypass tenant context since it's not set, which is correct here
    const createdUser = await User.create({
      name: userName,
      email,
      passwordHash: password, // Hashed in pre-save hook
      role: 'owner',
      companyId: createdCompany._id
    });

    // 3. Issue Authentication details
    const accessToken = generateAccessToken(createdUser);
    const refreshToken = generateRefreshToken(createdUser);
    
    setRefreshTokenCookie(res, refreshToken);

    res.status(201).json({
      success: true,
      message: 'Company registration and owner user creation successful.',
      data: {
        accessToken,
        user: {
          id: createdUser._id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role
        },
        company: {
          id: createdCompany._id,
          name: createdCompany.name,
          slug: createdCompany.slug,
          plan: createdCompany.subscription?.planId || createdCompany.plan
        }
      }
    });
  } catch (error) {
    // Cascading rollback manually in case of user write failures
    if (createdCompany && createdCompany._id) {
      await Company.deleteOne({ _id: createdCompany._id }).catch(() => {});
    }
    throw error;
  }
});

/**
 * User Login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Email and password are required.');
  }

  // Fetch user across companies (since no tenant context is set yet)
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthorizedError('Invalid credentials.', 'INVALID_CREDENTIALS');
  }

  // 1. Evaluate Lockout Bounds
  if (user.isLocked()) {
    const remainingMins = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
    throw new BadRequestError(`This account has been temporarily locked due to excessive failed attempts. Please try again after ${remainingMins} minutes.`, 'ACCOUNT_LOCKED');
  }

  // 2. Check Password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    // Increment failed login metrics
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
    }
    await user.save();
    throw new UnauthorizedError('Invalid credentials.', 'INVALID_CREDENTIALS');
  }

  // 3. Reset failed metrics on successful access
  if (user.failedLoginAttempts > 0 || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  // Check company status
  const company = await Company.findById(user.companyId);
  if (!company || !company.isActive) {
    throw new ForbiddenError('Your company tenant account has been deactivated.', 'TENANT_INACTIVE');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  setRefreshTokenCookie(res, refreshToken);

  res.status(200).json({
    success: true,
    message: 'User logged in successfully.',
    data: {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug
      }
    }
  });
});

/**
 * Token Refresh Flow
 */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = getCookie(req, 'refreshToken');

  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token missing from request cookies.', 'REFRESH_TOKEN_MISSING');
  }

  try {
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new UnauthorizedError('User session invalid.', 'USER_NOT_FOUND');
    }

    let companyData = null;
    if (user.role !== 'superadmin') {
      const company = await Company.findById(user.companyId);
      if (!company || !company.isActive) {
        throw new ForbiddenError('Your company tenant account has been deactivated.', 'TENANT_INACTIVE');
      }
      companyData = {
        id: company._id,
        name: company.name,
        slug: company.slug
      };
    }

    const newAccessToken = generateAccessToken(user);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully.',
      data: {
        accessToken: newAccessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        company: companyData
      }
    });
  } catch (err) {
    throw new UnauthorizedError('Refresh token expired or invalid.', 'INVALID_REFRESH_TOKEN');
  }
});

/**
 * Logout Flow
 */
export const logout = asyncHandler(async (req, res) => {
  // Clear the HTTP-Only cookie by setting maxAge to 0
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/api/auth'
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully.'
  });
});
