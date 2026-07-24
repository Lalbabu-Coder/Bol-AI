import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export const ImpersonationBanner = () => {
  const navigate = useNavigate();
  const { isImpersonating, company, exitImpersonation } = useAuth();

  if (!isImpersonating) return null;

  const handleExit = () => {
    const success = exitImpersonation();
    if (success) {
      navigate('/admin/companies');
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-red-600 to-amber-600 border-b border-red-700 text-white text-xs font-bold py-2 px-4 flex items-center justify-between shadow-md select-none shrink-0 animate-in slide-in-from-top duration-300 relative z-50">
      <div className="flex items-center space-x-2">
        <span className="text-sm">🛡️</span>
        <span>
          Viewing dashboard as <span className="underline">{company?.name || 'Workspace'}</span>. All changes are logged for security.
        </span>
      </div>
      
      <button
        onClick={handleExit}
        className="px-3 py-1 bg-slate-950/80 hover:bg-slate-950 text-white text-[10px] rounded-lg tracking-wider uppercase font-bold transition duration-150 shrink-0"
      >
        Exit Impersonation
      </button>
    </div>
  );
};

export default ImpersonationBanner;
