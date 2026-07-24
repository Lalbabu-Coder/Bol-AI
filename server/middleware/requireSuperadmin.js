import { ForbiddenError } from '../utils/errors.js';

export const requireSuperadmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'superadmin') {
    throw new ForbiddenError('Superadmin privileges are required to access this resource.', 'SUPERADMIN_REQUIRED');
  }
  next();
};

export default requireSuperadmin;
