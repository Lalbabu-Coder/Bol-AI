import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const Conversations = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlConvId = searchParams.get('id');

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [channelFilter, setChannelFilter] = useState('all'); // all, web_chat, whatsapp

  // Fetch list of conversations
  const fetchConversations = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get('/api/chat/conversations');
      setConversations(res.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load chat history list: ${err.message}\n`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Fetch chronological messages for selected conversation
  const fetchMessages = async (convId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/api/chat/conversations/${convId}/messages`);
      setMessages(res.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load conversation messages: ${err.message}\n`);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchConversations(true);
  }, []);

  // Auto-load details if conversation ID present in URL query params
  useEffect(() => {
    if (urlConvId) {
      setActiveConvId(urlConvId);
      fetchMessages(urlConvId);
    }
  }, [urlConvId]);

  // Poll for updates in the conversations list (e.g. preview updates when new messages arrive)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Handle conversation click selection
  const handleSelectConversation = (convId) => {
    setActiveConvId(convId);
    fetchMessages(convId);
  };

  // Helper formatting for dynamic time elapsed
  const formatTimeElapsed = (dateString) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const filteredConversations = conversations.filter((conv) => {
    if (channelFilter === 'all') return true;
    return conv.channel === channelFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8 h-[calc(100vh-140px)] flex flex-col">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
            Conversation Logs
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Audit interactions between website visitors and your active RAG AI support agent
          </p>
        </div>

        {/* Split Container Panel */}
        <div className="flex-grow flex gap-6 min-h-0">
          
          {/* Left panel: Conversations List */}
          <div className="w-full md:w-80 glass rounded-2xl p-4 flex flex-col min-h-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">
              Recent Visitors
            </h3>

              {/* Channel Filters */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl mb-4 text-[10px] font-semibold border border-slate-900/60">
                <button
                  onClick={() => setChannelFilter('all')}
                  className={`py-1 rounded-lg transition ${
                    channelFilter === 'all'
                      ? 'bg-slate-900 text-brand-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setChannelFilter('web_chat')}
                  className={`py-1 rounded-lg transition ${
                    channelFilter === 'web_chat'
                      ? 'bg-slate-900 text-brand-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Web
                </button>
                <button
                  onClick={() => setChannelFilter('whatsapp')}
                  className={`py-1 rounded-lg transition ${
                    channelFilter === 'whatsapp'
                      ? 'bg-slate-900 text-brand-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  WhatsApp
                </button>
              </div>

              {loading ? (
                <div className="flex-grow flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex-grow flex items-center justify-center border border-dashed border-slate-900 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-xs">No customer chats logged yet.</p>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                  {filteredConversations.map((conv) => {
                    const isActive = conv.id === activeConvId;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-xl border transition ${
                          isActive
                            ? 'bg-brand-500/10 border-brand-500/30 text-brand-300'
                            : 'bg-slate-950/40 border-slate-900/60 text-slate-300 hover:bg-slate-900/40 hover:border-brand-500/10'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center space-x-1.5 truncate max-w-[140px]">
                            <span className="text-xs font-bold text-slate-200 truncate">
                              {conv.contact && conv.contact.name !== 'Unknown' 
                                ? conv.contact.name 
                                : `Anonymous ${conv.visitorId.slice(0, 8)}`}
                            </span>
                            <span className={`text-[8px] uppercase font-mono px-1 rounded ${
                              conv.channel === 'whatsapp' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {conv.channel === 'whatsapp' ? 'WA' : 'WEB'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {formatTimeElapsed(conv.updatedAt)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-slate-400 truncate max-w-full italic">
                          {conv.lastMessage 
                            ? `${conv.lastMessage.role === 'assistant' ? 'AI: ' : 'User: '}${conv.lastMessage.content}` 
                            : 'No messages yet'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

          {/* Right panel: Active Chat Messages Viewer */}
          <div className="flex-grow glass rounded-2xl p-5 flex flex-col min-h-0 hidden md:flex">
            {activeConvId ? (
              <>
                {/* Selected Header */}
                <div className="border-b border-slate-900 pb-4 mb-4 flex justify-between items-center">
                  <div>
                    {(() => {
                      const activeConv = conversations.find(c => c.id === activeConvId);
                      const contact = activeConv?.contact;
                      const hasRealName = contact && contact.name !== 'Unknown';
                      return (
                        <>
                          <h4 className="text-sm font-bold text-slate-200">
                            Audit: {hasRealName ? contact.name : `Anonymous ${activeConv?.visitorId?.slice(0, 8)}`}
                          </h4>
                          <div className="flex items-center space-x-2.5 mt-1 text-[10px] text-slate-400">
                            {contact?.email && <span>{contact.email}</span>}
                            {contact?.phone && <span>({contact.phone})</span>}
                            {contact && (
                              <Link to={`/contacts?id=${contact.id}`} className="text-brand-400 hover:underline font-semibold">
                                View CRM Profile →
                              </Link>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {conversations.find(c => c.id === activeConvId)?.status}
                  </span>
                </div>

                {/* AI Summary and Outcome */}
                {(() => {
                  const activeConv = conversations.find(c => c.id === activeConvId);
                  if (activeConv && (activeConv.summary || activeConv.detectedOutcome)) {
                    return (
                      <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl p-4 mb-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">AI Conversation Summary</span>
                          {activeConv.detectedOutcome && (
                            <span className="px-2 py-0.5 rounded bg-brand-500/15 border border-brand-500/20 text-brand-300 font-mono text-[9px] uppercase">
                              {activeConv.detectedOutcome.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 leading-relaxed italic">
                          "{activeConv.summary}"
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Audit Feed */}
                {loadingMessages ? (
                  <div className="flex-grow flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
                  </div>
                ) : (
                  <div className="flex-grow overflow-y-auto space-y-4 pr-1">
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={msg._id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none'
                              : 'bg-brand-950/40 border border-brand-500/15 text-brand-300 rounded-tl-none'
                          }`}>
                            <div className="flex justify-between items-center mb-1 space-x-4">
                              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                                {isUser ? 'Customer' : 'AI Support Agent'}
                              </span>
                              <span className="text-[9px] text-slate-600">
                                {new Date(msg.createdAt).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-line">{msg.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
                <svg className="w-12 h-12 text-slate-700 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <p className="text-slate-500 text-sm max-w-sm">
                  Select a visitor conversation session from the sidebar index to audit details and history logs.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
};

export default Conversations;
