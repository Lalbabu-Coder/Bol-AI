import Razorpay from 'razorpay';
import { Company } from '../../models/Company.js';
import { plans } from '../../config/plans.js';

// Initialize Razorpay client helper
let razorpay;
try {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'fake_key_id',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'fake_key_secret'
  });
} catch (err) {
  process.stderr.write(`Razorpay initialization warning: ${err.message}\n`);
}

/**
 * Ensures a Razorpay customer ID exists for the company.
 * Creates one if missing.
 */
export const createCustomer = async (company) => {
  if (company.subscription?.razorpayCustomerId) {
    return company.subscription.razorpayCustomerId;
  }

  try {
    const customer = await razorpay.customers.create({
      name: company.name,
      email: `${company.slug}@bolo-ai-tenant.com`,
      notes: {
        companyId: company._id.toString()
      }
    });

    company.subscription.razorpayCustomerId = customer.id;
    await company.save();
    return customer.id;
  } catch (err) {
    process.stderr.write(`Razorpay customer creation failure for ${company._id}: ${err.message}\n`);
    throw err;
  }
};

/**
 * Creates a subscription for the chosen plan.
 * Returns details for Razorpay checkout.
 */
export const createSubscription = async (companyId, planId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Workspace company profile not found.');
  }

  const plan = plans[planId];
  if (!plan) {
    throw new Error(`Plan '${planId}' is invalid.`);
  }

  if (!plan.razorpayPlanId) {
    throw new Error(`Razorpay Plan ID for plan '${planId}' is not configured in settings.`);
  }

  // Ensure Customer exists
  const customerId = await createCustomer(company);

  try {
    const subscription = await razorpay.subscriptions.create({
      plan_id: plan.razorpayPlanId,
      customer_id: customerId,
      total_count: 120, // 10 years monthly renewals
      quantity: 1,
      notes: {
        companyId: companyId.toString(),
        planId: planId
      }
    });

    company.subscription.razorpaySubscriptionId = subscription.id;
    company.subscription.planId = planId;
    await company.save();

    return {
      subscriptionId: subscription.id,
      customerId,
      keyId: process.env.RAZORPAY_KEY_ID,
      amount: plan.priceINR * 100 // price in paise
    };
  } catch (err) {
    process.stderr.write(`Razorpay subscription creation failure: ${err.message}\n`);
    throw err;
  }
};

/**
 * Cancels the active Razorpay subscription at the end of the current billing cycle.
 */
export const cancelSubscription = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) {
    throw new Error('Workspace company profile not found.');
  }

  const subId = company.subscription?.razorpaySubscriptionId;
  if (!subId) {
    throw new Error('No active Razorpay subscription ID is registered.');
  }

  try {
    const cancelRes = await razorpay.subscriptions.cancel(subId, true); // true = cancel at cycle end

    company.subscription.status = 'canceled';
    await company.save();
    return cancelRes;
  } catch (err) {
    process.stderr.write(`Razorpay subscription cancellation failure: ${err.message}\n`);
    throw err;
  }
};

/**
 * Processes verification checks and payload variables from a Razorpay webhook.
 */
export const handleWebhookEvent = async (event) => {
  const eventName = event.event;
  const entity = event.payload?.subscription?.entity;
  if (!entity) return;

  const subId = entity.id;
  const notes = entity.notes || {};
  const companyId = notes.companyId;

  let company;
  if (companyId) {
    company = await Company.findById(companyId);
  } else {
    company = await Company.findOne({ 'subscription.razorpaySubscriptionId': subId });
  }

  if (!company) {
    process.stderr.write(`Razorpay Webhook Warning: Company for Subscription ID ${subId} not found.\n`);
    return;
  }

  const currentEndSec = entity.current_end;

  switch (eventName) {
    case 'subscription.activated':
    case 'subscription.charged':
      company.subscription.status = 'active';
      company.subscription.razorpaySubscriptionId = subId;
      if (currentEndSec) {
        company.subscription.currentPeriodEnd = new Date(currentEndSec * 1000);
      }
      break;

    case 'subscription.cancelled':
      company.subscription.status = 'canceled';
      break;

    case 'payment.failed':
      company.subscription.status = 'past_due';
      break;

    default:
      break;
  }

  await company.save();
  process.stdout.write(`Processed Razorpay Webhook Event: ${eventName} for company ${company._id}.\n`);
};
