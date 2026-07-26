import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);

    if (result.success) {
      if (result.role === 'superadmin') {
        navigate('/admin/companies');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative font-sans antialiased overflow-hidden bg-mesh-glow">
      {/* Dynamic Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-glass-card border border-zinc-800/80 p-8 sm:p-10 rounded-2xl shadow-2xl relative z-10">
        
        {/* Brand Logo & Heading */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl font-heading shadow-glow mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-extrabold font-heading tracking-tight text-white">
            Welcome to Bolo AI
          </h1>
          <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
            Sign in to access your multi-tenant workspace & AI operations
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-2.5">
            <svg className="w-4 h-4 text-rose-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-zinc-300 text-xs font-semibold">
                Password
              </label>
            </div>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
              required
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3 mt-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In to Workspace</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/80 pt-6">
          <p className="text-zinc-400 text-xs">
            Don't have a workspace yet?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
              Establish Workspace →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
