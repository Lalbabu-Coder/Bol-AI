import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import { AdminLayout } from '../components/AdminLayout.jsx';
import { useAuth } from '../hooks/useAuth.js';

export const AdminCompanies = () => {
  const navigate = useNavigate();
  const { impersonate } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Selected company for detail drawer/modal
  const [selectedId, setSelectedId] = useState(null);
  const [companyDetail, setCompanyDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Override Form states
  const [overridePlanId, setOverridePlanId] = useState('');
  const [overrideTrialDate, setOverrideTrialDate] = useState('');
  const [overrideActive, setOverrideActive] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/api/admin/companies?page=${page}&search=${search}&plan=${plan}&status=${status}`
      );
      setCompanies(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      process.stderr.write(`Failed to load companies: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [page, plan, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCompanies();
  };

  const handleOpenDetail = async (id) => {
    setSelectedId(id);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/api/admin/companies/${id}`);
      const data = res.data.data;
      setCompanyDetail(data);
      setOverridePlanId(data.company.subscription?.planId || 'starter');
      setOverrideActive(data.company.isActive);
      if (data.company.subscription?.trialEndsAt) {
        setOverrideTrialDate(data.company.subscription.trialEndsAt.split('T')[0]);
      } else {
        setOverrideTrialDate('');
      }
    } catch (err) {
      alert('Failed to load company details.');
      setSelectedId(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSaveOverrides = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await api.patch(`/api/admin/companies/${selectedId}`, {
        isActive: overrideActive,
        planId: overridePlanId,
        trialEndsAt: overrideTrialDate || undefined
      });
      alert('Overrides applied successfully!');
      fetchCompanies();
      handleOpenDetail(selectedId);
    } catch (err) {
      alert(`Save failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleImpersonate = async () => {
    if (!confirm(`Impersonate company "${companyDetail.company.name}"? Every action you take is audited.`)) return;
    try {
      const res = await api.post(`/api/admin/companies/${selectedId}/impersonate`);
      const { token, user: targetUser } = res.data.data;

      // Extract target company wrapper mock
      const targetCompany = {
        id: companyDetail.company.id,
        name: companyDetail.company.name,
        slug: companyDetail.company.slug
      };

      // Set impersonation context
      impersonate(token, targetUser, targetCompany);

      // Redirect to tenant workspace
      navigate('/dashboard');
    } catch (err) {
      alert(`Impersonation failed: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">Companies Directory</h1>
          <p className="text-zinc-400 text-xs mt-1">
            Monitor workspace tenants, modify plans, and start audit-logged impersonation sessions.
          </p>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition w-full sm:w-64"
          />

          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="pro">Pro</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Paid</option>
            <option value="trialing">Trialing</option>
            <option value="canceled">Canceled</option>
            <option value="past_due">Past Due</option>
          </select>

          <button
            type="submit"
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition shrink-0"
          >
            Search
          </button>
        </form>

        {/* Directory Grid Table */}
        <div className="saas-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Company</th>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-center">All-time Chats</th>
                  <th className="p-3.5">Last Activity</th>
                  <th className="p-3.5">Signup Date</th>
                  <th className="p-3.5">Active</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-900/40 text-zinc-300 transition">
                    <td className="p-3.5 pl-4 font-medium text-zinc-100">{c.name}</td>
                    <td className="p-3.5 capitalize text-zinc-300">{c.plan}</td>
                    <td className="p-3.5">
                      <span className={c.status === 'active' ? 'saas-badge-emerald uppercase' : 'saas-badge-rose uppercase'}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-medium text-zinc-200">{c.totalConversations}</td>
                    <td className="p-3.5 text-zinc-400">{new Date(c.lastActivityDate).toLocaleDateString()}</td>
                    <td className="p-3.5 text-zinc-400">{new Date(c.signupDate).toLocaleDateString()}</td>
                    <td className="p-3.5">
                      <span className={`w-2 h-2 rounded-full inline-block ${c.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <button
                        onClick={() => handleOpenDetail(c.id)}
                        className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && companies.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-zinc-500 italic">
                      No companies found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center text-xs">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg transition disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-zinc-400">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg transition disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {/* Management Modal */}
        {selectedId && companyDetail && (
          <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-zinc-900 border border-zinc-800 max-w-3xl w-full rounded-2xl p-6 space-y-6 shadow-card my-8">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-zinc-800/80 pb-4">
                <div>
                  <h3 className="text-lg font-bold font-heading text-zinc-100">{companyDetail.company.name}</h3>
                  <span className="text-[11px] text-zinc-500 font-mono mt-0.5 block">ID: {companyDetail.company.id}</span>
                </div>
                <button
                  onClick={() => { setSelectedId(null); setCompanyDetail(null); }}
                  className="text-zinc-400 hover:text-zinc-100 text-base focus:outline-none"
                >
                  ✕
                </button>
              </div>

              {/* Grid content split: details & overrides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                {/* Stats & Metadata Column */}
                <div className="space-y-4">
                  {/* Channels connected */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-2">
                    <span className="block font-semibold text-zinc-400 uppercase text-[10px] tracking-wide">Integrations Status</span>
                    <div className="flex space-x-4">
                      <span className={companyDetail.company.channels.whatsapp ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                        ● WhatsApp {companyDetail.company.channels.whatsapp ? 'Active' : 'Locked'}
                      </span>
                      <span className={companyDetail.company.channels.voice ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                        ● Voice {companyDetail.company.channels.voice ? 'Active' : 'Locked'}
                      </span>
                    </div>
                  </div>

                  {/* Usage Progress meters */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-3">
                    <span className="block font-semibold text-zinc-400 uppercase text-[10px] tracking-wide">Resource Consumption this Month</span>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Conversations</span>
                        <span className="font-medium text-zinc-200">
                          {companyDetail.usage.conversationsUsed} / {companyDetail.limits.maxConversationsPerMonth}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">KB Documents</span>
                        <span className="font-medium text-zinc-200">
                          {companyDetail.usage.docsUsed} / {companyDetail.limits.maxKnowledgeBaseDocs}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-400">Workflows Rules</span>
                        <span className="font-medium text-zinc-200">
                          {companyDetail.usage.rulesUsed} / {companyDetail.limits.maxWorkflowRules}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Users account lists */}
                  <div className="space-y-2">
                    <span className="block font-semibold text-zinc-400 uppercase text-[10px] tracking-wide">Workspace Users ({companyDetail.users.length})</span>
                    <div className="max-h-[120px] overflow-y-auto space-y-1.5 pr-1">
                      {companyDetail.users.map((u) => (
                        <div key={u.email} className="p-2 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex justify-between">
                          <span className="text-zinc-300 truncate mr-2 font-medium">{u.email}</span>
                          <span className="text-zinc-500 capitalize shrink-0 font-semibold">{u.role}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Overrides form column */}
                <form onSubmit={handleSaveOverrides} className="space-y-4">
                  <span className="block font-semibold text-zinc-400 uppercase text-[10px] tracking-wide">Manual Overrides</span>

                  <div className="space-y-3">
                    {/* Active override */}
                    <div className="flex items-center justify-between p-2.5 bg-zinc-950 border border-zinc-800/80 rounded-lg">
                      <span className="text-zinc-300 font-medium">Account Active</span>
                      <input
                        type="checkbox"
                        checked={overrideActive}
                        onChange={(e) => setOverrideActive(e.target.checked)}
                        className="w-4 h-4 text-indigo-600 focus:ring-0 rounded cursor-pointer"
                      />
                    </div>

                    {/* Plan selection override */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Plan Tier</label>
                      <select
                        value={overridePlanId}
                        onChange={(e) => setOverridePlanId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                      >
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="pro">Pro</option>
                      </select>
                    </div>

                    {/* Trial end override */}
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Trial Deadline</label>
                      <input
                        type="date"
                        value={overrideTrialDate}
                        onChange={(e) => setOverrideTrialDate(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition disabled:opacity-50 shadow-sm"
                    >
                      {updating ? 'Applying settings...' : 'Apply Overrides'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Impersonation bar */}
              <div className="border-t border-zinc-800/80 pt-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-[11px] text-zinc-500 italic">
                  Note: Actions during impersonation session are recorded to AdminAuditLogs.
                </span>
                
                <button
                  type="button"
                  onClick={handleImpersonate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition flex items-center space-x-2 shadow-sm shrink-0"
                >
                  <span>🔑</span>
                  <span>Impersonate Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCompanies;
