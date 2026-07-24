import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const Contacts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlContactId = searchParams.get('id');

  // List States
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Detail States
  const [activeContactId, setActiveContactId] = useState('');
  const [contactData, setContactData] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Editable Form fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editTags, setEditTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [savingForm, setSavingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');

  // Note States
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [notes, setNotes] = useState([]);

  // Linked Conversations
  const [conversations, setConversations] = useState([]);

  // Fetch Contacts Index
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search && { search }),
        ...(statusFilter && { leadStatus: statusFilter })
      });
      const res = await api.get(`/api/crm/contacts?${params.toString()}`);
      setContacts(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      process.stderr.write(`Failed to load CRM contacts: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Specific Contact Detail
  const fetchContactDetails = async (id) => {
    setLoadingDetails(true);
    setFormSuccess('');
    try {
      const res = await api.get(`/api/crm/contacts/${id}`);
      const { contact, conversations: convs, notes: noteLogs } = res.data.data;
      
      setContactData(contact);
      setEditName(contact.name);
      setEditEmail(contact.email || '');
      setEditPhone(contact.phone || '');
      setEditStatus(contact.leadStatus);
      setEditTags(contact.tags || []);
      
      setConversations(convs);
      setNotes(noteLogs);
    } catch (err) {
      process.stderr.write(`Failed to load contact details: ${err.message}\n`);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, statusFilter]);

  // Handle Search Form Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  // Auto-load details if contact ID present in URL query params
  useEffect(() => {
    if (urlContactId) {
      setActiveContactId(urlContactId);
      fetchContactDetails(urlContactId);
    }
  }, [urlContactId]);

  // Handle selection
  const handleSelectContact = (id) => {
    setSearchParams({ id });
  };

  // Save Contact General Form
  const handleSaveContactForm = async (e) => {
    e.preventDefault();
    setSavingForm(true);
    setFormSuccess('');
    try {
      const res = await api.patch(`/api/crm/contacts/${activeContactId}`, {
        name: editName,
        email: editEmail || null,
        phone: editPhone || null,
        leadStatus: editStatus,
        tags: editTags
      });
      setContactData(res.data.data);
      setFormSuccess('Profile details saved.');
      // Refresh listing preview details without reloading page
      setContacts(contacts.map(c => c._id === activeContactId ? { ...c, name: editName, email: editEmail, phone: editPhone, leadStatus: editStatus } : c));
    } catch (err) {
      alert('Failed to save profile modifications.');
    } finally {
      setSavingForm(false);
    }
  };

  // Add tag
  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (val && !editTags.includes(val)) {
        setEditTags([...editTags, val]);
      }
      setTagInput('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove) => {
    setEditTags(editTags.filter(t => t !== tagToRemove));
  };

  // Log manual note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteInput.trim()) return;

    setSavingNote(true);
    try {
      const res = await api.post(`/api/crm/contacts/${activeContactId}/notes`, {
        content: noteInput
      });
      setNotes([res.data.data, ...notes]);
      setNoteInput('');
    } catch (err) {
      alert('Failed to log note.');
    } finally {
      setSavingNote(false);
    }
  };

  // Badge layouts
  const getStatusBadge = (status) => {
    const styles = {
      new: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-400',
      contacted: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      qualified: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      converted: 'bg-violet-500/10 border-violet-500/25 text-violet-400',
      lost: 'bg-rose-500/10 border-rose-500/25 text-rose-400'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || ''}`}>
        {status}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 h-[calc(100vh-140px)] flex flex-col">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
            CRM Contacts
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage leads captured from AI support widgets and log manual client notes
          </p>
        </div>

        {/* Split Grid Panel */}
        <div className="flex-grow flex gap-6 min-h-0">
          
          {/* Left panel: Paginated List Table */}
          <div className="flex-grow glass rounded-2xl p-5 flex flex-col min-h-0">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <form onSubmit={handleSearchSubmit} className="flex-grow flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, or phone..."
                  className="flex-grow bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium"
                >
                  Search
                </button>
              </form>
              
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
              >
                <option value="">All Lead Statuses</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* List */}
            {loading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex-grow flex items-center justify-center border border-dashed border-slate-900 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">No contacts matching criteria found.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-x-auto min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Client Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Lead Status</th>
                      <th className="pb-3">Source</th>
                      <th className="pb-3 text-right pr-2">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 text-xs">
                    {contacts.map((c) => {
                      const isActive = c._id === activeContactId;
                      return (
                        <tr
                          key={c._id}
                          onClick={() => handleSelectContact(c._id)}
                          className={`cursor-pointer transition ${
                            isActive
                              ? 'bg-brand-500/10 hover:bg-brand-500/10'
                              : 'hover:bg-slate-900/10'
                          }`}
                        >
                          <td className="py-4 pl-2 font-semibold text-slate-200">
                            {c.name || <span className="italic text-slate-500">Unknown</span>}
                          </td>
                          <td className="py-4 text-slate-300">
                            {c.email || <span className="italic text-slate-600">Unknown</span>}
                          </td>
                          <td className="py-4 text-slate-300">
                            {c.phone || <span className="italic text-slate-600">Unknown</span>}
                          </td>
                          <td className="py-4">{getStatusBadge(c.leadStatus)}</td>
                          <td className="py-4">
                            <span className="uppercase text-[9px] tracking-wide font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                              {c.source}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2 text-slate-500">
                            {new Date(c.lastContactedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="border-t border-slate-900/60 pt-4 mt-4 flex items-center justify-between">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-brand-500 text-slate-300 rounded-xl text-xs disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-brand-500 text-slate-300 rounded-xl text-xs disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            )}

          </div>

          {/* Right panel: Profile detail editing drawer */}
          <div className="w-96 glass rounded-2xl p-5 flex flex-col min-h-0 shrink-0 hidden lg:flex">
            {activeContactId ? (
              loadingDetails ? (
                <div className="flex-grow flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
                  <span className="text-xs text-slate-500">Syncing CRM Profile...</span>
                </div>
              ) : (
                <div className="flex-grow flex flex-col min-h-0 space-y-6 overflow-y-auto pr-1">
                  
                  {/* General Profile fields */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                      Client Profile
                    </h3>
                    <form onSubmit={handleSaveContactForm} className="space-y-4">
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Not set"
                            className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Phone</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Not set"
                            className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Lead Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="converted">Converted</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <button
                            type="submit"
                            disabled={savingForm}
                            className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold border border-slate-800 transition"
                          >
                            {savingForm ? 'Saving...' : 'Save Profile'}
                          </button>
                        </div>
                      </div>

                      {/* Tag Input */}
                      <div>
                        <label className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Tags</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {editTags.map((tag) => (
                            <span key={tag} className="flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-brand-500/10 border border-brand-500/20 text-brand-300">
                              <span>{tag}</span>
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 font-bold">×</button>
                            </span>
                          ))}
                          {editTags.length === 0 && <span className="text-[10px] text-slate-600 italic">No tags.</span>}
                        </div>
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Type tag and press Space/Enter"
                          className="w-full bg-slate-950/40 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                        />
                      </div>

                      {formSuccess && (
                        <p className="text-[10px] text-emerald-400 font-medium">{formSuccess}</p>
                      )}
                    </form>
                  </div>

                  {/* Linked Conversations */}
                  <div className="border-t border-slate-900/60 pt-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Dialogue Logs
                    </h3>
                    {conversations.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No conversations linked.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {conversations.map((conv) => (
                          <Link
                            key={conv._id}
                            to={`/conversations?id=${conv._id}`}
                            className="flex justify-between items-center p-2 rounded-lg bg-slate-950/30 hover:bg-slate-900/30 border border-slate-900/50 text-[10px] transition text-slate-300 hover:text-white"
                          >
                            <span>Chat session ({new Date(conv.updatedAt).toLocaleDateString()})</span>
                            <span className="text-brand-400 hover:underline">Audit Thread →</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Note Section */}
                  <div className="border-t border-slate-900/60 pt-4 flex-grow flex flex-col min-h-[250px]">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Customer Notes
                    </h3>

                    {/* Note submit form */}
                    <form onSubmit={handleAddNote} className="space-y-2 mb-4">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Log meeting minutes or customer info..."
                        rows="2"
                        className="w-full bg-slate-950/40 border border-slate-900 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500 resize-none"
                        required
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !noteInput.trim()}
                        className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-40"
                      >
                        {savingNote ? 'Logging...' : 'Add Note'}
                      </button>
                    </form>

                    {/* Notes listing feed */}
                    <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                      {notes.length === 0 ? (
                        <p className="text-xs text-slate-600 italic">No notes logged yet.</p>
                      ) : (
                        notes.map((note) => (
                          <div key={note._id} className="p-3 bg-slate-950/20 border border-slate-900 rounded-xl space-y-1">
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{note.content}</p>
                            <div className="flex justify-between items-center text-[9px] text-slate-600 font-medium">
                              <span>By {note.authorUserId?.name || 'Agent'}</span>
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              )
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 01-7.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-slate-500 text-sm max-w-xs">
                  Select a contact row from the left listing grid to review notes and edit details.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Contacts;
