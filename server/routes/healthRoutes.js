import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * Health Check Endpoint
 * Returns 200 if connected to DB, 503 if disconnected
 */
router.get('/health', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const readyState = mongoose.connection.readyState;
  const dbStatus = dbStates[readyState] || 'unknown';
  const dbOk = readyState === 1; // 1 means connected

  const httpStatus = dbOk ? 200 : 503;

  res.status(httpStatus).json({
    success: dbOk,
    status: dbOk ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    services: {
      server: 'online',
      database: {
        status: dbStatus,
        healthy: dbOk
      }
    }
  });
});

export default router;
