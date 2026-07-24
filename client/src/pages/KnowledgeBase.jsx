import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios.js';
import { useAuth } from '../hooks/useAuth.js';

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

  // Helper status badge styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'indexed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Indexed
          </span>
        );
      case 'processing':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
            Processing...
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
            Queued
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Knowledge Base Ingestion
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Scaffolding for vectorization of PDF/DOCX assets under the {company?.name} tenant
          </p>
        </div>
      </div>

      {/* Grid: Uploader + Index List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dropzone Uploader */}
        <div className="lg:col-span-1 glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-white mb-2">Ingest Document</h3>
            <p className="text-xs text-slate-400 mb-4">
              Vectorize files to train AI context. We accept .pdf & .docx up to 20MB.
            </p>
            
            {/* Drag Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={onButtonClick}
              className={`w-full py-12 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${
                dragActive 
                  ? 'border-brand-500 bg-brand-500/10' 
                  : 'border-slate-800 hover:border-brand-500/50 hover:bg-slate-900/10'
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
                  <div className="relative w-10 h-10 mb-4">
                    <div className="absolute inset-0 rounded-full border-2 border-brand-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 animate-spin"></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-300">Uploading File...</span>
                </>
              ) : (
                <>
                  <svg className="w-10 h-10 text-slate-400 mb-3 group-hover:text-brand-400 transition" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                  </svg>
                  <span className="text-sm font-semibold text-slate-300">Drag & drop files here</span>
                  <span className="text-xs text-slate-500 mt-1">or click to browse local files</span>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {uploadError}
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-900 text-[11px] text-slate-500">
            Uploaded items are chunked and converted to 1536-dim embeddings.
          </div>
        </div>

        {/* Documents Index Table */}
        <div className="lg:col-span-2 glass p-6 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Indexed Documents</h3>
              <button 
                onClick={() => fetchDocuments(true)}
                className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:border-brand-500 text-slate-400 hover:text-white"
                title="Refresh Documents"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
                <span className="text-sm text-slate-500">Loading Documents index...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="py-20 text-center border border-dashed border-slate-900 rounded-xl">
                <p className="text-slate-500 text-sm">No documents uploaded yet in this company workspace.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Document Name</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Chunks</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/40 text-sm">
                    {documents.map((doc) => (
                      <tr key={doc._id} className="hover:bg-slate-900/10">
                        <td className="py-3 pl-2 max-w-xs truncate font-medium text-slate-200" title={doc.title}>
                          {doc.title}
                        </td>
                        <td className="py-3">
                          <span className="uppercase text-[10px] tracking-wide font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                            {doc.sourceType}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400 font-mono text-xs">
                          {doc.status === 'indexed' ? doc.chunkCount : '-'}
                        </td>
                        <td className="py-3">
                          {getStatusBadge(doc.status)}
                          {doc.status === 'failed' && (
                            <div className="text-[10px] text-rose-400/80 mt-1 max-w-xs truncate" title={doc.errorDetail}>
                              {doc.errorDetail}
                            </div>
                          )}
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => setDeleteTarget(doc._id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete file"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

          <div className="text-[10px] text-slate-500 mt-4">
            * Pending files are indexed dynamically. Scoped strictly to your tenant identity.
          </div>
        </div>
      </div>

      {/* Semantic Search Console */}
      <div className="glass p-6 rounded-2xl">
        <h3 className="text-lg font-bold text-white mb-2">Test Semantic Query</h3>
        <p className="text-xs text-slate-400 mb-6">
          Input questions below to evaluate manual vector search calculations against indexed company files.
        </p>

        <form onSubmit={handleSearchSubmit} className="flex gap-3 mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a testing query (e.g. 'What is the pricing plan?')"
            className="flex-grow bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 text-sm"
            required
          />
          <button
            type="submit"
            disabled={querying || documents.length === 0}
            className="px-6 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-medium rounded-xl shadow-lg focus:outline-none disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {querying ? 'Searching...' : 'Submit Query'}
          </button>
        </form>

        {queryError && (
          <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
            {queryError}
          </div>
        )}

        {queryResults.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Top Similarity Matches (K=5)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {queryResults.map((match, idx) => (
                <div key={match.chunkId || idx} className="glass p-5 rounded-xl border border-slate-900 hover:border-brand-500/20 transition flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                        Match Score: {(match.similarity * 100).toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]" title={match.documentTitle}>
                        Doc: {match.documentTitle}
                      </span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed italic">
                      "{match.content}"
                    </p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-900/60 text-[10px] text-slate-500 flex justify-between">
                    <span>Index: {match.chunkIndex}</span>
                    <span>Algorithm: manual-cosine</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="glass max-w-sm w-full p-6 rounded-2xl shadow-2xl space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Purge Document?</h3>
              <p className="text-sm text-slate-400 mt-2">
                This action is permanent. All matching vector chunks and extracted text will be destroyed.
              </p>
            </div>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-medium transition"
              >
                Purge Index
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;
