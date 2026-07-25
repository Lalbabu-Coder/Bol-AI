import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';

export const Billing = () => {
  const { user } = useAuth();
  const [subData, setSubData] = useState(null);
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Load Razorpay checkout script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Fetch subscription and plan lists
  const fetchBillingInfo = async () => {
    setLoading(true);
    try {
      const [subRes, plansRes] = await Promise.all([
        api.get('/api/billing/subscription'),
        api.get('/api/billing/plans')
      ]);
      setSubData(subRes.data.data);
      setPlans(plansRes.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load billing metrics: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingInfo();
  }, []);

  // Handle plan purchase via Razorpay overlay
  const handleUpgrade = async (planId) => {
    setProcessingPlan(planId);
    try {
      const res = await api.post('/api/billing/subscribe', { planId });
      const { subscriptionId, keyId } = res.data.data;

      const options = {
        key: keyId,
        subscription_id: subscriptionId,
        name: 'Bolo AI Platform',
        description: `Subscribe to ${plans[planId].name} Plan`,
        handler: async (response) => {
          alert('Payment successful! Your subscription is now active.');
          fetchBillingInfo();
        },
        prefill: {
          name: user?.name || 'Workspace Owner',
          email: user?.email || ''
        },
        theme: {
          color: '#6366f1' // Indigo brand color
        },
        modal: {
          ondismiss: () => {
            setProcessingPlan(null);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(`Checkout failed: ${err.response?.data?.message || err.message}`);
      setProcessingPlan(null);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      await api.post('/api/billing/cancel');
      setShowCancelModal(false);
      alert('Subscription cancelled successfully. Your features will remain active until the end of the billing period.');
      fetchBillingInfo();
    } catch (err) {
      alert(`Cancellation failed: ${err.response?.data?.message || err.message}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const { planId, status, trialEndsAt, currentPeriodEnd, usage, limits } = subData;
  const isTrial = status === 'trialing';
  const isCanceled = status === 'canceled';

  // Days left helper
  const getDaysLeft = (dateStr) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  // Gating helper calculation
  const getUsagePercentage = (used, limit) => {
    return Math.min(100, Math.round((used / limit) * 100));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
            Billing & Subscription
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Manage your workspace subscription tier, Razorpay invoices, and active resource usage.
          </p>
        </div>

        {/* Current Plan Overview and Usage Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Plan Card */}
          <div className="lg:col-span-1 saas-panel p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="block text-xs font-semibold font-heading text-zinc-400 uppercase tracking-wide">
                Active Subscription
              </span>
              <div>
                <h3 className="text-2xl font-bold font-heading text-zinc-100 capitalize">{subData.planName} Plan</h3>
                <div className="mt-1.5">
                  <span className={status === 'active' ? 'saas-badge-emerald' : status === 'trialing' ? 'saas-badge-indigo' : 'saas-badge-rose'}>
                    {status}
                  </span>
                </div>
              </div>

              {isTrial && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5 text-xs text-indigo-300">
                  ⚡ Free Trial: <strong>{getDaysLeft(trialEndsAt)} days left</strong>. Growth tier features are currently unlocked.
                </div>
              )}

              {status === 'active' && currentPeriodEnd && (
                <p className="text-xs text-zinc-400">
                  Renews on: <strong className="text-zinc-200">{new Date(currentPeriodEnd).toLocaleDateString()}</strong>
                </p>
              )}

              {isCanceled && currentPeriodEnd && (
                <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3.5 text-xs text-rose-300">
                  ⚠️ Subscription canceled. Features will terminate on <strong>{new Date(currentPeriodEnd).toLocaleDateString()}</strong>.
                </div>
              )}
            </div>

            {status !== 'canceled' && planId !== 'starter' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full text-left text-xs font-medium text-zinc-500 hover:text-rose-400 transition"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Usage Bars */}
          <div className="lg:col-span-2 saas-panel p-6 space-y-6">
            <span className="block text-xs font-semibold font-heading text-zinc-400 uppercase tracking-wide">
              Plan Resource Usage
            </span>

            <div className="space-y-4">
              {/* Conversations */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-300">Conversations this Month</span>
                  <span className="text-zinc-400">
                    {usage.conversationsUsed} / {limits.maxConversationsPerMonth}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    style={{ width: `${getUsagePercentage(usage.conversationsUsed, limits.maxConversationsPerMonth)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.conversationsUsed, limits.maxConversationsPerMonth) >= 85
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-300">Knowledge Base Docs</span>
                  <span className="text-zinc-400">
                    {usage.docsUsed} / {limits.maxKnowledgeBaseDocs}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    style={{ width: `${getUsagePercentage(usage.docsUsed, limits.maxKnowledgeBaseDocs)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.docsUsed, limits.maxKnowledgeBaseDocs) >= 85
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Workflow Rules */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-zinc-300">Workflow Automation Rules</span>
                  <span className="text-zinc-400">
                    {usage.rulesUsed} / {limits.maxWorkflowRules}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div
                    style={{ width: `${getUsagePercentage(usage.rulesUsed, limits.maxWorkflowRules)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.rulesUsed, limits.maxWorkflowRules) >= 85
                        ? 'bg-rose-500'
                        : 'bg-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Plan Pricing Cards Grid */}
        <div className="space-y-4">
          <span className="block text-xs font-semibold font-heading text-zinc-400 uppercase tracking-wide">
            Available Subscription Tiers
          </span>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(plans).map((key) => {
              const plan = plans[key];
              const isCurrent = planId === key;
              const isProcessing = processingPlan === key;

              return (
                <div
                  key={key}
                  className={`saas-panel p-6 flex flex-col justify-between space-y-6 relative transition border ${
                    isCurrent 
                      ? 'border-indigo-500/50 bg-indigo-500/5' 
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-6 px-3 py-0.5 bg-indigo-600 text-white rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                      Current Plan
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-bold font-heading text-zinc-100 capitalize">{plan.name}</h4>
                      <p className="text-2xl font-bold font-heading text-zinc-100 mt-1">
                        ₹{plan.priceINR} <span className="text-xs font-normal text-zinc-400">/ month</span>
                      </p>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2 text-xs text-zinc-400">
                      <li className="flex items-center space-x-2">
                        <span className="text-indigo-400 font-bold">✓</span>
                        <span>{plan.limits.maxConversationsPerMonth} Conversations / mo</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-indigo-400 font-bold">✓</span>
                        <span>{plan.limits.maxKnowledgeBaseDocs} Knowledge Base Docs</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="text-indigo-400 font-bold">✓</span>
                        <span>{plan.limits.maxWorkflowRules} Workflow Rules</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span className="text-indigo-400 font-bold">✓</span>
                        <div className="flex flex-col">
                          <span>Channels:</span>
                          <span className="text-[11px] font-medium text-indigo-300 capitalize mt-0.5">
                            {plan.limits.channelsAllowed.map(c => c.replace('_', ' ')).join(', ')}
                          </span>
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Actions Button */}
                  <button
                    disabled={isCurrent || isProcessing}
                    onClick={() => handleUpgrade(key)}
                    className={`w-full py-2.5 rounded-lg text-xs font-medium transition ${
                      isCurrent
                        ? 'bg-zinc-900 border border-zinc-800 text-zinc-500 cursor-not-allowed'
                        : isProcessing
                        ? 'bg-zinc-900 text-zinc-300 animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : isProcessing ? 'Starting checkout...' : 'Choose Plan'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cancellation Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-card">
              <h4 className="text-base font-semibold font-heading text-zinc-100">Confirm Cancellation</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Cancelling your subscription will prevent automatic renewals. Your plan features and limits remain available until the end of your billing period.
              </p>
              <div className="flex justify-end space-x-2.5 border-t border-zinc-800/80 pt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                >
                  Cancel Plan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Billing;
