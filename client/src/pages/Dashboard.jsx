import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ChatWidget } from '../widget/ChatWidget.jsx';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const { user, company } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-12 font-sans">
        
        {/* Hero Welcome Panel with Gradient Accent */}
        <div className="saas-panel p-8 relative overflow-hidden bg-gradient-to-br from-zinc-900/90 via-zinc-900/60 to-indigo-950/40 border border-zinc-800/90">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-4">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
              <span>Multi-Tenant Enterprise Isolation</span>
            </div>

            <h1 className="text-3xl font-extrabold font-heading text-white tracking-tight">
              Welcome back, {user?.name || 'User'} 👋
            </h1>
            <p className="text-zinc-400 mt-2.5 text-xs sm:text-sm leading-relaxed">
              You are logged into <strong className="text-white font-semibold">{company?.name}</strong>. Your multi-tenant environment safely isolates MongoDB database collections, Gemini/OpenAI RAG vector indices, and customer analytics.
            </p>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-800/80 pt-6">
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/90">
                <span className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Workspace Slug</span>
                <span className="text-indigo-300 text-xs font-mono font-semibold mt-1 block">{company?.slug || 'n/a'}</span>
              </div>
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/90">
                <span className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Access Scope</span>
                <span className="text-emerald-400 text-xs font-bold capitalize mt-1 block">{user?.role || 'Member'}</span>
              </div>
              <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/90">
                <span className="block text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Account Email</span>
                <span className="text-zinc-200 text-xs font-medium mt-1 block truncate">{user?.email || 'n/a'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Widget Test Preview Card */}
        <div className="saas-panel-hover p-6 sm:p-8 border-indigo-500/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <div>
              <h3 className="text-base font-bold font-heading text-white">Live AI Assistant Chat Simulation</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Interact with the floating AI widget on the bottom right to test context-aware RAG responses.
              </p>
            </div>
            <span className="saas-badge-indigo shrink-0">
              Interactive Sandbox
            </span>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
            This workspace hosts a live simulation of your customer web widget. Questions asked to the assistant query vector embeddings in your <strong>Knowledge Base</strong> using multi-tenant vector RAG pipelines.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to="/knowledge-base"
              className="btn-primary px-4 py-2 text-xs"
            >
              Manage Knowledge Base →
            </Link>
            <Link
              to="/channels"
              className="btn-secondary px-4 py-2 text-xs"
            >
              Configure Channels
            </Link>
          </div>
        </div>

        {/* Architecture Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="saas-panel-hover p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold font-heading text-white">Strict Tenant Isolation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every database collection automatically scopes queries with <code className="text-zinc-200 font-mono">companyId</code> context filters, guaranteeing multi-tenant security across API routes and vector searches.
            </p>
          </div>

          <div className="saas-panel-hover p-6 space-y-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold font-heading text-white">Security & Token Mechanics</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Access tokens are securely passed in memory while refresh tokens are stored in HttpOnly, SameSite cookies. Background silent refreshes ensure seamless session preservation.
            </p>
          </div>
        </div>
      </div>
      
      {/* Floating Chat Widget Preview */}
      <ChatWidget companyId={company?.id} />
    </DashboardLayout>
  );
};

export default Dashboard;
