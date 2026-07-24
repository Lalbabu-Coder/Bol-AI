import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export const AdminLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      navigate('/login');
    }
  };

  const navItems = [
    {
      name: 'Companies',
      path: '/admin/companies',
      icon: 'M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z'
    },
    {
      name: 'Metrics',
      path: '/admin/metrics',
      icon: 'M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z'
    },
    {
      name: 'System Health',
      path: '/admin/health',
      icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-900/60 flex flex-col justify-between shrink-0">
        <div className="p-6 space-y-8">
          {/* Logo brand */}
          <div className="flex items-center space-x-2">
            <span className="text-xl font-black bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
              BOLO ADMIN
            </span>
            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/25 text-[8px] text-red-400 font-bold uppercase tracking-wider">
              Super
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-xs font-bold tracking-wide transition ${
                    isActive
                      ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950 border border-transparent'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Identity and Logout */}
        <div className="p-6 border-t border-slate-950/60 flex items-center justify-between">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-200 truncate">Super Administrator</span>
            <span className="text-[10px] text-slate-500 truncate">Platform Owner</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 hover:bg-slate-950 rounded-xl transition text-slate-400 hover:text-red-400"
            title="Log Out"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Administrative Work Space */}
      <main className="flex-grow p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
