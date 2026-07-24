import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

/**
 * Route protector checking auth context state
 */
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        {/* Glowing glassmorphism spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin"></div>
        </div>
        <p className="text-slate-400 font-medium tracking-wide animate-pulse">
          Synchronizing Workspace Session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
