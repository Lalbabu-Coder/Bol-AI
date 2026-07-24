import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export const Register = () => {
  const [companyName, setCompanyName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!companyName || !userName || !email || !password) {
      setError('Please fill in all the registration fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    const result = await register(companyName, userName, email, password);
    setSubmitting(false);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-lg glass p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-brand-300 via-brand-500 to-violet-300 bg-clip-text text-transparent">
            Establish Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Create your new tenant company and register as owner
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Company Name
            </label>
            <input
              id="register-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Owner Name
            </label>
            <input
              id="register-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@acme.com"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
              required
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={submitting}
            className="md:col-span-2 w-full py-3 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-medium rounded-xl shadow-lg shadow-brand-500/20 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50"
          >
            {submitting ? 'Setting up account...' : 'Create Workspace'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-900 pt-6">
          <p className="text-slate-400 text-sm">
            Already have a workspace?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
