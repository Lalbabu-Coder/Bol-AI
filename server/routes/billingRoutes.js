import { Router } from 'express';
import Razorpay from 'razorpay';
import { protect } from '../middleware/auth.js';
import { Company } from '../models/Company.js';
import { Conversation } from '../models/Conversation.js';
import { Document } from '../models/Document.js';
import { WorkflowRule } from '../models/WorkflowRule.js';
import { plans } from '../config/plans.js';
import { createSubscription, cancelSubscription, handleWebhookEvent } from '../services/billing/razorpayService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../utils/errors.js';

const router = Router();

/**
 * GET /api/billing/plans
 * PUBLIC route. Returns the plans structure for presentation.
 */
router.get('/plans', asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: plans
  });
}));

/**
 * GET /api/billing/subscription
 * PROTECTED route. Retrieves current subscription plan, status, limits, and usage.
 */
router.get('/subscription', protect, asyncHandler(async (req, res) => {
  const company = await Company.findById(req.user.companyId);
  if (!company) {
    throw new NotFoundError('Company workspace not found.', 'COMPANY_NOT_FOUND');
  }

  const sub = company.subscription || { planId: 'starter', status: 'trialing' };
  const planId = sub.planId || 'starter';
  const plan = plans[planId] || plans.starter;

  // Calculate actual usage
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const conversationsUsed = await Conversation.countDocuments({
    companyId: req.user.companyId,
    createdAt: { $gte: startOfMonth }
  });

  const docsUsed = await Document.countDocuments({ companyId: req.user.companyId });
  const rulesUsed = await WorkflowRule.countDocuments({ companyId: req.user.companyId });

  res.status(200).json({
    success: true,
    data: {
      planId,
      planName: plan.name,
      status: sub.status,
      trialEndsAt: sub.trialEndsAt,
      currentPeriodEnd: sub.currentPeriodEnd,
      usage: {
        conversationsUsed,
        docsUsed,
        rulesUsed
      },
      limits: plan.limits
    }
  });
}));

/**
 * POST /api/billing/subscribe
 * PROTECTED route. Initiates a Razorpay subscription checkout.
 */
router.post('/subscribe', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Subscription edits are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const { planId } = req.body;
  if (!planId || !plans[planId]) {
    throw new BadRequestError('A valid planId (starter, growth, pro) is required.', 'INVALID_PLAN_ID');
  }

  const checkoutDetails = await createSubscription(req.user.companyId, planId);

  res.status(200).json({
    success: true,
    message: 'Subscription created successfully. Proceed to payment.',
    data: checkoutDetails
  });
}));

/**
 * POST /api/billing/cancel
 * PROTECTED route. Cancels subscription at the period end.
 */
router.post('/cancel', protect, asyncHandler(async (req, res) => {
  if (req.user.impersonatorId) {
    throw new ForbiddenError('Subscription edits are blocked during support impersonation sessions.', 'IMPERSONATION_BLOCKED');
  }

  const cancelDetails = await cancelSubscription(req.user.companyId);

  res.status(200).json({
    success: true,
    message: 'Your subscription has been canceled and will terminate at the end of the billing period.',
    data: cancelDetails
  });
}));

/**
 * POST /api/billing/webhook
 * PUBLIC webhook route. Processes payments and renewal updates callback from Razorpay.
 */
router.post('/webhook', asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!signature) {
    throw new UnauthorizedError('Signature validation failed. Missing X-Razorpay-Signature header.', 'SIGNATURE_MISSING');
  }

  if (!secret) {
    process.stderr.write('Razorpay Webhook Warning: RAZORPAY_WEBHOOK_SECRET environment variable is missing. Webhooks cannot be validated.\n');
    return res.status(500).send('Webhook configuration missing on server.');
  }

  // Verify Razorpay Webhook Signature using raw body buffer
  let isValid = false;
  try {
    const rawBodyStr = req.rawBody ? req.rawBody.toString() : '';
    isValid = Razorpay.validateWebhookSignature(rawBodyStr, signature, secret);
  } catch (err) {
    process.stderr.write(`Razorpay webhook signature verification error: ${err.message}\n`);
  }

  if (!isValid) {
    throw new UnauthorizedError('Webhook signature check failed.', 'INVALID_SIGNATURE');
  }

  // Handle verified payload event in background
  await handleWebhookEvent(req.body);

  res.status(200).send('OK');
}));

export default router;
