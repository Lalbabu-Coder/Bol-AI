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
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchAnalytics = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

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
      setRefreshing(false);
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
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <p className="text-xs text-zinc-400 font-bold tracking-wide">Aggregating workspace intelligence...</p>
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
      <div className="space-y-8 font-sans pb-16">
        
        {/* Top Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <h1 className="text-3xl sm:text-4xl font-black font-heading text-white tracking-tight">
                Analytics & Insights
              </h1>
              <span className="saas-badge-emerald flex items-center gap-1.5 px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Intelligence Feed
              </span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
              Real-time multi-tenant telemetry across conversation traffic, AI resolution rate, and knowledge coverage.
            </p>
          </div>
          
          <div className="flex items-center space-x-3 shrink-0">
            <select
              value={rangeDays}
              onChange={(e) => setRangeDays(e.target.value)}
              className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-100 font-bold focus:outline-none focus:border-indigo-500 transition shadow-sm"
            >
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <button
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="btn-secondary px-4 py-2.5 text-xs flex items-center gap-2 font-bold rounded-xl"
              title="Refresh Analytics Data"
            >
              <svg 
                className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Live Architecture Micro-Telemetry Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xs">
              ⚡
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">AI RAG Engine</span>
              <span className="text-xs font-bold text-zinc-200">Gemini 1.5 Flash / Vector 768d</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
              🛡️
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Multi-Tenancy</span>
              <span className="text-xs font-bold text-zinc-200">AsyncLocalStorage Scoped</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
              💬
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Channels Config</span>
              <span className="text-xs font-bold text-zinc-200">Web + WhatsApp + Twilio Voice</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-xs">
              🔑
            </div>
            <div>
              <span className="block text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider">Session Security</span>
              <span className="text-xs font-bold text-zinc-200">JWT + HttpOnly Cookie Queue</span>
            </div>
          </div>
        </div>

        {!hasData ? (
          /* Empty State */
          <div className="saas-panel p-16 text-center space-y-6 max-w-2xl mx-auto border-dashed border-zinc-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-glow">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-extrabold font-heading text-white">No Analytics Data Yet</h3>
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-md mx-auto mt-2">
                Metrics will automatically populate once your AI assistant handles customer queries on Web Chat, WhatsApp, or Voice calls.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/channels"
                className="btn-primary px-6 py-3 text-xs font-bold inline-flex items-center gap-2 rounded-xl"
              >
                <span>Setup Omnichannel Channels</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Analytics Dashboard Grids */
          <div className="space-y-8">
            
            {/* Top Row: Expansive 5 KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              
              {/* Total Conversations */}
              <div className="saas-panel-hover p-6 space-y-4 border-t-4 border-t-indigo-500 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>Conversations</span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black font-heading text-white tracking-tight">{overview.totalConversations}</span>
                    <span className="saas-badge-indigo text-[10px]">+100% Live</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-full w-[80%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Total Voice Calls */}
              <div className="saas-panel-hover p-6 space-y-4 border-t-4 border-t-amber-500 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>Voice Calls</span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.28-5.716-4.172-6.996-6.996l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black font-heading text-white tracking-tight">{overview.totalCalls}</span>
                    <span className="saas-badge-amber text-[10px]">Twilio Agent</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-full w-[40%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Avg Response Latency */}
              <div className="saas-panel-hover p-6 space-y-4 border-t-4 border-t-purple-500 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>AI Latency</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black font-heading text-white tracking-tight">
                      {overview.avgResponseTime > 0 ? `${overview.avgResponseTime}s` : '< 1s'}
                    </span>
                    <span className="saas-badge-purple text-[10px]">Fast RAG</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-purple-500 h-full w-[90%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Resolution Rate */}
              <div className="saas-panel-hover p-6 space-y-4 border-t-4 border-t-emerald-500 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>Resolution Rate</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black font-heading text-emerald-400 tracking-tight">{overview.resolutionRate}%</span>
                    <span className="saas-badge-emerald text-[10px]">Optimal</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-emerald-500 h-full w-[65%] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Average CSAT */}
              <div className="saas-panel-hover p-6 space-y-4 border-t-4 border-t-rose-500 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between text-zinc-400 text-xs font-extrabold uppercase tracking-wider">
                  <span>CSAT Rating</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-4xl font-black font-heading text-rose-400 tracking-tight">
                      {overview.avgCsat > 0 ? `${overview.avgCsat} ★` : '5.0 ★'}
                    </span>
                    <span className="saas-badge-rose text-[10px]">Feedback</span>
                  </div>
                  <div className="w-full bg-zinc-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-rose-500 h-full w-[100%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Time-series Volume Chart */}
            <div className="saas-panel p-6 sm:p-8 space-y-6 rounded-3xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-2">
                <div>
                  <h3 className="text-base font-extrabold font-heading text-white tracking-wide uppercase">
                    Conversation Volume Traffic
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Historical traffic breakdown across Web Chat, WhatsApp, and Voice calls</p>
                </div>
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Web Chat
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> WhatsApp
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Voice
                  </span>
                </div>
              </div>

              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={volume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeb" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorWa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorPhone" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} />
                    <YAxis stroke="#71717a" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#121215', borderColor: '#27272a', borderRadius: '12px', fontSize: 12, color: '#f4f4f5', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.6)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa', paddingTop: 10 }} />
                    <Area type="monotone" dataKey="web_chat" name="Web Chat" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorWeb)" />
                    <Area type="monotone" dataKey="whatsapp" name="WhatsApp" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWa)" />
                    <Area type="monotone" dataKey="phone" name="Phone Calls" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorPhone)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Charts: Channel Share & Outcome Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Channel Distribution Share */}
              <div className="saas-panel p-6 sm:p-8 space-y-4 rounded-3xl">
                <h3 className="text-xs font-bold font-heading text-zinc-300 tracking-wider uppercase border-b border-zinc-800/80 pb-3">
                  Channel Distribution Breakdown
                </h3>
                <div className="h-72 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={95}
                        paddingAngle={6}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#121215', borderColor: '#27272a', borderRadius: '12px', fontSize: 12, color: '#f4f4f5' }} />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Outcomes Classification */}
              <div className="saas-panel p-6 sm:p-8 space-y-4 rounded-3xl">
                <h3 className="text-xs font-bold font-heading text-zinc-300 tracking-wider uppercase border-b border-zinc-800/80 pb-3">
                  AI Resolution Outcomes
                </h3>
                <div className="h-72 w-full">
                  {outcomes.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                      No outcomes detected yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outcomes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#71717a" fontSize={11} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#121215', borderColor: '#27272a', borderRadius: '12px', fontSize: 12, color: '#f4f4f5' }} />
                        <Bar dataKey="count" name="Outcome Count" fill="#6366f1" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Split Charts: CSAT Distribution & Knowledge Gaps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* CSAT Ratings */}
              <div className="saas-panel p-6 sm:p-8 space-y-4 rounded-3xl">
                <h3 className="text-xs font-bold font-heading text-zinc-300 tracking-wider uppercase border-b border-zinc-800/80 pb-3">
                  CSAT Ratings Breakdown
                </h3>
                <div className="h-72 w-full">
                  {csat && csat.totalRated === 0 ? (
                    <div className="h-full flex items-center justify-center text-xs text-zinc-500">
                      No satisfaction scores recorded yet.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={csatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                        <XAxis dataKey="stars" stroke="#71717a" fontSize={11} />
                        <YAxis stroke="#71717a" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: '#121215', borderColor: '#27272a', borderRadius: '12px', fontSize: 12, color: '#f4f4f5' }} />
                        <Bar dataKey="count" name="Ratings Count" fill="#10b981" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Knowledge Base Gaps */}
              <div className="saas-panel p-6 sm:p-8 flex flex-col justify-between space-y-4 rounded-3xl">
                <div>
                  <h3 className="text-xs font-bold font-heading text-zinc-300 tracking-wider uppercase mb-1 border-b border-zinc-800/80 pb-3">
                    Knowledge Base Coverage Gaps
                  </h3>
                  <p className="text-xs text-zinc-400 my-3">
                    Queries where the assistant triggered fallback responses.
                  </p>

                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {gaps.map((gap, index) => (
                      <div
                        key={index}
                        className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex justify-between items-center gap-4 text-xs hover:border-indigo-500/30 transition"
                      >
                        <p className="text-zinc-200 truncate font-semibold">"{gap.question}"</p>
                        <span className="saas-badge-indigo shrink-0 font-bold px-2.5 py-1">
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
                    className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 rounded-xl"
                  >
                    <span>Upload Document to KB</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
      
      {/* Floating Chat Widget Preview */}
      <ChatWidget companyId={company?.id} />
    </DashboardLayout>
  );
};

export default Analytics;
