import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getOverviewStats,
  getVolumeOverTime,
  getCSATStats,
  getOutcomeBreakdown,
  getTopKnowledgeGaps
} from '../services/analytics/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/**
 * Helper to extract startDate and endDate queries.
 */
const parseDateRange = (req) => {
  const { startDate, endDate } = req.query;
  return {
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined
  };
};

/**
 * GET /api/analytics/overview
 * Protected. Returns overview stat counts.
 */
router.get('/overview', protect, asyncHandler(async (req, res) => {
  const dateRange = parseDateRange(req);
  const stats = await getOverviewStats(req.user.companyId, dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/analytics/volume
 * Protected. Returns time-series daily volumes.
 */
router.get('/volume', protect, asyncHandler(async (req, res) => {
  const dateRange = parseDateRange(req);
  const stats = await getVolumeOverTime(req.user.companyId, dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/analytics/csat
 * Protected. Returns CSAT stats and distribution.
 */
router.get('/csat', protect, asyncHandler(async (req, res) => {
  const dateRange = parseDateRange(req);
  const stats = await getCSATStats(req.user.companyId, dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/analytics/outcomes
 * Protected. Returns outcome classifications breakdown.
 */
router.get('/outcomes', protect, asyncHandler(async (req, res) => {
  const dateRange = parseDateRange(req);
  const stats = await getOutcomeBreakdown(req.user.companyId, dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/analytics/knowledge-gaps
 * Protected. Returns top normalized questions AI couldn't resolve.
 */
router.get('/knowledge-gaps', protect, asyncHandler(async (req, res) => {
  const dateRange = parseDateRange(req);
  const stats = await getTopKnowledgeGaps(req.user.companyId, dateRange);

  res.status(200).json({
    success: true,
    data: stats
  });
}));

export default router;
