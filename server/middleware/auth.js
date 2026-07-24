import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { User } from '../models/User.js';
import { Company } from '../models/Company.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Middleware to verify access token and bind tenant context
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new UnauthorizedError('Authorization token is missing or malformed', 'TOKEN_MISSING');
  }

  const decoded = jwt.verify(token, config.jwtSecret);
  
  // Note: During token verification, we look up the user across companies.
  // Since the AsyncLocalStorage store is not set yet, the tenantPlugin will bypass filtering.
  const user = await User.findById(decoded.id);
  if (!user) {
    throw new UnauthorizedError('User associated with this token no longer exists', 'USER_NOT_FOUND');
  }

  // Bind parameters to request object
  req.user = user;
  if (decoded.impersonatorId) {
    req.user.impersonatorId = decoded.impersonatorId;
  }

  // If superadmin, skip company check and skip runWithTenant
  if (user.role === 'superadmin') {
    req.companyId = null;
    next();
  } else {
    // Ensure tenant company exists and is active
    const company = await Company.findById(user.companyId);
    if (!company) {
      throw new ForbiddenError('Tenant company associated with user not found', 'TENANT_NOT_FOUND');
    }
    
    if (!company.isActive) {
      throw new ForbiddenError('Your company tenant account has been deactivated', 'TENANT_INACTIVE');
    }

    req.companyId = user.companyId.toString();

    // Run the remaining Express middleware chain inside the tenant context
    runWithTenant(req.companyId, () => {
      next();
    });
  }
});

/**
 * Middleware to restrict access to specific roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError('You are not authorized to perform this operation', 'ROLE_FORBIDDEN'));
    }
    next();
  };
};
export default protect;
