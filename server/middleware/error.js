import { AppError } from '../utils/errors.js';
import { config } from '../config/config.js';

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log critical unexpected errors to stderr
  if (!err.isOperational) {
    process.stderr.write(`Unexpected System Error: ${err.message}\n${err.stack}\n`);
  }

  // Handle Mongoose Cast Error (invalid ObjectId format)
  if (err.name === 'CastError') {
    const message = `Invalid value for path ${err.path}: ${err.value}`;
    error = new AppError(message, 400, 'INVALID_FORMAT');
  }

  // Handle MongoDB Duplicate Key (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `A record with that ${field} already exists.`;
    error = new AppError(message, 409, 'DUPLICATE_RESOURCE');
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_FAILED');
  }

  // Handle JWT Malformed Error
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token', 401, 'INVALID_TOKEN');
  }

  // Handle JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    error = new AppError('Authentication token has expired', 401, 'TOKEN_EXPIRED');
  }

  // Extract variables for formatted JSON response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'An unexpected internal server error occurred';
  const errorCode = error.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    success: false,
    message,
    code: errorCode,
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
};

export default errorHandler;
