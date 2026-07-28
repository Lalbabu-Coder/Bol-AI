export const plans = {
  starter: {
    id: 'starter',
    name: 'Starter',
    priceINR: 499,
    limits: {
      maxConversationsPerMonth: 100,
      maxKnowledgeBaseDocs: 5,
      maxWorkflowRules: 2,
      channelsAllowed: ['web_chat']
    },
    razorpayPlanId: process.env.RAZORPAY_PLAN_STARTER || ''
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    priceINR: 1499,
    limits: {
      maxConversationsPerMonth: 500,
      maxKnowledgeBaseDocs: 20,
      maxWorkflowRules: 10,
      channelsAllowed: ['web_chat', 'whatsapp', 'email']
    },
    razorpayPlanId: process.env.RAZORPAY_PLAN_GROWTH || ''
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceINR: 4999,
    limits: {
      maxConversationsPerMonth: 5000,
      maxKnowledgeBaseDocs: 100,
      maxWorkflowRules: 50,
      channelsAllowed: ['web_chat', 'whatsapp', 'phone', 'email']
    },
    razorpayPlanId: process.env.RAZORPAY_PLAN_PRO || ''
  }
};

export default plans;
