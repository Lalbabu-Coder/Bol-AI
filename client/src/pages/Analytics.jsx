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
      <div className="space-y-8 pb-12">
        {/* Header with Date Range Selector & Manual Refresh */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
              Analytics Overview
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Visualize conversation volumes, channel shares, and assistant quality metrics.
            </p>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 font-semibold focus:outline-none focus:border-brand-500"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <button
              onClick={fetchAnalytics}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition flex items-center justify-center"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="glass rounded-2xl p-16 text-center space-y-4 max-w-2xl mx-auto border border-dashed border-slate-800">
            <div className="text-4xl">📊</div>
            <h3 className="text-lg font-bold text-slate-200">No Analytics Available Yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Analytics metrics will appear here once you start receiving customer interactions on Web Chat, WhatsApp, or voice support.
            </p>
            <div className="pt-2">
              <Link
                to="/channels"
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition"
              >
                Configure Communication Channels
              </Link>
            </div>
          </div>
        ) : (
          /* Analytics Dashboard grids */
          <div className="space-y-8 animate-in fade-in">
            {/* Top row: KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Total Conversations */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
                <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Chats</span>
                <span className="block text-2xl font-black text-white">{overview.totalConversations}</span>
              </div>

              {/* Total Calls */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
                <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Calls</span>
                <span className="block text-2xl font-black text-white">{overview.totalCalls}</span>
                {overview.totalCalls > 0 && (
                  <span className="block text-[10px] text-slate-400 italic">Avg: {formatCallDuration(overview.avgCallDuration)}</span>
                )}
              </div>

              {/* Avg Response Time */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
                <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Avg Response Time</span>
                <span className="block text-2xl font-black text-white">
                  {overview.avgResponseTime > 0 ? `${overview.avgResponseTime}s` : '< 1s'}
                </span>
              </div>

              {/* Resolution Rate */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
                <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Resolution Rate</span>
                <span className="block text-2xl font-black text-brand-300">{overview.resolutionRate}%</span>
              </div>

              {/* Average CSAT */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl space-y-2">
                <span className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Average CSAT</span>
                <span className="block text-2xl font-black text-emerald-400">
                  {overview.avgCsat > 0 ? `${overview.avgCsat} ★` : 'n/a'}
                </span>
                {csat && csat.totalRated > 0 && (
                  <span className="block text-[10px] text-slate-400 italic">Rate: {csat.responseRate}% ({csat.totalRated} rated)</span>
                )}
              </div>
            </div>

            {/* Time-series Volume Chart */}
            <div className="glass rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Conversation Volume Over Time
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPhone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#1e293b/40" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="web_chat" name="Web Chat" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorWeb)" />
                    <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorWa)" />
                    <Area type="monotone" dataKey="phone" name="Phone Calls" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorPhone)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Charts: Channel share & Outcome breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Channel Breakdown Share */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
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
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outcomes distribution */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  AI Outcomes Classification
                </h3>
                <div className="h-64 w-full">
                  {outcomes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No outcomes detected yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#1e293b/40" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 12 }} />
                        <Bar dataKey="count" name="Outcome Count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Split Charts: CSAT Distribution & Knowledge Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CSAT Distribution */}
              <div className="glass rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  CSAT Ratings Distribution
                </h3>
                <div className="h-64 w-full">
                  {csat && csat.totalRated === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-slate-500">
                      No satisfaction scores recorded yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={csatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#1e293b/40" strokeDasharray="3 3" />
                        <XAxis dataKey="stars" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: 12 }} />
                        <Bar dataKey="count" name="Ratings Count" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Knowledge Gaps */}
              <div className="glass rounded-2xl p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Top AI Knowledge Base Gaps
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-4">
                    List of user questions that triggered "don't have information" style replies from the bot.
                  </p>

                  <div className="space-y-3 max-h-[170px] overflow-y-auto pr-1">
                    {gaps.map((gap, index) => (
                      <div
                        key={index}
                        className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl flex justify-between items-center gap-4 text-xs"
                      >
                        <p className="text-slate-300 truncate font-medium">"{gap.question}"</p>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-brand-300 font-bold shrink-0">
                          {gap.count} hits
                        </span>
                      </div>
                    ))}
                    {gaps.length === 0 && (
                      <p className="text-xs text-slate-600 italic text-center py-12">
                        No knowledge gaps identified in this period!
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-900/60 flex justify-end">
                  <Link
                    to="/knowledge-base"
                    className="px-3.5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition shrink-0"
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
