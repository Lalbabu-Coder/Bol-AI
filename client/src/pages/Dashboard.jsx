import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ChatWidget } from '../widget/ChatWidget.jsx';

export const Dashboard = () => {
  const { user, company } = useAuth();

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Welcome Card */}
        <div className="saas-panel p-6 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
              Welcome back, {user?.name || 'User'}
            </h1>
            <p className="text-zinc-400 mt-2 text-xs leading-relaxed">
              You are currently logged into the <span className="text-zinc-200 font-medium">{company?.name}</span> workspace. Your multi-tenant environment isolates data, vector indices, and customer analytics.
            </p>
            
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-800/80 pt-5">
              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
                <span className="block text-zinc-400 text-[10px] font-medium uppercase tracking-wide">Workspace Slug</span>
                <span className="text-zinc-200 text-xs font-mono mt-0.5 block">{company?.slug || 'n/a'}</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
                <span className="block text-zinc-400 text-[10px] font-medium uppercase tracking-wide">Role</span>
                <span className="text-indigo-400 text-xs font-semibold capitalize mt-0.5 block">{user?.role || 'n/a'}</span>
              </div>
              <div className="bg-zinc-950 p-3.5 rounded-lg border border-zinc-800">
                <span className="block text-zinc-400 text-[10px] font-medium uppercase tracking-wide">Email Domain</span>
                <span className="text-zinc-200 text-xs mt-0.5 block">{user?.email?.split('@')[1] || 'n/a'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Widget Test Preview Card */}
        <div className="saas-panel p-6 border-indigo-500/30">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold font-heading text-zinc-100">Live AI Chat Widget Preview</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Interact with the floating chat bubble on the bottom right to test RAG-based context responses.
              </p>
            </div>
            <span className="saas-badge-indigo shrink-0">
              Interactive Preview
            </span>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
            This workspace hosts a live simulation of your customer web widget. Questions asked to the assistant query vector embeddings in your <strong>Knowledge Base</strong> using <code className="text-zinc-300">gpt-4o-mini</code>.
          </p>
        </div>

        {/* Informative scaffold guidelines block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="saas-panel p-5 space-y-2">
            <h3 className="text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">Multi-Tenant Isolation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every database collection automatically scopes queries with <code className="text-zinc-300">companyId</code> context filters, guaranteeing multi-tenant security across API routes and vector searches.
            </p>
          </div>
          <div className="saas-panel p-5 space-y-2">
            <h3 className="text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">Security Architecture</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Access tokens are securely passed via authorization headers while refresh tokens are stored in HttpOnly, SameSite cookies. Background silent refreshes ensure zero user interruption.
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
