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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 relative font-sans antialiased overflow-hidden bg-mesh-glow">
      {/* Dynamic Ambient Glowing Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-purple-600/15 to-pink-500/10 rounded-full blur-3xl pointer-events-none animate-pulse-subtle"></div>

      <div className="w-full max-w-lg bg-glass-card border border-zinc-800/80 p-8 sm:p-10 rounded-2xl shadow-2xl relative z-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-2xl font-heading shadow-glow mx-auto mb-4">
            B
          </div>
          <h1 className="text-2xl font-extrabold font-heading tracking-tight text-white">
            Establish Workspace
          </h1>
          <p className="text-zinc-400 text-xs mt-2 leading-relaxed">
            Create your multi-tenant environment & register as workspace owner
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

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
              Company / Workspace Name
            </label>
            <input
              id="register-company"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corporation"
              className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
              Owner Name
            </label>
            <input
              id="register-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Jane Doe"
              className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
              required
            />
          </div>

          <div>
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
              Work Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
              className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5">
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="input-field w-full px-4 py-3 text-sm placeholder-zinc-500"
              required
            />
          </div>

          <button
            id="register-submit"
            type="submit"
            disabled={submitting}
            className="btn-primary md:col-span-2 w-full py-3 mt-2 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                <span>Creating workspace...</span>
              </>
            ) : (
              <span>Create Workspace & Start Free →</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/80 pt-6">
          <p className="text-zinc-400 text-xs">
            Already have a workspace?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
              Sign In →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
