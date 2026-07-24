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
      <div className="space-y-8 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
              Workflows Automation
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Configure automatic workflows like summaries, follow-ups, and statuses when conversations end.
            </p>
          </div>
          {!showBuilder && activeTab === 'rules' && (
            <button
              onClick={() => handleOpenBuilder()}
              className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-sm font-semibold transition"
            >
              + Create Rule
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-900 gap-6">
          <button
            onClick={() => { setActiveTab('rules'); handleCloseBuilder(); }}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'rules' ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Rules Builder
            {activeTab === 'rules' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('logs'); handleCloseBuilder(); }}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'logs' ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Execution Logs
            {activeTab === 'logs' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500"></span>
            )}
          </button>
        </div>

        {/* Builder View */}
        {showBuilder ? (
          <form onSubmit={handleSaveRule} className="glass rounded-2xl p-6 space-y-6 max-w-3xl animate-in fade-in">
            <h3 className="text-lg font-bold text-slate-200">
              {editingRuleId ? 'Edit Workflow Rule' : 'Build New Workflow Rule'}
            </h3>

            {/* Rule Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Rule Name
              </label>
              <input
                type="text"
                placeholder="e.g. Inbound Support Closed Automations"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Trigger (Read Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Event Trigger
              </label>
              <div className="bg-slate-950 border border-slate-900 rounded-xl px-4 py-3 text-sm text-slate-500 font-medium">
                Conversation Ended (Triggered after 5 minutes inactivity or call hang-up)
              </div>
            </div>

            {/* Actions List */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">
                Action Steps Sequence
              </label>

              {ruleActions.map((action, index) => (
                <div key={index} className="bg-slate-950/60 border border-slate-900 rounded-xl p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-brand-300">
                      Step {index + 1}: {action.type.replace(/_/g, ' ').toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAction(index)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Remove Step
                    </button>
                  </div>

                  {/* Config form according to type */}
                  {action.type === 'generate_summary' && (
                    <p className="text-xs text-slate-500">
                      Uses GPT-4o-Mini to create a 2-4 sentence summary and detect the outcome. The summary will be available for downstream template values in later actions using the <code>{"{{summary}}"}</code> placeholder.
                    </p>
                  )}

                  {action.type === 'update_lead_status' && (
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        New CRM Lead Status
                      </label>
                      <select
                        value={action.config.newStatus || 'qualified'}
                        onChange={(e) => handleActionConfigChange(index, 'newStatus', e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                      >
                        {leadStatuses.map(status => (
                          <option key={status} value={status}>{status.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {action.type === 'send_whatsapp_followup' && (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Message Template
                      </label>
                      <textarea
                        rows="3"
                        value={action.config.messageTemplate || ''}
                        onChange={(e) => handleActionConfigChange(index, 'messageTemplate', e.target.value)}
                        placeholder="Type message text here..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-[10px] text-slate-500 block italic">
                        Tip: Use <code>{"{{summary}}"}</code> to insert the generated summary.
                      </span>
                    </div>
                  )}

                  {action.type === 'send_email_followup' && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={action.config.subject || ''}
                          onChange={(e) => handleActionConfigChange(index, 'subject', e.target.value)}
                          placeholder="e.g. Conversation Recap"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Email Body Text
                        </label>
                        <textarea
                          rows="4"
                          value={action.config.bodyTemplate || ''}
                          onChange={(e) => handleActionConfigChange(index, 'bodyTemplate', e.target.value)}
                          placeholder="Type email body here..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                        <span className="text-[10px] text-slate-500 block italic">
                          Tip: Use <code>{"{{summary}}"}</code> to insert the generated summary.
                        </span>
                      </div>
                    </div>
                  )}

                </div>
              ))}

              {/* Add Action Buttons */}
              <div className="pt-2">
                <span className="block text-xs font-bold text-slate-500 mb-2">Add Step:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddAction('generate_summary')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    + AI Summary Generation
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('update_lead_status')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    + CRM Status Update
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('send_whatsapp_followup')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    + WhatsApp Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddAction('send_email_followup')}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-medium transition"
                  >
                    + Email Follow-up
                  </button>
                </div>
              </div>

            </div>

            {/* Builder Actions Footer */}
            <div className="border-t border-slate-900 pt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCloseBuilder}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-brand-50 hover:bg-white text-slate-950 rounded-xl text-xs font-bold transition"
              >
                Save Workflow
              </button>
            </div>
          </form>
        ) : activeTab === 'rules' ? (
          /* Rules Index List */
          <div className="glass rounded-2xl p-5">
            {loadingRules ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-900 rounded-xl p-8">
                <p className="text-slate-500 text-sm mb-4">No automation workflows configured yet.</p>
                <button
                  onClick={() => handleOpenBuilder()}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-brand-500 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Create Your First Rule
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule._id} className="bg-slate-950/40 border border-slate-900/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-bold text-slate-200">{rule.name}</h4>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-brand-500/10 border border-brand-500/20 text-brand-300">
                          {rule.trigger.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                        <span className="text-[10px] text-slate-500 font-medium">Steps sequence:</span>
                        {rule.actions.length === 0 ? (
                          <span className="text-[10px] text-slate-600 italic">No actions</span>
                        ) : (
                          rule.actions.map((act, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[8px] bg-slate-900 text-slate-400 font-semibold border border-slate-800"
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
                        <div className="w-9 h-5 bg-slate-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-600 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-500 peer-checked:after:bg-white"></div>
                        <span className="ml-2 text-xs font-medium text-slate-400">
                          {rule.isActive ? 'Active' : 'Paused'}
                        </span>
                      </label>

                      {/* Edit Button */}
                      <button
                        onClick={() => handleOpenBuilder(rule)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                      >
                        Edit
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteRule(rule._id)}
                        className="text-xs text-red-500 hover:text-red-400 font-semibold"
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
          <div className="glass rounded-2xl p-5 flex flex-col min-h-0">
            {/* Filter Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">
                Execution Logs Log
              </h3>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Status:</span>
                <select
                  value={logStatusFilter}
                  onChange={(e) => { setLogStatusFilter(e.target.value); setLogPage(1); }}
                  className="bg-slate-950 border border-slate-900 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
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
                <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-900 rounded-xl p-8">
                <p className="text-slate-500 text-sm">No workflow execution logs found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Time</th>
                      <th className="pb-3">Workflow Rule</th>
                      <th className="pb-3">Action Type</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 pr-2">Error Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 text-xs">
                    {logs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-900/10">
                        <td className="py-3 pl-2 text-slate-400 whitespace-nowrap">
                          {new Date(log.executedAt).toLocaleString()}
                        </td>
                        <td className="py-3 text-slate-200">
                          {log.ruleId?.name || <span className="text-slate-600 italic">Deleted Rule</span>}
                        </td>
                        <td className="py-3 text-slate-300 whitespace-nowrap">
                          {log.actionType.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            log.status === 'success'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : 'bg-red-500/10 border-red-500/20 text-red-400'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 max-w-[250px] truncate pr-2" title={log.errorMessage}>
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
              <div className="border-t border-slate-900/60 pt-4 mt-4 flex items-center justify-between">
                <button
                  disabled={logPage === 1}
                  onClick={() => setLogPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-brand-500 text-slate-300 rounded-xl text-xs disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {logPage} of {logTotalPages}
                </span>
                <button
                  disabled={logPage === logTotalPages}
                  onClick={() => setLogPage(p => Math.min(p + 1, logTotalPages))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-brand-500 text-slate-300 rounded-xl text-xs disabled:opacity-40 transition"
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
