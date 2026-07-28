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
      <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col font-sans">
        
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5 shrink-0">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
            Conversation Logs
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Audit interactions between website visitors and your active RAG AI support assistant.
          </p>
        </div>

        {/* Split Container Panel */}
        <div className="flex-grow flex gap-6 min-h-0">
          
          {/* Left panel: Conversations List */}
          <div className="w-full md:w-80 saas-panel p-4 flex flex-col min-h-0">
            <h3 className="text-xs font-semibold font-heading text-zinc-300 tracking-wide uppercase mb-3 px-1">
              Recent Visitors
            </h3>

            {/* Channel Filters */}
            <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-1 rounded-lg mb-4 text-xs border border-zinc-800">
              <button
                onClick={() => setChannelFilter('all')}
                className={`py-1 rounded transition text-xs font-medium ${
                  channelFilter === 'all'
                    ? 'bg-zinc-900 text-indigo-300 font-semibold border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setChannelFilter('web_chat')}
                className={`py-1 rounded transition text-xs font-medium ${
                  channelFilter === 'web_chat'
                    ? 'bg-zinc-900 text-indigo-300 font-semibold border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Web
              </button>
              <button
                onClick={() => setChannelFilter('whatsapp')}
                className={`py-1 rounded transition text-xs font-medium ${
                  channelFilter === 'whatsapp'
                    ? 'bg-zinc-900 text-indigo-300 font-semibold border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                WA
              </button>
              <button
                onClick={() => setChannelFilter('email')}
                className={`py-1 rounded transition text-xs font-medium ${
                  channelFilter === 'email'
                    ? 'bg-zinc-900 text-sky-300 font-semibold border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Email
              </button>
            </div>

            {loading ? (
              <div className="flex-grow flex items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex-grow flex items-center justify-center border border-dashed border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-zinc-500 text-xs">No customer chats logged yet.</p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-2 pr-1">
                {filteredConversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isActive
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 font-medium'
                          : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center space-x-1.5 truncate max-w-[140px]">
                          <span className="text-xs font-medium text-zinc-200 truncate">
                            {conv.contact && conv.contact.name !== 'Unknown' 
                              ? conv.contact.name 
                              : `Anonymous ${conv.visitorId.slice(0, 8)}`}
                          </span>
                          <span className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded ${
                            conv.channel === 'whatsapp' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : conv.channel === 'email'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : conv.channel === 'phone'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {conv.channel === 'whatsapp' ? 'WA' : conv.channel === 'email' ? 'EMAIL' : conv.channel === 'phone' ? 'PHONE' : 'WEB'}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                          {formatTimeElapsed(conv.updatedAt)}
                        </span>
                      </div>
                      
                      <p className="text-xs text-zinc-400 truncate max-w-full italic">
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
          <div className="flex-grow saas-panel p-5 flex flex-col min-h-0 hidden md:flex">
            {activeConvId ? (
              <>
                {/* Selected Header */}
                <div className="border-b border-zinc-800/80 pb-4 mb-4 flex justify-between items-center">
                  <div>
                    {(() => {
                      const activeConv = conversations.find(c => c.id === activeConvId);
                      const contact = activeConv?.contact;
                      const hasRealName = contact && contact.name !== 'Unknown';
                      return (
                        <>
                          <h4 className="text-sm font-semibold font-heading text-zinc-100">
                            Audit: {hasRealName ? contact.name : `Anonymous ${activeConv?.visitorId?.slice(0, 8)}`}
                          </h4>
                          <div className="flex items-center space-x-2.5 mt-1 text-[11px] text-zinc-400">
                            {contact?.email && <span>{contact.email}</span>}
                            {contact?.phone && <span>({contact.phone})</span>}
                            {contact && (
                              <Link to={`/contacts?id=${contact.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
                                View CRM Profile →
                              </Link>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <span className="saas-badge-emerald">
                    {conversations.find(c => c.id === activeConvId)?.status || 'Active'}
                  </span>
                </div>

                {/* AI Summary and Outcome */}
                {(() => {
                  const activeConv = conversations.find(c => c.id === activeConvId);
                  if (activeConv && (activeConv.summary || activeConv.detectedOutcome)) {
                    return (
                      <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 mb-4 space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-zinc-400 uppercase tracking-wide text-[10px]">AI Conversation Summary</span>
                          {activeConv.detectedOutcome && (
                            <span className="saas-badge-indigo uppercase">
                              {activeConv.detectedOutcome.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-300 leading-relaxed italic">
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
                    <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                  </div>
                ) : (
                  <div className="flex-grow overflow-y-auto space-y-3.5 pr-1">
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div key={msg._id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-xl px-4 py-2.5 text-xs leading-relaxed ${
                            isUser
                              ? 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-tr-none'
                              : 'bg-indigo-950/40 border border-indigo-500/20 text-indigo-200 rounded-tl-none'
                          }`}>
                            <div className="flex justify-between items-center mb-1 space-x-4">
                              <span className="text-[10px] uppercase font-semibold text-zinc-400">
                                {isUser ? 'Customer' : 'AI Assistant'}
                              </span>
                              <span className="text-[10px] text-zinc-400">
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
                <svg className="w-10 h-10 text-zinc-600 mb-3" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
                <p className="text-zinc-400 text-xs max-w-xs">
                  Select a visitor conversation session from the left sidebar to audit chat messages and details.
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
