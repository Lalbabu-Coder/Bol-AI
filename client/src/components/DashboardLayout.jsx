import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Link, useLocation } from 'react-router-dom';
import BillingBanner from './BillingBanner.jsx';
import ImpersonationBanner from './ImpersonationBanner.jsx';

export const DashboardLayout = ({ children }) => {
  const { user, company, logout } = useAuth();
  const location = useLocation();

  const navGroups = [
    {
      title: 'PLATFORM CORE',
      items: [
        { 
          name: 'Overview & Analytics', 
          path: '/dashboard', 
          icon: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z'
        },
        { 
          name: 'Knowledge Base', 
          path: '/knowledge-base', 
          badge: 'RAG',
          badgeColor: 'saas-badge-indigo',
          icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' 
        },
        {
          name: 'Conversations',
          path: '/conversations',
          icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z'
        },
        {
          name: 'Contacts CRM',
          path: '/contacts',
          icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
        }
      ]
    },
    {
      title: 'INTEGRATIONS & AI',
      items: [
        {
          name: 'Voice Agent Calls',
          path: '/calls',
          badge: 'Voice',
          badgeColor: 'saas-badge-amber',
          icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.28-5.716-4.172-6.996-6.996l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
        },
        {
          name: 'Channels Config',
          path: '/channels',
          badge: 'Live',
          badgeColor: 'saas-badge-emerald',
          icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
        },
        {
          name: 'AI Workflows',
          path: '/workflows',
          badge: 'Auto',
          badgeColor: 'saas-badge-purple',
          icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
        }
      ]
    },
    {
      title: 'SETTINGS',
      items: [
        {
          name: 'Billing & Plans',
          path: '/billing',
          icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans bg-mesh-glow selection:bg-indigo-500/30 selection:text-indigo-200 antialiased">
      <ImpersonationBanner />
      
      {/* Full-Width Edge-to-Edge Glass Header */}
      <header className="w-full bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50 border-b border-zinc-800/70 px-6 py-3">
        <div className="w-full flex items-center justify-between">
          
          {/* Left: Brand Logo & Workspace Selector */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-xl font-heading shadow-glow transition group-hover:scale-105">
                B
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-extrabold font-heading tracking-tight text-white group-hover:text-indigo-300 transition">
                    Bolo AI
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold font-mono uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    Enterprise
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400 font-medium -mt-0.5">
                  Multi-Tenant Platform
                </span>
              </div>
            </Link>

            <div className="h-5 w-px bg-zinc-800 hidden sm:block"></div>

            {/* Active Workspace Selector Pill */}
            <div className="hidden sm:flex items-center space-x-2.5 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-400 font-medium">Tenant:</span>
              <span className="text-zinc-100 font-semibold truncate max-w-[160px]">
                {company?.name || 'Workspace'}
              </span>
              <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/50">
                {company?.slug || 'tenant'}
              </span>
            </div>
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center space-x-4">
            
            {/* Live System Status Pill */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] font-semibold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>All Systems Operational</span>
            </div>

            {user?.role === 'superadmin' && (
              <Link
                to="/admin/companies"
                className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-xl text-xs font-bold transition shadow-sm"
              >
                Superadmin Panel
              </Link>
            )}

            {/* Profile Pill */}
            <div className="flex items-center space-x-3 bg-zinc-900/90 border border-zinc-800/80 rounded-xl px-3.5 py-1.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold font-heading">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-zinc-100 leading-none">{user?.name}</p>
                <p className="text-[10px] text-indigo-400 font-semibold capitalize mt-0.5">
                  {user?.role || 'Owner'}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 hover:text-rose-300 hover:border-rose-900/50 rounded-xl"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Height Workspace Area */}
      <div className="flex-grow flex w-full">
        
        {/* Full-Height Edge Sidebar Navigation */}
        <aside className="w-64 shrink-0 hidden md:flex flex-col border-r border-zinc-800/70 bg-zinc-950/40 p-4 space-y-6 min-h-[calc(100vh-4rem)]">
          <div className="space-y-6 flex-1">
            {navGroups.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-2">
                <p className="px-3 text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">
                  {group.title}
                </p>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 relative ${
                          isActive
                            ? 'bg-indigo-600/15 border border-indigo-500/30 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Active Neon Accent Bar */}
                          {isActive && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-glow"></span>
                          )}
                          <svg 
                            className={`w-4 h-4 transition-colors ${
                              isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.75" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                          </svg>
                          <span>{item.name}</span>
                        </div>

                        {item.badge && (
                          <span className={`${item.badgeColor || 'saas-badge-indigo'} text-[10px] font-bold`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Edge Sidebar Footer Info Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900/90 to-indigo-950/40 border border-zinc-800/80 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-200 font-bold font-heading">Multi-Tenant Isolated</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              AsyncLocalStorage scopes DB & Vector RAG operations per tenant safely.
            </p>
          </div>
        </aside>

        {/* Expansive Main Content Section */}
        <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 max-w-[1700px] mx-auto w-full">
          <BillingBanner />
          
          {/* Mobile Horizontal Navigation Bar */}
          <nav className="flex md:hidden gap-2 mb-6 overflow-x-auto pb-2 border-b border-zinc-800/80 scrollbar-none">
            {navGroups.flatMap(g => g.items).map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
