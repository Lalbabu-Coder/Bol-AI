import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ChatWidget } from '../widget/ChatWidget.jsx';

export const Dashboard = () => {
  const { user, company } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Glow backdrop card */}
        <div className="glass rounded-2xl p-8 relative overflow-hidden">
          {/* Internal card glow element */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl font-extrabold text-white tracking-tight leading-none">
              Welcome, {user?.name || 'User'}
            </h2>
            <p className="text-slate-400 mt-3 text-lg leading-relaxed">
              You are currently logged into the <span className="text-slate-200 font-semibold">{company?.name}</span> tenant workspace. This environment guarantees secure, logical multi-tenancy isolation.
            </p>
            
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-900 pt-8">
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                <span className="block text-slate-500 text-xs font-bold uppercase tracking-wide">Workspace Slug</span>
                <span className="text-slate-200 text-sm font-mono mt-1 block">{company?.slug || 'n/a'}</span>
              </div>
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                <span className="block text-slate-500 text-xs font-bold uppercase tracking-wide">Your Role</span>
                <span className="text-brand-300 text-sm font-semibold capitalize mt-1 block">{user?.role || 'n/a'}</span>
              </div>
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                <span className="block text-slate-500 text-xs font-bold uppercase tracking-wide">Email Domain</span>
                <span className="text-slate-200 text-sm mt-1 block">{user?.email?.split('@')[1] || 'n/a'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Widget Test Preview Card */}
        <div className="glass rounded-2xl p-6 relative overflow-hidden border border-brand-500/20">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
            <div>
              <h3 className="text-lg font-bold text-white">Live AI Assistant Chat Widget Preview</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Interact with the floating chat bubble on the bottom right to test RAG-based context responses.
              </p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-brand-500/10 border border-brand-500/25 text-brand-300">
              Interactive Preview Mode
            </span>
          </div>
          
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            This card hosts a simulated live instance of the customer chat interface. Ask questions regarding documents vectorized in your <strong>Knowledge Base</strong>. The bubble on the bottom right connects directly with your tenant profile and OpenAI's <code>gpt-4o-mini</code> completion engine.
          </p>
        </div>

        {/* Informative scaffold guidelines block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Multi-Tenant Scoping</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Every database schema registered with the backend automatically inherits the <code>companyId</code> field. Queries executed downstream from authentication routes are automatically partitioned by the user's company context, safeguarding tenant data integrity.
            </p>
          </div>
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-3">Token Lifecycle</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Authentication utilizes double tokens: short-lived access tokens are held in-memory, while long-lived refresh tokens are stored in secure, HttpOnly cookies. Silent refresh occurs automatically in the background prior to token expiry.
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
