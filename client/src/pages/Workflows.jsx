import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const Workflows = () => {
  const [activeTab, setActiveTab] = useState('rules'); // rules, logs
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Form states for rule builder
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleActions, setRuleActions] = useState([]); // Array of { type, config }

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // Available actions config dropdowns/values
  const leadStatuses = ['new', 'contacted', 'qualified', 'converted', 'lost'];

  // Fetch all workflow rules
  const fetchRules = async () => {
    setLoadingRules(true);
    try {
      const res = await api.get('/api/workflows');
      setRules(res.data.data);
    } catch (err) {
      process.stderr.write(`Failed to fetch workflow rules: ${err.message}\n`);
    } finally {
      setLoadingRules(false);
    }
  };

  // Fetch execution logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await api.get(`/api/workflows/logs?status=${logStatusFilter}&page=${logPage}&limit=10`);
      setLogs(res.data.data);
      setLogTotalPages(res.data.pagination.pages);
    } catch (err) {
      process.stderr.write(`Failed to fetch workflow logs: ${err.message}\n`);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rules') {
      fetchRules();
    } else {
      fetchLogs();
    }
  }, [activeTab, logStatusFilter, logPage]);

  // Handle active status toggle for a rule
  const handleToggleActive = async (ruleId, currentStatus) => {
    try {
      const res = await api.patch(`/api/workflows/${ruleId}`, {
        isActive: !currentStatus
      });
      setRules(rules.map(r => r._id === ruleId ? res.data.data : r));
    } catch (err) {
      alert(`Error toggling rule status: ${err.response?.data?.message || err.message}`);
    }
  };

  // Add empty action structure to builder
  const handleAddAction = (type) => {
    let config = {};
    if (type === 'update_lead_status') {
      config = { newStatus: 'qualified' };
    } else if (type === 'send_whatsapp_followup') {
      config = { messageTemplate: 'Hello, thank you for chatting with us. Here is a summary of our chat: {{summary}}' };
    } else if (type === 'send_email_followup') {
      config = { subject: 'Follow-up on our conversation', bodyTemplate: 'Hello,\n\nWe wanted to follow up with you. Here is the summary of what we discussed:\n{{summary}}' };
    }
    setRuleActions([...ruleActions, { type, config }]);
  };

  // Remove action from builder
  const handleRemoveAction = (index) => {
    const updated = [...ruleActions];
    updated.splice(index, 1);
    setRuleActions(updated);
  };

  // Edit config for an action inside ruleActions array
  const handleActionConfigChange = (index, key, value) => {
    const updated = [...ruleActions];
    updated[index].config[key] = value;
    setRuleActions(updated);
  };

  // Open rule builder for creation or editing
  const handleOpenBuilder = (rule = null) => {
    if (rule) {
      setEditingRuleId(rule._id);
      setRuleName(rule.name);
      setRuleActions(JSON.parse(JSON.stringify(rule.actions))); // Deep clone
    } else {
      setEditingRuleId(null);
      setRuleName('');
      setRuleActions([]);
    }
    setShowBuilder(true);
  };

  // Close rule builder
  const handleCloseBuilder = () => {
    setShowBuilder(false);
    setEditingRuleId(null);
    setRuleName('');
    setRuleActions([]);
  };

  // Save rule (Create or Update)
  const handleSaveRule = async (e) => {
    e.preventDefault();
    if (!ruleName.trim()) {
      alert('Please provide a name for the workflow rule.');
      return;
    }

    try {
      const payload = {
        name: ruleName,
        trigger: 'conversation_ended',
        actions: ruleActions
      };

      if (editingRuleId) {
        await api.patch(`/api/workflows/${editingRuleId}`, payload);
      } else {
        await api.post('/api/workflows', payload);
      }

      handleCloseBuilder();
      fetchRules();
    } catch (err) {
      alert(`Error saving rule: ${err.response?.data?.message || err.message}`);
    }
  };

  // Delete a rule
  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this workflow rule?')) return;

    try {
      await api.delete(`/api/workflows/${ruleId}`);
      fetchRules();
    } catch (err) {
      alert(`Error deleting rule: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
              Automation Workflows
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Configure event-triggered workflows, post-conversation AI summarization, and automated CRM updates.
            </p>
          </div>

          {!showBuilder && activeTab === 'rules' && (
            <button
              onClick={() => handleOpenBuilder()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-sm transition shrink-0"
            >
              + Create Rule
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-800/80 gap-6">
          <button
            onClick={() => { setActiveTab('rules'); handleCloseBuilder(); }}
            className={`pb-2.5 font-medium text-xs transition relative ${
              activeTab === 'rules' ? 'text-indigo-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Rules Builder
            {activeTab === 'rules' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('logs'); handleCloseBuilder(); }}
            className={`pb-2.5 font-medium text-xs transition relative ${
              activeTab === 'logs' ? 'text-indigo-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Execution Logs
            {activeTab === 'logs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"></span>
            )}
          </button>
        </div>

        {/* Builder View */}
        {showBuilder ? (
          <form onSubmit={handleSaveRule} className="saas-panel p-6 space-y-6 max-w-3xl">
            <h3 className="text-base font-semibold font-heading text-zinc-100">
              {editingRuleId ? 'Edit Workflow Rule' : 'Build New Workflow Rule'}
            </h3>

            {/* Rule Name */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Rule Name
              </label>
              <input
                type="text"
                placeholder="e.g. Post-Conversation Auto-Summarize & CRM Update"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Trigger (Read Only) */}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Event Trigger
              </label>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-400 font-medium">
                Conversation Ended (Triggered after 5 minutes of inactivity or call termination)
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-4">
              <label className="block text-xs font-semibold font-heading text-zinc-300 uppercase tracking-wide">
                Action Steps Sequence
              </label>

              {ruleActions.map((action, index) => (
                <div key={index} className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-indigo-400">
                      Step {index + 1}: {action.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(index)}
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Remove Step
                    </button>
                  </div>

                  {/* Config form according to type */}
                  {action.type === 'generate_summary' && (
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Generates a concise 2-4 sentence summary and detects conversation outcome. Available for downstream templates using <code className="text-indigo-300">{"{{summary}}"}</code>.
                    </p>
                  )}

                  {action.type === 'update_lead_status' && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        New CRM Lead Status
                      </label>
                      <select
                        value={action.config.newStatus || 'qualified'}
                        onChange={(e) => handleActionConfigChange(index, 'newStatus', e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 transition"
                      >
                        {leadStatuses.map(status => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {action.type === 'send_whatsapp_followup' && (
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-zinc-400">
                        Message Template
                      </label>
                      <textarea
                        rows="3"
                        value={action.config.messageTemplate || ''}
                        onChange={(e) => handleActionConfigChange(index, 'messageTemplate', e.target.value)}
                        placeholder="Type message text here..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                      <span className="text-[11px] text-zinc-500 block italic">
                        Tip: Use <code>{"{{summary}}"}</code> to insert the generated summary.
                      </span>
                    </div>
                  )}

                  {action.type === 'send_email_followup' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={action.config.subject || ''}
                          onChange={(e) => handleActionConfigChange(index, 'subject', e.target.value)}
                          placeholder="e.g. Conversation Recap"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">
                          Email Body Text
                        </label>
                        <textarea
                          rows="4"
                          value={action.config.bodyTemplate || ''}
                          onChange={(e) => handleActionConfigChange(index, 'bodyTemplate', e.target.value)}
                          placeholder="Type email body here..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                        <span className="text-[11px] text-zinc-500 block italic">
                          Tip: Use <code>{"{{summary}}"}</code> to insert the generated summary.
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              ))}

              {/* Add Action Buttons */}
              <div className="pt-2">
                <span className="block text-xs font-medium text-zinc-400 mb-2">Add Step:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddAction('generate_summary')}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    + AI Summary Generation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('update_lead_status')}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    + CRM Status Update
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('send_whatsapp_followup')}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    + WhatsApp Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('send_email_followup')}
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                  >
                    + Email Follow-up
                  </button>
                </div>
              </div>

            </div>

            {/* Builder Actions Footer */}
            <div className="border-t border-zinc-800/80 pt-4 flex justify-end space-x-2.5">
              <button
                type="button"
                onClick={handleCloseBuilder}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
              >
                Save Workflow
              </button>
            </div>
          </form>
        ) : activeTab === 'rules' ? (
          /* Rules Index List */
          <div className="saas-panel p-5">
            {loadingRules ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl p-8">
                <p className="text-zinc-500 text-xs mb-4">No automation workflows configured yet.</p>
                <button
                  onClick={() => handleOpenBuilder()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                >
                  Create Your First Rule
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule._id} className="saas-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-semibold font-heading text-zinc-100">{rule.name}</h4>
                        <span className="saas-badge-indigo">
                          {rule.trigger.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                        <span className="text-[11px] text-zinc-400 font-medium">Steps:</span>
                        {rule.actions.length === 0 ? (
                          <span className="text-[11px] text-zinc-500 italic">No actions</span>
                        ) : (
                          rule.actions.map((act, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] bg-zinc-950 text-zinc-400 font-mono border border-zinc-800"
                            >
                              {idx + 1}. {act.type.replace(/_/g, ' ')}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Active Toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={() => handleToggleActive(rule._id, rule.isActive)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-zinc-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-500 after:border-zinc-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                        <span className="ml-2 text-xs font-medium text-zinc-400">
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </label>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenBuilder(rule)}
                        className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
                      >
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRule(rule._id)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Logs Tab */
          <div className="saas-panel p-5 flex flex-col min-h-0">
            {/* Filter Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase">
                Execution Logs
              </h3>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400">Status:</span>
                <select
                  value={logStatusFilter}
                  onChange={(e) => { setLogStatusFilter(e.target.value); setLogPage(1); }}
                  className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition"
                >
                  <option value="all">All</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            {loadingLogs ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl p-8">
                <p className="text-zinc-500 text-xs">No workflow execution logs found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Time</th>
                      <th className="pb-3">Workflow Rule</th>
                      <th className="pb-3">Action Type</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-xs">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3 pl-2 text-zinc-400 whitespace-nowrap">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-zinc-200">
                          {log.ruleId?.name || <span className="text-zinc-500 italic">Deleted Rule</span>}
                        </td>
                        <td className="py-3 text-zinc-300 whitespace-nowrap">
                          {log.actionType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={log.status === 'success' ? 'saas-badge-emerald' : 'saas-badge-rose'}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400 max-w-[250px] truncate pr-2" title={log.errorMessage}>
                          {log.errorMessage || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginate Logs */}
            {logTotalPages > 1 && (
              <div className="border-t border-zinc-800/80 pt-3 mt-3 flex items-center justify-between">
                <button
                  disabled={logPage === 1}
                  onClick={() => setLogPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-400">
                  Page {logPage} of {logTotalPages}
                </span>
                <button
                  disabled={logPage === logTotalPages}
                  onClick={() => setLogPage(p => Math.min(p + 1, logTotalPages))}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Workflows;
