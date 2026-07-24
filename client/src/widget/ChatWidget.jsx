import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export const ChatWidget = ({ companyId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showRatingPrompt, setShowRatingPrompt] = useState(false);
  const [isRated, setIsRated] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto scroll messages to the bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Start conversation session on first open
  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && !conversationId && companyId) {
      setLoading(true);
      setErrorMsg('');
      try {
        // Direct call using base axios since this is a public endpoint (no bearer token auth)
        const res = await axios.post('/api/chat/start', { companyId });
        setConversationId(res.data.data.conversationId);
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I am your AI assistant. How can I help you today?'
          }
        ]);
      } catch (err) {
        setErrorMsg('Failed to initialize support chat. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  // Post message to the conversation
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !conversationId) return;

    const userText = inputText;
    setInputText('');
    setErrorMsg('');

    // Append user message immediately
    const userMsg = { id: Date.now().toString(), role: 'user', content: userText };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const res = await axios.post('/api/chat/message', {
        conversationId,
        message: userText
      });

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: res.data.data.content
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errCode = err.response?.data?.code;
      const msg = err.response?.data?.message || 'Something went wrong, please try again.';
      
      if (errCode === 'CONVERSATION_CLOSED') {
        setShowRatingPrompt(true);
      }

      // Return a friendly widget error
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          role: 'assistant',
          content: `⚠️ ${msg}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Submit CSAT feedback
  const handleRate = async (rating) => {
    try {
      await axios.post(`/api/chat/${conversationId}/rate`, { rating });
      setIsRated(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Thank you for rating our session ${rating} ★!`
        }
      ]);
    } catch (err) {
      // fail silently
    } finally {
      setShowRatingPrompt(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Action Button */}
      <button
        onClick={handleToggle}
        className="w-14 h-14 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/20 text-white focus:outline-none transition transform hover:scale-105"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 h-[480px] glass rounded-2xl shadow-2xl border border-slate-900 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 bg-slate-900 border-b border-slate-900/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
              <div>
                <h4 className="text-sm font-bold text-slate-100">Workspace Support</h4>
                <span className="text-[10px] text-brand-400 font-medium">AI Chat Assistant Active</span>
              </div>
            </div>
            {conversationId && !showRatingPrompt && !isRated && (
              <button
                type="button"
                onClick={() => setShowRatingPrompt(true)}
                className="text-[10px] bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold px-2 py-1 rounded-lg transition"
              >
                End Chat
              </button>
            )}
          </div>

          {/* Messages Feed */}
          <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-slate-950/20">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isError = msg.content.startsWith('⚠️');
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-brand-600 text-white rounded-br-none'
                        : isError
                        ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-bl-none'
                        : 'bg-slate-900 text-slate-300 border border-slate-900/40 rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Loading / Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-900/40">
                  <div className="flex items-center space-x-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                {errorMsg}
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Rating or Form */}
          {showRatingPrompt ? (
            <div className="p-4 bg-slate-900 border-t border-slate-900 text-center space-y-3">
              <p className="text-xs font-bold text-slate-300">How would you rate your support session?</p>
              <div className="flex justify-center space-x-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleRate(num)}
                    className="text-amber-400 text-2xl hover:scale-125 transition transform duration-100 focus:outline-none"
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900/60 border-t border-slate-900 flex items-center space-x-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask a question..."
                className="flex-grow bg-slate-950/60 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10"
                required
                disabled={loading || !conversationId}
              />
              <button
                type="submit"
                disabled={loading || !inputText.trim() || !conversationId}
                className="p-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl disabled:opacity-40 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  );
};

export default ChatWidget;
