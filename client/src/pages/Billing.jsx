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
      <div className="space-y-8 flex flex-col">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
            Billing & Subscription
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your company's payment logs, subscription tier, and active usage meters.
          </p>
        </div>

        {/* Current Plan Overview and Usage Bars */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Plan Card */}
          <div className="lg:col-span-1 glass rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Active Subscription
              </span>
              <div>
                <h3 className="text-2xl font-black text-white capitalize">{subData.planName} Plan</h3>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  status === 'active' 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : status === 'trialing'
                    ? 'bg-brand-500/10 border border-brand-500/20 text-brand-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {status}
                </span>
              </div>

              {isTrial && (
                <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-3.5 text-xs text-brand-300">
                  ⚡ Trial Active: <strong>{getDaysLeft(trialEndsAt)} days left</strong>. You have access to Growth features without charge.
                </div>
              )}

              {status === 'active' && currentPeriodEnd && (
                <p className="text-xs text-slate-400">
                  Renews on: <strong>{new Date(currentPeriodEnd).toLocaleDateString()}</strong>
                </p>
              )}

              {isCanceled && currentPeriodEnd && (
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3.5 text-xs text-red-400">
                  ⚠️ Subscription canceled. Service will terminate on <strong>{new Date(currentPeriodEnd).toLocaleDateString()}</strong>.
                </div>
              )}
            </div>

            {status !== 'canceled' && planId !== 'starter' && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="w-full text-left text-xs font-semibold text-slate-500 hover:text-red-400 transition"
              >
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Usage Bars */}
          <div className="lg:col-span-2 glass rounded-2xl p-6 space-y-6">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
              Plan Resource Usage
            </span>

            <div className="space-y-4">
              {/* Conversations */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Conversations this Month</span>
                  <span className="text-slate-400">
                    {usage.conversationsUsed} / {limits.maxConversationsPerMonth}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${getUsagePercentage(usage.conversationsUsed, limits.maxConversationsPerMonth)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.conversationsUsed, limits.maxConversationsPerMonth) >= 85
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-brand-500 to-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Knowledge Base Docs</span>
                  <span className="text-slate-400">
                    {usage.docsUsed} / {limits.maxKnowledgeBaseDocs}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${getUsagePercentage(usage.docsUsed, limits.maxKnowledgeBaseDocs)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.docsUsed, limits.maxKnowledgeBaseDocs) >= 85
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-brand-500 to-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Workflow Rules */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300">Workflow Automation Rules</span>
                  <span className="text-slate-400">
                    {usage.rulesUsed} / {limits.maxWorkflowRules}
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${getUsagePercentage(usage.rulesUsed, limits.maxWorkflowRules)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      getUsagePercentage(usage.rulesUsed, limits.maxWorkflowRules) >= 85
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-brand-500 to-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Plan Pricing Cards Grid */}
        <div className="space-y-4">
          <span className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
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
                  className={`glass rounded-2xl p-6 flex flex-col justify-between border space-y-6 relative transition ${
                    isCurrent 
                      ? 'border-brand-500 bg-brand-500/5' 
                      : 'border-slate-900/60 hover:border-slate-800'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-6 px-3 py-1 bg-brand-500 text-white rounded-full text-[9px] uppercase font-bold tracking-wider">
                      Current Active Plan
                    </span>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-slate-200 capitalize">{plan.name}</h4>
                      <p className="text-2xl font-black text-white mt-1.5">
                        ₹{plan.priceINR} <span className="text-xs font-medium text-slate-500">/ month</span>
                      </p>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 text-xs text-slate-400">
                      <li className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>{plan.limits.maxConversationsPerMonth} Conversations/mo</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>{plan.limits.maxKnowledgeBaseDocs} Document limit</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span>✓</span>
                        <span>{plan.limits.maxWorkflowRules} Workflows limit</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <span>✓</span>
                        <div className="flex flex-col">
                          <span>Allowed channels:</span>
                          <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider mt-0.5">
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
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition ${
                      isCurrent
                        ? 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                        : isProcessing
                        ? 'bg-slate-900 text-slate-300 animate-pulse'
                        : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/20'
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
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-xl">
              <h4 className="text-base font-bold text-slate-200">Confirm Cancellation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cancelling your subscription will prevent automatic renewals. Access to Growth/Pro channels and conversation limits will continue to be provided until the end of your current billing period. Data will not be removed.
              </p>
              <div className="flex justify-end space-x-3 border-t border-slate-800/60 pt-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelSubscription}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
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
