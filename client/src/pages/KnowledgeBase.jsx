import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';
import { useAuth } from '../hooks/useAuth.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const KnowledgeBase = () => {
  const { company } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  
  // Search query states
  const [query, setQuery] = useState('');
  const [querying, setQuerying] = useState(false);
  const [queryResults, setQueryResults] = useState([]);
  const [queryError, setQueryError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Drag-and-drop states
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch document index list
  const fetchDocuments = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/api/knowledge-base');
      setDocuments(response.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load knowledge base: ${err.message}\n`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Poll for document status updating if any document is not finalized (pending/processing)
  useEffect(() => {
    fetchDocuments(true);
  }, []);

  useEffect(() => {
    const hasUnfinishedDocs = documents.some(
      (doc) => doc.status === 'pending' || doc.status === 'processing'
    );

    if (!hasUnfinishedDocs) return;

    const interval = setInterval(() => {
      fetchDocuments(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [documents]);

  // Handle Drag Events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop Event
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setUploadError('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  // Handle manual input click
  const handleFileChange = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setUploadError('');
      await uploadFile(e.target.files[0]);
    }
  };

  // Trigger input selection
  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // File Upload Logic
  const uploadFile = async (file) => {
    const allowedExtensions = ['pdf', 'docx'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      setUploadError('Unsupported file type. Only PDF (.pdf) and Word (.docx) documents are accepted.');
      return;
    }

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File exceeds size limit. Maximum allowed size is 20MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await api.post('/api/knowledge-base/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDocuments(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload file.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  // Cascade purge confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/knowledge-base/${deleteTarget}`);
      setDocuments(documents.filter(doc => doc._id !== deleteTarget));
    } catch (err) {
      alert('Failed to delete document from index.');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Semantic query lookup
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setQuerying(true);
    setQueryError('');
    setQueryResults([]);

    try {
      const res = await api.post('/api/knowledge-base/query', { question: query });
      
      if (res.data.message && res.data.data.length === 0) {
        setQueryError(res.data.message);
      } else {
        setQueryResults(res.data.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to complete semantic query.';
      setQueryError(msg);
    } finally {
      setQuerying(false);
    }
  };

  // Helper to render document status badges
  const getStatusBadge = (status) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="saas-badge-emerald">
            Indexed
          </span>
        );
      case 'pending':
      case 'processing':
        return (
          <span className="saas-badge-indigo animate-pulse">
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="saas-badge-rose">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Navigation Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
          <div>
            <div className="flex items-center space-x-2 text-xs text-zinc-400 mb-1.5">
              <Link to="/dashboard" className="hover:text-indigo-400 flex items-center gap-1 transition">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Dashboard</span>
              </Link>
              <span>/</span>
              <span className="text-zinc-200 font-medium">Knowledge Base</span>
            </div>
            <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
              Knowledge Base & Vector Store
            </h1>
            <p className="text-zinc-400 text-xs mt-1">
              Ingest company documentation and guidelines to power OpenAI RAG completion engine for <span className="text-zinc-200 font-medium">{company?.name || 'Workspace'}</span>.
            </p>
          </div>

          <Link
            to="/dashboard"
            className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-xs font-medium transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto shadow-sm"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* OpenAI Key Error Notice Banner if any document failed with 401 */}
        {documents.some(d => d.errorDetail && d.errorDetail.includes('401')) && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start space-x-3">
            <span className="text-base shrink-0">⚠️</span>
            <div className="space-y-1">
              <strong className="font-semibold text-zinc-100 block">OpenAI API Key Invalid (401 Unauthorized)</strong>
              <p className="text-amber-300/90 leading-relaxed">
                The OpenAI API Key in <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-200 border border-zinc-800">server/.env</code> is invalid or expired. Update <code className="bg-zinc-950 px-1.5 py-0.5 rounded font-mono text-[11px] text-amber-200 border border-zinc-800">OPENAI_API_KEY</code> with a valid key to complete document vectorization and embeddings.
              </p>
            </div>
          </div>
        )}

        {/* Grid: Uploader + Index List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Dropzone Uploader */}
          <div className="lg:col-span-1 saas-panel p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-base font-semibold font-heading text-zinc-100 mb-1">Ingest Document</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Vectorize files to train AI context. We accept .pdf & .docx files up to 20MB.
              </p>
              
              {/* Drag Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
                className={`w-full py-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${
                  dragActive 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx"
                  className="hidden"
                />
                
                {uploading ? (
                  <>
                    <div className="relative w-8 h-8 mb-3">
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20"></div>
                      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                    </div>
                    <span className="text-xs font-semibold text-zinc-300">Uploading File...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 text-zinc-400 mb-2 transition" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                    </svg>
                    <span className="text-xs font-semibold text-zinc-300">Drag & drop files here</span>
                    <span className="text-[11px] text-zinc-400 mt-0.5">or click to browse local files</span>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-400">
              Uploaded items are chunked and converted to 1536-dim vector embeddings.
            </div>
          </div>

          {/* Documents Index Table */}
          <div className="lg:col-span-2 saas-panel p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold font-heading text-zinc-100">Indexed Documents</h3>
                <button 
                  onClick={() => fetchDocuments(true)}
                  className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                  title="Refresh Documents"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                  </svg>
                </button>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                  <span className="text-xs text-zinc-400">Loading documents index...</span>
                </div>
              ) : documents.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-zinc-800/80 rounded-xl">
                  <p className="text-zinc-400 text-xs">No documents uploaded yet in this workspace.</p>
                </div>
              ) : (
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-zinc-800/80 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        <th className="pb-3 pl-2">Document Name</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Chunks</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-xs">
                      {documents.map((doc) => (
                        <tr key={doc._id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-3 pl-2 font-medium text-zinc-200">
                            <span className="block truncate max-w-[160px] sm:max-w-[220px]" title={doc.title}>
                              {doc.title}
                            </span>
                            {doc.status === 'failed' && doc.errorDetail && (
                              <span className="block text-[10px] text-rose-400 mt-0.5 truncate max-w-[220px]" title={doc.errorDetail}>
                                {doc.errorDetail}
                              </span>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="uppercase text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                              {doc.sourceType}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-400 font-mono text-xs">
                            {doc.status === 'indexed' ? doc.chunkCount : '-'}
                          </td>
                          <td className="py-3">
                            {getStatusBadge(doc.status)}
                          </td>
                          <td className="py-3 text-right pr-2">
                            <button
                              onClick={() => setDeleteTarget(doc._id)}
                              className="p-1 text-zinc-400 hover:text-rose-400 transition"
                              title="Delete file"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="text-[10px] text-zinc-400 mt-4">
              * Pending files are processed dynamically. Vector chunks are strictly isolated per workspace.
            </div>
          </div>
        </div>

        {/* Semantic Search Console */}
        <div className="saas-panel p-6 space-y-4">
          <div>
            <h3 className="text-base font-semibold font-heading text-zinc-100 mb-1">Test Semantic Query</h3>
            <p className="text-xs text-zinc-400">
              Execute manual vector similarity searches against your workspace knowledge base.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a query (e.g. 'What is our return policy?')"
              className="flex-grow bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
              required
            />
            <button
              type="submit"
              disabled={querying || documents.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs transition shadow-sm disabled:opacity-50 whitespace-nowrap"
            >
              {querying ? 'Searching...' : 'Submit Query'}
            </button>
          </form>

          {queryError && (
            <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-medium">
              {queryError}
            </div>
          )}

          {queryResults.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                Top Similarity Matches (K=5)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queryResults.map((match, idx) => (
                  <div key={match.chunkId || idx} className="saas-card p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="saas-badge-indigo">
                          Match: {(match.similarity * 100).toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-zinc-400 font-medium truncate max-w-[150px]" title={match.documentTitle}>
                          Doc: {match.documentTitle}
                        </span>
                      </div>
                      <p className="text-zinc-300 text-xs leading-relaxed italic">
                        "{match.content}"
                      </p>
                    </div>
                    <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-400 flex justify-between">
                      <span>Index: {match.chunkIndex}</span>
                      <span>Cosine Similarity</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-800 max-w-sm w-full p-6 rounded-2xl shadow-card space-y-5">
              <div>
                <h3 className="text-base font-semibold font-heading text-zinc-100">Purge Document?</h3>
                <p className="text-xs text-zinc-400 mt-1.5">
                  This action is permanent. All matching vector chunks and extracted content will be deleted.
                </p>
              </div>
              <div className="flex space-x-2.5 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                >
                  Purge Index
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KnowledgeBase;
