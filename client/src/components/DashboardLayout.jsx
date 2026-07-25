import React from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Link, useLocation } from 'react-router-dom';
import BillingBanner from './BillingBanner.jsx';
import ImpersonationBanner from './ImpersonationBanner.jsx';

export const DashboardLayout = ({ children }) => {
  const { user, company, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard', 
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' 
    },
    { 
      name: 'Knowledge Base', 
      path: '/knowledge-base', 
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' 
    },
    {
      name: 'Conversations',
      path: '/conversations',
      icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    },
    {
      name: 'Contacts',
      path: '/contacts',
      icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
    },
    {
      name: 'Calls',
      path: '/calls',
      icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.28-5.716-4.172-6.996-6.996l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z'
    },
    {
      name: 'Channels',
      path: '/channels',
      icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10'
    },
    {
      name: 'Workflows',
      path: '/workflows',
      icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
    },
    {
      name: 'Billing',
      path: '/billing',
      icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <ImpersonationBanner />
      {/* Top Header Area */}
      <header className="w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold font-heading shadow-subtle">
                B
              </div>
              <span className="text-lg font-bold font-heading tracking-tight text-zinc-100">
                Bolo AI
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-300">
                {company?.name || 'Workspace'}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-zinc-200">{user?.name}</p>
                <p className="text-[11px] text-zinc-400 capitalize font-medium">{user?.role} Access</p>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-zinc-100 rounded-lg text-xs font-medium transition"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Workspace Panel */}
      <div className="flex-grow flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-8">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="w-60 shrink-0 hidden md:block">
          <div className="sticky top-22 space-y-6">
            <div>
              <p className="px-3 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                Workspace
              </p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                        isActive
                          ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 border border-transparent'
                      }`}
                    >
                      <svg className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                      </svg>
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Content Panel */}
        <div className="flex-grow min-w-0">
          <BillingBanner />
          
          {/* Mobile Horizontal Navigation Header */}
          <nav className="flex md:hidden gap-1.5 mb-6 overflow-x-auto pb-2 border-b border-zinc-800/80">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isActive
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-300'
                      : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {children}
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
