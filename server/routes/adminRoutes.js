import { Router } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { requireSuperadmin } from '../middleware/requireSuperadmin.js';
import { Company } from '../models/Company.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Document } from '../models/Document.js';
import { WorkflowRule } from '../models/WorkflowRule.js';
import { WorkflowLog } from '../models/WorkflowLog.js';
import { AdminAuditLog } from '../models/AdminAuditLog.js';
import { OpenAiErrorLog } from '../models/OpenAiErrorLog.js';
import { WebhookFailureLog } from '../models/WebhookFailureLog.js';
import { plans } from '../config/plans.js';
import { config } from '../config/config.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const router = Router();

// Secure all endpoints in this router to Superadmin only
router.use(protect);
router.use(requireSuperadmin);

/**
 * GET /api/admin/companies
 * Returns paginated, searchable list of companies.
 */
router.get('/companies', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const filter = {};
  
  if (req.query.search) {
    filter.$or = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { slug: { $regex: req.query.search, $options: 'i' } }
    ];
  }

  if (req.query.plan && req.query.plan !== 'all') {
    filter['subscription.planId'] = req.query.plan;
  }

  if (req.query.status && req.query.status !== 'all') {
    filter['subscription.status'] = req.query.status;
  }

  const companies = await Company.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Company.countDocuments(filter);

  const enrichedCompanies = await Promise.all(
    companies.map(async (company) => {
      const totalConvs = await Conversation.countDocuments({ companyId: company._id });
      const lastConv = await Conversation.findOne({ companyId: company._id }).sort({ updatedAt: -1 });

      return {
        id: company._id,
        name: company.name,
        slug: company.slug,
        plan: company.subscription?.planId || 'starter',
        status: company.subscription?.status || 'trialing',
        isActive: company.isActive,
        signupDate: company.createdAt,
        totalConversations: totalConvs,
        lastActivityDate: lastConv ? lastConv.updatedAt : company.updatedAt
      };
    })
  );

  res.status(200).json({
    success: true,
    data: enrichedCompanies,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}));

/**
 * GET /api/admin/companies/:id
 * Retrieves full details for a single company context.
 */
router.get('/companies/:id', asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new NotFoundError('Company not found.', 'COMPANY_NOT_FOUND');
  }

  // Load all users registered under this company ID
  const users = await User.find({ companyId: company._id }).select('name email role createdAt');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const conversationsUsed = await Conversation.countDocuments({
    companyId: company._id,
    createdAt: { $gte: startOfMonth }
  });

  const docsUsed = await Document.countDocuments({ companyId: company._id });
  const rulesUsed = await WorkflowRule.countDocuments({ companyId: company._id });

  const recentConvs = await Conversation.find({ companyId: company._id })
    .sort({ createdAt: -1 })
    .limit(5);

  const plan = plans[company.subscription?.planId || 'starter'] || plans.starter;

  res.status(200).json({
    success: true,
    data: {
      company: {
        id: company._id,
        name: company.name,
        slug: company.slug,
        isActive: company.isActive,
        createdAt: company.createdAt,
        subscription: company.subscription,
        channels: {
          whatsapp: company.whatsappConfig?.isConnected || false,
          voice: company.voiceConfig?.isConnected || false
        }
      },
      users,
      usage: {
        conversationsUsed,
        docsUsed,
        rulesUsed
      },
      limits: plan.limits,
      recentConversations: recentConvs.map((c) => ({
        id: c._id,
        visitorId: c.visitorId,
        channel: c.channel,
        status: c.status,
        summary: c.summary,
        detectedOutcome: c.detectedOutcome,
        createdAt: c.createdAt
      }))
    }
  });
}));

/**
 * PATCH /api/admin/companies/:id
 * Allows superadmin to manually adjust company details. Logs audits.
 */
router.patch('/companies/:id', asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    throw new NotFoundError('Company not found.', 'COMPANY_NOT_FOUND');
  }

  const { isActive, planId, trialEndsAt } = req.body;

  if (isActive !== undefined && isActive !== company.isActive) {
    const action = isActive ? 'reactivate_company' : 'suspend_company';
    company.isActive = isActive;
    await AdminAuditLog.create({
      superadminUserId: req.user._id,
      action,
      targetCompanyId: company._id,
      details: `Active status manually set to ${isActive}`
    });
  }

  if (planId !== undefined && planId !== company.subscription.planId) {
    const oldPlan = company.subscription.planId;
    company.subscription.planId = planId;
    company.plan = planId; // support legacy synced properties
    await AdminAuditLog.create({
      superadminUserId: req.user._id,
      action: 'plan_override',
      targetCompanyId: company._id,
      details: `Plan overridden from ${oldPlan} to ${planId}`
    });
  }

  if (trialEndsAt !== undefined) {
    const oldTrial = company.subscription.trialEndsAt;
    company.subscription.trialEndsAt = new Date(trialEndsAt);
    await AdminAuditLog.create({
      superadminUserId: req.user._id,
      action: 'extend_trial',
      targetCompanyId: company._id,
      details: `Trial date extended from ${oldTrial} to ${trialEndsAt}`
    });
  }

  await company.save();

  res.status(200).json({
    success: true,
    message: 'Company configuration adjusted successfully.',
    data: company
  });
}));

/**
 * POST /api/admin/companies/:id/impersonate
 * Generates a short-lived (15 min) JWT supporting customer impersonation. Logs audits.
 */
router.post('/companies/:id/impersonate', asyncHandler(async (req, res) => {
  const companyId = req.params.id;
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found.', 'COMPANY_NOT_FOUND');
  }

  // Find a target user in that company to impersonate
  const targetUser = await User.findOne({ companyId }).sort({ role: 1 });
  if (!targetUser) {
    throw new BadRequestError('No user accounts exist in this company to impersonate.', 'NO_TARGET_USERS');
  }

  // Sign a JWT valid for 15 minutes, carrying the impersonator's superadmin ID
  const impersonationToken = jwt.sign(
    {
      id: targetUser._id,
      role: targetUser.role,
      impersonatorId: req.user._id
    },
    config.jwtSecret,
    { expiresIn: '15m' }
  );

  // Log impersonation event
  await AdminAuditLog.create({
    superadminUserId: req.user._id,
    action: 'impersonate',
    targetCompanyId: company._id,
    details: `Impersonated user: ${targetUser.email} (${targetUser.name})`
  });

  res.status(200).json({
    success: true,
    message: 'Impersonation token generated.',
    data: {
      token: impersonationToken,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        companyName: company.name
      }
    }
  });
}));

/**
 * GET /api/admin/metrics
 * Returns platform-wide aggregates and analytics.
 */
router.get('/metrics', asyncHandler(async (req, res) => {
  const totalCompanies = await Company.countDocuments();

  // Status groupings
  const activeCount = await Company.countDocuments({ 'subscription.status': 'active' });
  const trialingCount = await Company.countDocuments({ 'subscription.status': 'trialing' });
  const canceledCount = await Company.countDocuments({ 'subscription.status': 'canceled' });

  // Conversations in the current calendar month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalConversationsThisMonth = await Conversation.countDocuments({
    createdAt: { $gte: startOfMonth }
  });

  // Calculate MRR sum
  const activeCompanies = await Company.find({ 'subscription.status': 'active' });
  let totalRevenueThisMonth = 0;
  activeCompanies.forEach((c) => {
    const plan = plans[c.subscription.planId || 'starter'];
    if (plan) {
      totalRevenueThisMonth += plan.priceINR;
    }
  });

  // Daily signups in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const signupsAgg = await Company.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  const signupsOverTime = signupsAgg.map((s) => ({ date: s._id, count: s.count }));

  // Churn calculations
  const totalBillingAccounts = activeCount + canceledCount;
  const churnRate = totalBillingAccounts > 0 ? Math.round((canceledCount / totalBillingAccounts) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      totalCompanies,
      statusBreakdown: {
        active: activeCount,
        trialing: trialingCount,
        canceled: canceledCount
      },
      totalConversationsThisMonth,
      totalRevenueThisMonth,
      churnRate,
      signupsOverTime
    }
  });
}));

/**
 * GET /api/admin/system-health
 * Returns platform operational health indicators.
 */
router.get('/system-health', asyncHandler(async (req, res) => {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Workflow failure rate
  const totalWorkflowRuns = await WorkflowLog.countDocuments({ executedAt: { $gte: sevenDaysAgo } });
  const failedWorkflowRuns = await WorkflowLog.countDocuments({
    executedAt: { $gte: sevenDaysAgo },
    status: 'failed'
  });
  const workflowFailureRate = totalWorkflowRuns > 0 ? Math.round((failedWorkflowRuns / totalWorkflowRuns) * 100) : 0;

  // 2. OpenAI API error rate
  // Assistant Messages represent successful runs
  const totalSuccessAiCalls = await Conversation.countDocuments({
    createdAt: { $gte: sevenDaysAgo }
  }); // proxy for RAG completions/summaries
  const totalFailedAiCalls = await OpenAiErrorLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
  const totalAiAttempts = totalSuccessAiCalls + totalFailedAiCalls;
  const openAiErrorRate = totalAiAttempts > 0 ? Math.round((totalFailedAiCalls / totalAiAttempts) * 100) : 0;

  // 3. Webhook failure counts
  const voiceWebhookFailures = await WebhookFailureLog.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
    channel: 'voice'
  });
  const whatsappWebhookFailures = await WebhookFailureLog.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
    channel: 'whatsapp'
  });

  res.status(200).json({
    success: true,
    data: {
      workflow: {
        totalRuns: totalWorkflowRuns,
        failedRuns: failedWorkflowRuns,
        failureRate: workflowFailureRate
      },
      openai: {
        attempts: totalAiAttempts,
        failures: totalFailedAiCalls,
        errorRate: openAiErrorRate
      },
      webhooks: {
        voiceFailures: voiceWebhookFailures,
        whatsappFailures: whatsappWebhookFailures,
        totalFailures: voiceWebhookFailures + whatsappWebhookFailures
      }
    }
  });
}));

export default router;
