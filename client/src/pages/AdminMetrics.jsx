import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../api/axios.js';
import { AdminLayout } from '../components/AdminLayout.jsx';

export const AdminMetrics = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/admin/metrics');
      setMetrics(res.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load metrics: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
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

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12 font-sans">
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">Platform Metrics</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Aggregate MRR revenue, workspace company signups, and platform conversation volume.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tenants */}
          <div className="saas-card p-5 space-y-2">
            <span className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Total Workspaces</span>
            <span className="block text-2xl font-bold font-heading text-zinc-100">{metrics.totalCompanies}</span>
            <span className="block text-[11px] text-zinc-400">
              Active: {metrics.statusBreakdown.active} | Trial: {metrics.statusBreakdown.trialing}
            </span>
          </div>

          {/* Revenue MRR */}
          <div className="saas-card p-5 space-y-2">
            <span className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Monthly Recurring Revenue</span>
            <span className="block text-2xl font-bold font-heading text-emerald-400">₹{metrics.totalRevenueThisMonth}</span>
            <span className="block text-[11px] text-zinc-400">From active paid subscriptions</span>
          </div>

          {/* Total Chats */}
          <div className="saas-card p-5 space-y-2">
            <span className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Conversations this Month</span>
            <span className="block text-2xl font-bold font-heading text-zinc-100">{metrics.totalConversationsThisMonth}</span>
            <span className="block text-[11px] text-zinc-400">Across all active tenant environments</span>
          </div>

          {/* Churn Rate */}
          <div className="saas-card p-5 space-y-2">
            <span className="block text-zinc-400 text-[10px] font-semibold uppercase tracking-wide">Churn Rate</span>
            <span className="block text-2xl font-bold font-heading text-amber-400">{metrics.churnRate}%</span>
            <span className="block text-[11px] text-zinc-400">Canceled relative to total active subscriptions</span>
          </div>
        </div>

        {/* Signup Volume Area chart */}
        <div className="saas-panel p-6 space-y-4">
          <h3 className="text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">
            Workspace Signups (Last 30 Days)
          </h3>
          <div className="h-80 w-full">
            {metrics.signupsOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-500 italic">
                No signups recorded in the last 30 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.signupsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: '12px', color: '#f4f4f5' }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Signups"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorSignups)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminMetrics;
