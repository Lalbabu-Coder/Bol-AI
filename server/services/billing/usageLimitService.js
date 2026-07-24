import { Company } from '../../models/Company.js';
import { Conversation } from '../../models/Conversation.js';
import { Document } from '../../models/Document.js';
import { WorkflowRule } from '../../models/WorkflowRule.js';
import { plans } from '../../config/plans.js';

/**
 * Checks if the company's subscription status is currently valid.
 * Valid subscriptions are:
 * - Status 'active'
 * - Status 'trialing' where trialEndsAt is in the future
 * - Status 'canceled' where currentPeriodEnd is in the future
 */
export const isSubscriptionValid = (subscription) => {
  if (!subscription) return false;
  
  const now = new Date();
  
  if (subscription.status === 'active') {
    return true;
  }
  
  if (subscription.status === 'trialing') {
    return new Date(subscription.trialEndsAt) > now;
  }
  
  if (subscription.status === 'canceled') {
    return subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now;
  }
  
  return false; // past_due or missing is invalid
};

/**
 * Validates if the company is within their plan's limits for the specified limitType.
 * Returns true if allowed, false if limit is exceeded or subscription is inactive.
 */
export const checkLimit = async (companyId, limitType) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Workspace company profile not found.');
  }

  // 1. Validate subscription status first
  if (!isSubscriptionValid(company.subscription)) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_EXPIRED',
      message: 'Your trial or subscription has expired. Please upgrade or renew your plan in the Billing center.'
    };
  }

  const planId = company.subscription.planId || 'starter';
  const plan = plans[planId];
  if (!plan) {
    throw new Error(`Plan configuration not found for '${planId}'.`);
  }

  const limitValue = plan.limits[limitType];
  if (limitValue === undefined) {
    throw new Error(`Limit type '${limitType}' is invalid.`);
  }

  let currentUsage = 0;

  if (limitType === 'maxConversationsPerMonth') {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Count conversations created this month for this company
    currentUsage = await Conversation.countDocuments({
      companyId,
      createdAt: { $gte: startOfMonth }
    });
  } else if (limitType === 'maxKnowledgeBaseDocs') {
    // Count total documents in company knowledge base
    currentUsage = await Document.countDocuments({ companyId });
  } else if (limitType === 'maxWorkflowRules') {
    // Count total workflow rules
    currentUsage = await WorkflowRule.countDocuments({ companyId });
  }

  if (currentUsage >= limitValue) {
    return {
      allowed: false,
      reason: 'LIMIT_EXCEEDED',
      message: `You have reached your plan limit of ${limitValue} for ${limitType.replace(/([A-Z])/g, ' $1').toLowerCase()}. Please upgrade your plan in the Billing center.`
    };
  }

  return { allowed: true, currentUsage, limitValue };
};

/**
 * Validates if the company's active plan allows a given channel.
 */
export const checkChannelAllowed = async (companyId, channel) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Workspace company profile not found.');
  }

  // Validate subscription validity
  if (!isSubscriptionValid(company.subscription)) {
    return {
      allowed: false,
      reason: 'SUBSCRIPTION_EXPIRED',
      message: 'Your trial or subscription has expired. Please upgrade or renew your plan in the Billing center.'
    };
  }

  const planId = company.subscription.planId || 'starter';
  const plan = plans[planId];
  if (!plan) {
    throw new Error(`Plan configuration not found for '${planId}'.`);
  }

  const allowedChannels = plan.limits.channelsAllowed || [];
  if (!allowedChannels.includes(channel)) {
    return {
      allowed: false,
      reason: 'CHANNEL_NOT_ALLOWED',
      message: `The '${channel.replace('_', ' ')}' channel is not included in your ${plan.name} plan. Please upgrade to access this feature.`
    };
  }

  return { allowed: true };
};
