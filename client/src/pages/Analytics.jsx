import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ChatWidget } from '../widget/ChatWidget.jsx';
import { useAuth } from '../hooks/useAuth.js';

export const Analytics = () => {
  const { company } = useAuth();
  const [rangeDays, setRangeDays] = useState('30'); // 7, 30, 90
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [volume, setVolume] = useState([]);
  const [csat, setCsat] = useState(null);
  const [outcomes, setOutcomes] = useState([]);
  const [gaps, setGaps] = useState([]);

  // Calculate dates based on selected range
  const getDates = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days, 10));
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    const { startDate, endDate } = getDates(rangeDays);
    const queryStr = `?startDate=${startDate}&endDate=${endDate}`;

    try {
      const [overRes, volRes, csatRes, outRes, gapsRes] = await Promise.all([
        api.get(`/api/analytics/overview${queryStr}`),
        api.get(`/api/analytics/volume${queryStr}`),
        api.get(`/api/analytics/csat${queryStr}`),
        api.get(`/api/analytics/outcomes${queryStr}`),
        api.get(`/api/analytics/knowledge-gaps${queryStr}`)
      ]);

      setOverview(overRes.data.data);
      setVolume(volRes.data.data);
      setCsat(csatRes.data.data);
      setOutcomes(outRes.data.data);
      setGaps(gapsRes.data.data);
    } catch (err) {
      process.stderr.write(`Failed to fetch analytics: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [rangeDays]);

  // Format Duration: MM:SS
  const formatCallDuration = (seconds) => {
    if (!seconds) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const COLORS = ['#6366f1', '#10b981', '#f59e0b']; // indigo, emerald, amber

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const hasData = overview && overview.totalConversations > 0;

  // Format CSAT Distribution for Recharts bar chart
  const csatChartData = csat
    ? Object.keys(csat.distribution).map((stars) => ({
        stars: `${stars} ★`,
        count: csat.distribution[stars]
      }))
    : [];

  // Format Channel Share Pie Chart
  const pieData = overview
    ? [
        { name: 'Web Chat', value: overview.channelBreakdown.web_chat },
        { name: 'WhatsApp', value: overview.channelBreakdown.whatsapp },
        { name: 'Phone calls', value: overview.channelBreakdown.phone }
      ].filter((d) => d.value > 0)
    : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        {/* Header with Date Range Selector & Manual Refresh */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
              Analytics & Overview
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Real-time insights across conversation volume, channel performance, and AI resolution quality.
            </p>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-medium focus:outline-none focus:border-indigo-500 transition"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <button
              onClick={fetchAnalytics}
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition flex items-center gap-1.5"
              title="Refresh"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="saas-panel p-12 text-center space-y-4 max-w-xl mx-auto border-dashed">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-indigo-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold font-heading text-zinc-100">No Analytics Data Available Yet</h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-sm mx-auto">
              Analytics metrics will automatically populate once your AI assistant handles customer interactions on Web Chat, WhatsApp, or Voice.
            </p>
            <div className="pt-2">
              <Link
                to="/channels"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition inline-block shadow-sm"
              >
                Configure Channels →
              </Link>
            </div>
          </div>
        ) : (
          /* Analytics Dashboard grids */
          <div className="space-y-6">
            {/* Top row: KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Conversations */}
              <div className="saas-card p-4 space-y-1.5">
                <span className="block text-zinc-400 text-xs font-medium">Total Conversations</span>
                <span className="block text-2xl font-bold font-heading text-zinc-100">{overview.totalConversations}</span>
              </div>

              {/* Total Calls */}
              <div className="saas-card p-4 space-y-1.5">
                <span className="block text-zinc-400 text-xs font-medium">Total Phone Calls</span>
                <span className="block text-2xl font-bold font-heading text-zinc-100">{overview.totalCalls}</span>
                {overview.totalCalls > 0 && (
                  <span className="block text-[11px] text-zinc-400">Avg: {formatCallDuration(overview.avgCallDuration)}</span>
                )}
              </div>

              {/* Avg Response Time */}
              <div className="saas-card p-4 space-y-1.5">
                <span className="block text-zinc-400 text-xs font-medium">Avg Response Time</span>
                <span className="block text-2xl font-bold font-heading text-zinc-100">
                  {overview.avgResponseTime > 0 ? `${overview.avgResponseTime}s` : '< 1s'}
                </span>
              </div>

              {/* Resolution Rate */}
              <div className="saas-card p-4 space-y-1.5">
                <span className="block text-zinc-400 text-xs font-medium">Resolution Rate</span>
                <span className="block text-2xl font-bold font-heading text-indigo-400">{overview.resolutionRate}%</span>
              </div>

              {/* Average CSAT */}
              <div className="saas-card p-4 space-y-1.5">
                <span className="block text-zinc-400 text-xs font-medium">Average CSAT Rating</span>
                <span className="block text-2xl font-bold font-heading text-emerald-400">
                  {overview.avgCsat > 0 ? `${overview.avgCsat} ★` : 'N/A'}
                </span>
                {csat && csat.totalRated > 0 && (
                  <span className="block text-[11px] text-zinc-400">{csat.responseRate}% rated ({csat.totalRated})</span>
                )}
              </div>
            </div>

            {/* Time-series Volume Chart */}
            <div className="saas-panel p-6 space-y-4">
              <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase">
                Conversation Volume Over Time
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPhone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                    <YAxis stroke="#71717a" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: 12, color: '#f4f4f5' }} />
                    <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    <Area type="monotone" dataKey="web_chat" name="Web Chat" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorWeb)" />
                    <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWa)" />
                    <Area type="monotone" dataKey="phone" name="Phone Calls" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPhone)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Charts: Channel share & Outcome breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Channel Breakdown Share */}
              <div className="saas-panel p-6 space-y-4">
                <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase">
                  Channels Distribution Share
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: 12, color: '#f4f4f5' }} />
                      <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outcomes distribution */}
              <div className="saas-panel p-6 space-y-4">
                <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase">
                  AI Outcomes Classification
                </h3>
                <div className="h-64 w-full">
                  {outcomes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                      No outcomes detected yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={9} />
                        <YAxis stroke="#71717a" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: 12, color: '#f4f4f5' }} />
                        <Bar dataKey="count" name="Outcome Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Split Charts: CSAT Distribution & Knowledge Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* CSAT Distribution */}
              <div className="saas-panel p-6 space-y-4">
                <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase">
                  CSAT Ratings Distribution
                </h3>
                <div className="h-64 w-full">
                  {csat && csat.totalRated === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                      No satisfaction scores recorded yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={csatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="stars" stroke="#71717a" fontSize={10} />
                        <YAxis stroke="#71717a" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', fontSize: 12, color: '#f4f4f5' }} />
                        <Bar dataKey="count" name="Ratings Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Knowledge Gaps */}
              <div className="saas-panel p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase mb-1">
                    Top AI Knowledge Base Gaps
                  </h3>
                  <p className="text-[11px] text-zinc-400 mb-4">
                    Questions where the assistant triggered a fallback reply.
                  </p>

                  <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
                    {gaps.map((gap, index) => (
                      <div
                        key={index}
                        className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex justify-between items-center gap-4 text-xs"
                      >
                        <p className="text-zinc-300 truncate font-medium">"{gap.question}"</p>
                        <span className="saas-badge-indigo shrink-0">
                          {gap.count} hits
                        </span>
                      </div>
                    ))}
                    {gaps.length === 0 && (
                      <p className="text-xs text-zinc-500 italic text-center py-12">
                        No knowledge gaps identified in this period!
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
                  <Link
                    to="/knowledge-base"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shrink-0 shadow-sm"
                  >
                    Upload Document to KB →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Test Preview chat bubble */}
      <ChatWidget companyId={company?.id} />
    </DashboardLayout>
  );
};

export default Analytics;
