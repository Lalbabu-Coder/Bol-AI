import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Selected Detail States
  const [activeCallId, setActiveCallId] = useState('');
  const [callData, setCallData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch calls index
  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/voice/calls?page=${page}&limit=10`);
      setCalls(res.data.data);
      setTotalPages(res.data.pagination.pages);
    } catch (err) {
      process.stderr.write(`Failed to load voice call logs: ${err.message}\n`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Call Details
  const fetchCallDetails = async (id) => {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/api/voice/calls/${id}`);
      setCallData(res.data.data.call);
      setMessages(res.data.data.messages);
    } catch (err) {
      process.stderr.write(`Failed to load call detail details: ${err.message}\n`);
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page]);

  const handleSelectCall = (id) => {
    setActiveCallId(id);
    fetchCallDetails(id);
  };

  // Duration parser: MM:SS
  const formatDuration = (seconds) => {
    if (!seconds && seconds !== 0) return '00:00';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 h-[calc(100vh-140px)] flex flex-col">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
            Phone Support Logs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit inbound call recordings, whisper STT transcripts, and AI voice responses
          </p>
        </div>

        {/* Split Grid Panel */}
        <div className="flex-grow flex gap-6 min-h-0">
          
          {/* Left panel: Paginated Call Log Table */}
          <div className="flex-grow glass rounded-2xl p-5 flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-1">
              Call Index
            </h3>

            {loading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
              </div>
            ) : calls.length === 0 ? (
              <div className="flex-grow flex items-center justify-center border border-dashed border-slate-900 rounded-xl p-8 text-center">
                <p className="text-slate-500 text-sm">No phone calls registered yet.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-x-auto min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-2">Date/Time</th>
                      <th className="pb-3">From Number</th>
                      <th className="pb-3">CRM Contact</th>
                      <th className="pb-3">Duration</th>
                      <th className="pb-3 text-right pr-2">Recording</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/30 text-xs">
                    {calls.map((c) => {
                      const isActive = c.id === activeCallId;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => handleSelectCall(c.id)}
                          className={`cursor-pointer transition ${
                            isActive
                              ? 'bg-brand-500/10 hover:bg-brand-500/10'
                              : 'hover:bg-slate-900/10'
                          }`}
                        >
                          <td className="py-4 pl-2 text-slate-200">
                            {new Date(c.createdAt).toLocaleString()}
                          </td>
                          <td className="py-4 text-slate-300 font-mono">
                            {c.contact?.phone || 'Unknown'}
                          </td>
                          <td className="py-4 text-slate-300">
                            {c.contact ? (
                              <span className="font-semibold text-slate-200">{c.contact.name}</span>
                            ) : (
                              <span className="italic text-slate-500">Unlinked</span>
                            )}
                          </td>
                          <td className="py-4 font-mono text-slate-400">
                            {formatDuration(c.callDuration)}
                          </td>
                          <td className="py-4 text-right pr-2">
                            {c.recordingUrl ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                                Ready
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-500 text-[10px]">
                                Unavailable
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
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

          {/* Right panel: Call details, recording playback, and STT transcript */}
          <div className="w-[450px] glass rounded-2xl p-5 flex flex-col min-h-0 shrink-0 hidden lg:flex">
            {activeCallId ? (
              loadingDetails ? (
                <div className="flex-grow flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
                  <span className="text-xs text-slate-500">Syncing Call logs...</span>
                </div>
              ) : (
                <div className="flex-grow flex flex-col min-h-0 space-y-6">
                  
                  {/* Call Header Metadata */}
                  <div className="border-b border-slate-900 pb-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Call Session Detail
                    </h3>
                    <div className="space-y-1 text-xs text-slate-300">
                      <p><strong>Caller:</strong> {callData?.contact?.name || 'Unknown'} ({callData?.contact?.phone || 'Not set'})</p>
                      <p><strong>Time:</strong> {new Date(callData?.createdAt).toLocaleString()}</p>
                      <p><strong>Duration:</strong> {formatDuration(callData?.callDuration)}</p>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Call Recording Player
                    </h3>
                    {callData?.recordingUrl ? (
                      <audio
                        src={callData.recordingUrl}
                        controls
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl"
                      />
                    ) : (
                      <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl text-center text-xs text-slate-500">
                        Recording file is unavailable or still processing on Twilio.
                      </div>
                    )}
                  </div>

                  {/* AI Summary and Outcome */}
                  {(callData?.summary || callData?.detectedOutcome) && (
                    <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">AI Call Summary</span>
                        {callData.detectedOutcome && (
                          <span className="px-2 py-0.5 rounded bg-brand-500/15 border border-brand-500/20 text-brand-300 font-mono text-[9px] uppercase">
                            {callData.detectedOutcome.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 leading-relaxed italic">
                        "{callData.summary}"
                      </p>
                    </div>
                  )}

                  {/* Transcript Bubbles */}
                  <div className="flex-grow flex flex-col min-h-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                      Voice Transcript
                    </h3>
                    
                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 max-h-[300px]">
                      {messages.map((msg, index) => {
                        const isUser = msg.role === 'user';
                        return (
                          <div key={index} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                              isUser
                                ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'
                                : 'bg-brand-950/40 border border-brand-500/15 text-brand-300 rounded-tl-none'
                            }`}>
                              <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                                {isUser ? 'Caller' : 'AI Voice Assistant'}
                              </span>
                              <p className="whitespace-pre-line">{msg.content}</p>
                            </div>
                          </div>
                        );
                      })}
                      {messages.length === 0 && (
                        <p className="text-xs text-slate-600 italic text-center py-8">
                          No dialog transcripts captured for this call.
                        </p>
                      )}
                    </div>
                  </div>

                </div>
              )
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6">
                <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.28-5.716-4.172-6.996-6.996l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <p className="text-slate-500 text-sm max-w-xs">
                  Select a voice call log from the table index on the left to review call transcripts and play recordings.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Calls;
