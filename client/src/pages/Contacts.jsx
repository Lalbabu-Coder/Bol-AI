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
    switch (status) {
      case 'new':
        return <span className="saas-badge-indigo">New</span>;
      case 'contacted':
        return <span className="saas-badge-amber">Contacted</span>;
      case 'qualified':
        return <span className="saas-badge-emerald">Qualified</span>;
      case 'converted':
        return <span className="saas-badge-indigo">Converted</span>;
      case 'lost':
        return <span className="saas-badge-rose">Lost</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">{status}</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col font-sans">
        
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5 shrink-0">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
            CRM Contacts & Leads
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Manage captured customer leads, view conversation links, and log manual notes.
          </p>
        </div>

        {/* Split Grid Panel */}
        <div className="flex-grow flex gap-6 min-h-0">
          
          {/* Left panel: Paginated List Table */}
          <div className="flex-grow saas-panel p-5 flex flex-col min-h-0">
            
            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <form onSubmit={handleSearchSubmit} className="flex-grow flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, or phone..."
                  className="flex-grow bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition"
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
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition"
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
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex-grow flex items-center justify-center border border-dashed border-zinc-800 rounded-xl p-8 text-center">
                <p className="text-zinc-500 text-xs">No contacts matching search criteria found.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-x-auto min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Client Name</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Phone</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Source</th>
                      <th className="pb-3 text-right pr-2">Last Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-xs">
                    {contacts.map((c) => {
                      const isActive = c._id === activeContactId;
                      return (
                        <tr
                          key={c._id}
                          onClick={() => handleSelectContact(c._id)}
                          className={`cursor-pointer transition ${
                            isActive
                              ? 'bg-indigo-500/10 hover:bg-indigo-500/10'
                              : 'hover:bg-zinc-900/40'
                          }`}
                        >
                          <td className="py-3 pl-2 font-medium text-zinc-200">
                            {c.name || <span className="italic text-zinc-500">Unknown</span>}
                          </td>
                          <td className="py-3 text-zinc-300">
                            {c.email || <span className="italic text-zinc-500">Unknown</span>}
                          </td>
                          <td className="py-3 text-zinc-300">
                            {c.phone || <span className="italic text-zinc-500">Unknown</span>}
                          </td>
                          <td className="py-3">{getStatusBadge(c.leadStatus)}</td>
                          <td className="py-3">
                            <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                              {c.source}
                            </span>
                          </td>
                          <td className="py-3 text-right pr-2 text-zinc-400">
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
              <div className="border-t border-zinc-800/80 pt-3 mt-3 flex items-center justify-between">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <span className="text-xs text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            )}

          </div>

          {/* Right panel: Profile detail editing drawer */}
          <div className="w-96 saas-panel p-5 flex flex-col min-h-0 shrink-0 hidden lg:flex">
            {activeContactId ? (
              loadingDetails ? (
                <div className="flex-grow flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                  <span className="text-xs text-zinc-400">Syncing CRM Profile...</span>
                </div>
              ) : (
                <div className="flex-grow flex flex-col min-h-0 space-y-5 overflow-y-auto pr-1">
                  
                  {/* General Profile fields */}
                  <div>
                    <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase mb-3">
                      Client Profile
                    </h3>
                    <form onSubmit={handleSaveContactForm} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                          required
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            placeholder="Not set"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Phone</label>
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="Not set"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500 transition"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-1">Lead Status</label>
                          <select
                            value={editStatus}
                            onChange={(e) => setEditStatus(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 transition"
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
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                          >
                            {savingForm ? 'Saving...' : 'Save Profile'}
                          </button>
                        </div>
                      </div>

                      {/* Tag Input */}
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tags</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {editTags.map((tag) => (
                            <span key={tag} className="saas-badge-indigo flex items-center space-x-1">
                              <span>{tag}</span>
                              <button type="button" onClick={() => handleRemoveTag(tag)} className="hover:text-rose-400 font-bold ml-1">×</button>
                            </span>
                          ))}
                          {editTags.length === 0 && <span className="text-[11px] text-zinc-500 italic">No tags.</span>}
                        </div>
                        <input
                          type="text"
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          placeholder="Type tag and press Enter"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>

                      {formSuccess && (
                        <p className="text-xs text-emerald-400 font-medium">{formSuccess}</p>
                      )}
                    </form>
                  </div>

                  {/* Linked Conversations */}
                  <div className="border-t border-zinc-800/80 pt-4">
                    <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase mb-3">
                      Dialogue Logs
                    </h3>
                    {conversations.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No conversations linked.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {conversations.map((conv) => (
                          <Link
                            key={conv._id}
                            to={`/conversations?id=${conv._id}`}
                            className="flex justify-between items-center p-2 rounded-lg bg-zinc-950/60 hover:bg-zinc-900/60 border border-zinc-800/80 text-xs transition text-zinc-300 hover:text-white"
                          >
                            <span>Chat session ({new Date(conv.updatedAt).toLocaleDateString()})</span>
                            <span className="text-indigo-400 hover:underline">Audit Thread →</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Note Section */}
                  <div className="border-t border-zinc-800/80 pt-4 flex-grow flex flex-col min-h-[220px]">
                    <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase mb-3">
                      Customer Notes
                    </h3>

                    {/* Note submit form */}
                    <form onSubmit={handleAddNote} className="space-y-2 mb-3">
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Log meeting minutes or client notes..."
                        rows="2"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none transition"
                        required
                      />
                      <button
                        type="submit"
                        disabled={savingNote || !noteInput.trim()}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-sm"
                      >
                        {savingNote ? 'Logging...' : 'Add Note'}
                      </button>
                    </form>

                    {/* Notes listing feed */}
                    <div className="flex-grow overflow-y-auto space-y-2.5 pr-1">
                      {notes.length === 0 ? (
                        <p className="text-xs text-zinc-500 italic">No notes logged yet.</p>
                      ) : (
                        notes.map((note) => (
                          <div key={note._id} className="p-3 bg-zinc-950/60 border border-zinc-800/80 rounded-lg space-y-1">
                            <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{note.content}</p>
                            <div className="flex justify-between items-center text-[10px] text-zinc-500">
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
                <svg className="w-10 h-10 text-zinc-600 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 01-7.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <p className="text-zinc-400 text-xs max-w-xs">
                  Select a contact row from the left table to review notes and edit profile details.
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
