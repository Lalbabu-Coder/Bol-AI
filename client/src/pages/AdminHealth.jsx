import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { AdminLayout } from '../components/AdminLayout.jsx';

export const AdminHealth = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/system-health');
      setHealth(res.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load health indicators: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  // Threshold check helper: returns bg color, text color, and title
  const getWorkflowStatus = (rate) => {
    if (rate < 5) return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Operational', icon: '✅' };
    if (rate < 15) return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Degraded Service', icon: '⚠️' };
    return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'Outage Critical', icon: '🚨' };
  };

  const getOpenAiStatus = (rate) => {
    if (rate < 3) return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Operational', icon: '✅' };
    if (rate < 10) return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'API Fluctuations', icon: '⚠️' };
    return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'API Outage / Key Exhausted', icon: '🚨' };
  };

  const getWebhookStatus = (total) => {
    if (total <= 5) return { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Secure', icon: '✅' };
    if (total <= 20) return { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Signature Drops Detected', icon: '⚠️' };
    return { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-400', label: 'High Signature Drop Warnings', icon: '🚨' };
  };

  const wf = getWorkflowStatus(health.workflow.failureRate);
  const ai = getOpenAiStatus(health.openai.errorRate);
  const wh = getWebhookStatus(health.webhooks.totalFailures);

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-zinc-800/80 pb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">System Health Signals</h1>
            <p className="text-zinc-400 text-xs mt-1">
              Operational signals, API connection status, and webhook signature validation metrics.
            </p>
          </div>
          <button
            onClick={fetchHealth}
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0"
          >
            🔄 Refresh Status
          </button>
        </div>

        {/* Health status blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflows health */}
          <div className="saas-panel p-6 flex flex-col justify-between h-52">
            <div className="space-y-2">
              <span className="text-2xl">{wf.icon}</span>
              <h3 className="text-base font-bold font-heading text-zinc-100">Workflow Runner</h3>
              <p className="text-xs text-zinc-400">
                Rule execution and action failure rate over the last 7 days.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Failure Rate</span>
                <span className={`text-2xl font-bold font-heading ${wf.text}`}>{health.workflow.failureRate}%</span>
              </div>
              <span className={`text-[10px] font-semibold ${wf.text} uppercase tracking-wider`}>{wf.label}</span>
            </div>
          </div>

          {/* OpenAI connection health */}
          <div className="saas-panel p-6 flex flex-col justify-between h-52">
            <div className="space-y-2">
              <span className="text-2xl">{ai.icon}</span>
              <h3 className="text-base font-bold font-heading text-zinc-100">OpenAI Integration</h3>
              <p className="text-xs text-zinc-400">
                RAG completion errors and AI summarization failure rate.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Error Rate</span>
                <span className={`text-2xl font-bold font-heading ${ai.text}`}>{health.openai.errorRate}%</span>
              </div>
              <span className={`text-[10px] font-semibold ${ai.text} uppercase tracking-wider`}>{ai.label}</span>
            </div>
          </div>

          {/* Webhook Signature warnings health */}
          <div className="saas-panel p-6 flex flex-col justify-between h-52">
            <div className="space-y-2">
              <span className="text-2xl">{wh.icon}</span>
              <h3 className="text-base font-bold font-heading text-zinc-100">Webhook Signatures</h3>
              <p className="text-xs text-zinc-400">
                Rejected Twilio and Meta signature verification attempts in 7 days.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] uppercase font-semibold text-zinc-500">Failed Verification</span>
                <span className={`text-2xl font-bold font-heading ${wh.text}`}>{health.webhooks.totalFailures}</span>
              </div>
              <span className={`text-[10px] font-semibold ${wh.text} uppercase tracking-wider`}>{wh.label}</span>
            </div>
          </div>
        </div>

        {/* Detailed Breakdown Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* OpenAI logs */}
          <div className="saas-panel p-6 space-y-4">
            <h3 className="text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">OpenAI Metrics</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Completion Requests (7 days)</span>
                <span className="font-medium text-zinc-200">{health.openai.attempts}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Recorded Failures</span>
                <span className="font-medium text-zinc-200">{health.openai.failures}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">API Status</span>
                <span className={`font-semibold ${ai.text}`}>{health.openai.errorRate < 3 ? 'Operational' : 'Degraded'}</span>
              </div>
            </div>
          </div>

          {/* Webhook logs */}
          <div className="saas-panel p-6 space-y-4">
            <h3 className="text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">Webhook Security Drops</h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Twilio Voice drops</span>
                <span className="font-medium text-zinc-200">{health.webhooks.voiceFailures}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Meta WhatsApp drops</span>
                <span className="font-medium text-zinc-200">{health.webhooks.whatsappFailures}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Risk Assessment</span>
                <span className={`font-semibold ${wh.text}`}>{health.webhooks.totalFailures <= 5 ? 'Secure / Normal' : 'Under Attack / Misconfigured'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminHealth;
