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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Metrics</h1>
          <p className="text-slate-400 text-sm mt-1">
            Aggregate revenue (MRR), company registrations, and overall conversation volume.
          </p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tenants */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
            <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Companies</span>
            <span className="block text-2xl font-black text-white">{metrics.totalCompanies}</span>
            <span className="block text-[10px] text-slate-400">
              Active: {metrics.statusBreakdown.active} | Trial: {metrics.statusBreakdown.trialing}
            </span>
          </div>

          {/* Revenue MRR */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
            <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Monthly Recurring Revenue</span>
            <span className="block text-2xl font-black text-red-400">₹{metrics.totalRevenueThisMonth}</span>
            <span className="block text-[10px] text-slate-400">From active billing subscriptions</span>
          </div>

          {/* Total Chats */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
            <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Conversations this Month</span>
            <span className="block text-2xl font-black text-white">{metrics.totalConversationsThisMonth}</span>
            <span className="block text-[10px] text-slate-400">Across all tenant environments</span>
          </div>

          {/* Churn Rate */}
          <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
            <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Churn Rate</span>
            <span className="block text-2xl font-black text-amber-500">{metrics.churnRate}%</span>
            <span className="block text-[10px] text-slate-400">Canceled relative to active subscriptions</span>
          </div>
        </div>

        {/* Signup Volume Area chart */}
        <div className="glass rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
            Company Signups (Last 30 Days)
          </h3>
          <div className="h-80 w-full">
            {metrics.signupsOverTime.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 italic">
                No signups recorded in the last 30 days.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.signupsOverTime} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#1e293b/40" strokeDasharray="3 3" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Signups"
                    stroke="#ef4444"
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
