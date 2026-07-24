import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, logout } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middleware/validation.js';

const router = Router();

// Strict rate limiter: Max 5 login/registration requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
