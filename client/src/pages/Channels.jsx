import React, { useState, useEffect } from 'react';
import api from '../api/axios.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';

export const Channels = () => {
  const [waConfig, setWaConfig] = useState(null);
  const [voiceConfig, setVoiceConfig] = useState(null);
  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);

  // WhatsApp Form Inputs
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [waAccessToken, setWaAccessToken] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  
  // Twilio Form Inputs
  const [twilioAccountSid, setTwilioAccountSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioPhoneNumber, setTwilioPhoneNumber] = useState('');

  // Status indicators
  const [waSubmitting, setWaSubmitting] = useState(false);
  const [waError, setWaError] = useState('');
  const [waSuccess, setWaSuccess] = useState('');

  const [voiceSubmitting, setVoiceSubmitting] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [voiceSuccess, setVoiceSuccess] = useState('');

  const [copiedWaUrl, setCopiedWaUrl] = useState(false);
  const [copiedWaToken, setCopiedWaToken] = useState(false);
  const [copiedVoiceUrl, setCopiedVoiceUrl] = useState(false);

  // Fetch current configs status
  const fetchConfigs = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [waRes, voiceRes, subRes] = await Promise.all([
        api.get('/api/whatsapp/config'),
        api.get('/api/voice/config'),
        api.get('/api/billing/subscription')
      ]);

      setWaConfig(waRes.data.data);
      if (waRes.data.data.isConnected) {
        setPhoneNumberId(waRes.data.data.phoneNumberId);
        setBusinessAccountId(waRes.data.data.businessAccountId);
      }

      setVoiceConfig(voiceRes.data.data);
      if (voiceRes.data.data.isConnected) {
        setTwilioAccountSid(voiceRes.data.data.twilioAccountSid);
        setTwilioPhoneNumber(voiceRes.data.data.twilioPhoneNumber);
      }

      setSubData(subRes.data.data);
    } catch (err) {
      process.stderr.write(`Failed to load channel configurations: ${err.message}\n`);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs(true);
  }, []);

  // Connect WhatsApp API
  const handleConnectWa = async (e) => {
    e.preventDefault();
    setWaSubmitting(true);
    setWaError('');
    setWaSuccess('');

    try {
      const res = await api.post('/api/whatsapp/connect', {
        phoneNumberId,
        accessToken: waAccessToken,
        businessAccountId
      });
      setWaConfig(res.data.data);
      setWaSuccess('WhatsApp Business API connected successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to connect. Verify Meta credentials.';
      setWaError(msg);
    } finally {
      setWaSubmitting(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnectWa = async () => {
    if (!confirm('Disconnect WhatsApp channel?')) return;
    setLoading(true);
    try {
      await api.post('/api/whatsapp/disconnect');
      setWaConfig(prev => ({ ...prev, isConnected: false }));
      setWaAccessToken('');
    } catch (err) {
      alert('Failed to disconnect WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  // Connect Twilio API
  const handleConnectVoice = async (e) => {
    e.preventDefault();
    setVoiceSubmitting(true);
    setVoiceError('');
    setVoiceSuccess('');

    try {
      const res = await api.post('/api/voice/connect', {
        twilioAccountSid,
        twilioAuthToken,
        twilioPhoneNumber
      });
      setVoiceConfig(res.data.data);
      setVoiceSuccess('Twilio Voice connected successfully!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to connect. Verify Twilio SID/Token.';
      setVoiceError(msg);
    } finally {
      setVoiceSubmitting(false);
    }
  };

  // Disconnect Twilio
  const handleDisconnectVoice = async () => {
    if (!confirm('Disconnect Twilio Voice channel?')) return;
    setLoading(true);
    try {
      await api.post('/api/voice/disconnect');
      setVoiceConfig(prev => ({ ...prev, isConnected: false }));
      setTwilioAuthToken('');
    } catch (err) {
      alert('Failed to disconnect Twilio Voice.');
    } finally {
      setLoading(false);
    }
  };

  // Clipboard copies
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'wa-url') {
      setCopiedWaUrl(true);
      setTimeout(() => setCopiedWaUrl(false), 2000);
    } else if (type === 'wa-token') {
      setCopiedWaToken(true);
      setTimeout(() => setCopiedWaToken(false), 2000);
    } else if (type === 'voice-url') {
      setCopiedVoiceUrl(true);
      setTimeout(() => setCopiedVoiceUrl(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12 font-sans">
        
        {/* Header */}
        <div className="border-b border-zinc-800/80 pb-5">
          <h1 className="text-2xl font-bold font-heading text-zinc-100 tracking-tight">
            Communication Channels
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Connect external messaging and voice platforms to link multi-tenant streams with your RAG AI assistant.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
            <span className="text-xs text-zinc-500">Loading channel configurations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            
            {/* 1. WhatsApp Card */}
            <div className="saas-panel p-6 relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <svg className="w-5 h-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.885-6.963C16.588 1.963 14.122.94 11.99.94 6.552.94 2.131 5.361 2.128 10.8c-.001 1.724.453 3.41 1.315 4.888l-.991 3.62 3.702-.97.103.062zm10.518-6.195c-.29-.145-1.72-.848-1.986-.944-.267-.097-.461-.145-.656.145-.194.29-.752.944-.921 1.139-.168.194-.337.218-.627.073-2.316-1.157-3.418-1.72-4.802-4.088-.168-.29-.016-.448.129-.592.13-.13.29-.338.435-.507.145-.168.194-.29.29-.483.097-.193.048-.361-.024-.506-.073-.145-.656-1.579-.9-2.17-.236-.575-.478-.496-.656-.505l-.56-.009c-.194 0-.509.073-.775.361-.267.29-1.018.991-1.018 2.415 0 1.424 1.039 2.798 1.185 2.992.145.193 2.04 3.116 4.939 4.367.69.299 1.23.477 1.648.609.694.22 1.327.189 1.826.115.557-.083 1.72-.7 1.962-1.376.242-.677.242-1.256.169-1.376-.073-.12-.267-.194-.557-.339z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold font-heading text-zinc-100">Meta WhatsApp Cloud API</h3>
                    <p className="text-xs text-zinc-400">Deploy your AI assistant on your official WhatsApp Business number</p>
                  </div>
                </div>
                <div>
                  {waConfig?.isConnected ? (
                    <span className="saas-badge-emerald">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>

              {subData && !subData.limits?.channelsAllowed?.includes('whatsapp') ? (
                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold font-heading text-zinc-200">WhatsApp Channel Locked</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      WhatsApp integration is available on the Growth and Pro plans. Upgrade your subscription to connect Meta Cloud API.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="/billing"
                      className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                    >
                      Upgrade Plan →
                    </a>
                  </div>
                </div>
              ) : waConfig?.isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-zinc-400 font-medium text-[11px]">Phone Number ID</span>
                      <span className="text-zinc-200 font-mono mt-1 block">{waConfig.phoneNumberId}</span>
                    </div>
                    <div>
                      <span className="block text-zinc-400 font-medium text-[11px]">Business Account ID</span>
                      <span className="text-zinc-200 font-mono mt-1 block">{waConfig.businessAccountId}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Webhook Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[11px] text-zinc-400 mb-1">Callback URL</span>
                        <div className="flex">
                          <input
                            type="text"
                            value={waConfig.webhookUrl}
                            readOnly
                            className="flex-grow bg-zinc-950 border border-zinc-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(waConfig.webhookUrl, 'wa-url')}
                            className="px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-r-lg text-xs text-zinc-300 transition"
                          >
                            {copiedWaUrl ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[11px] text-zinc-400 mb-1">Verify Token</span>
                        <div className="flex">
                          <input
                            type="text"
                            value={waConfig.webhookVerifyToken}
                            readOnly
                            className="flex-grow bg-zinc-950 border border-zinc-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(waConfig.webhookVerifyToken, 'wa-token')}
                            className="px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-r-lg text-xs text-zinc-300 transition"
                          >
                            {copiedWaToken ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
                    <button
                      onClick={handleDisconnectWa}
                      className="px-3.5 py-1.5 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium transition"
                    >
                      Disconnect WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectWa} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Phone Number ID</label>
                      <input
                        type="text"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        placeholder="1098485293847"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">WhatsApp Account ID</label>
                      <input
                        type="text"
                        value={businessAccountId}
                        onChange={(e) => setBusinessAccountId(e.target.value)}
                        placeholder="9845729384729"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Meta Access Token</label>
                    <textarea
                      value={waAccessToken}
                      onChange={(e) => setWaAccessToken(e.target.value)}
                      placeholder="EAAGb3e2V... (Meta Cloud API Token)"
                      rows="2"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono resize-none transition"
                      required
                    />
                  </div>

                  {waError && <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">{waError}</div>}
                  {waSuccess && <div className="p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">{waSuccess}</div>}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={waSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition shadow-sm"
                    >
                      {waSubmitting ? 'Verifying...' : 'Connect WhatsApp'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 2. Twilio Voice Card */}
            <div className="saas-panel p-6 relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold font-heading text-zinc-100">Twilio Voice Channel</h3>
                    <p className="text-xs text-zinc-400">Answer inbound phone calls using OpenAI Realtime voice relays</p>
                  </div>
                </div>
                <div>
                  {voiceConfig?.isConnected ? (
                    <span className="saas-badge-indigo">
                      Connected
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-800 text-zinc-400">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>

              {subData && !subData.limits?.channelsAllowed?.includes('phone') ? (
                <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-6 text-center space-y-3 relative overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold font-heading text-zinc-200">Twilio Voice Locked</h4>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Voice call integration is available on the Pro plan. Upgrade your workspace to receive real-time phone calls.
                    </p>
                  </div>
                  <div className="pt-2">
                    <a
                      href="/billing"
                      className="inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition shadow-sm"
                    >
                      Upgrade Plan →
                    </a>
                  </div>
                </div>
              ) : voiceConfig?.isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-zinc-400 font-medium text-[11px]">Twilio Account SID</span>
                      <span className="text-zinc-200 font-mono mt-1 block">{voiceConfig.twilioAccountSid}</span>
                    </div>
                    <div>
                      <span className="block text-zinc-400 font-medium text-[11px]">Active Phone Number</span>
                      <span className="text-zinc-200 font-mono mt-1 block">{voiceConfig.twilioPhoneNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wide">Twilio Webhook Configuration</h4>
                    <p className="text-xs text-zinc-400">
                      Paste the following URL into your Twilio Console phone number configuration under "A Call Comes In" (HTTP POST).
                    </p>
                    <div>
                      <span className="block text-[11px] text-zinc-400 mb-1">Voice Webhook URL</span>
                      <div className="flex">
                        <input
                          type="text"
                          value={voiceConfig.webhookUrl}
                          readOnly
                          className="flex-grow bg-zinc-950 border border-zinc-800 border-r-0 rounded-l-lg px-3 py-2 text-xs text-zinc-400 focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(voiceConfig.webhookUrl, 'voice-url')}
                          className="px-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-r-lg text-xs text-zinc-300 transition"
                        >
                          {copiedVoiceUrl ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-800/80 flex justify-end">
                    <button
                      onClick={handleDisconnectVoice}
                      className="px-3.5 py-1.5 bg-rose-950/40 border border-rose-800/60 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium transition"
                    >
                      Disconnect Voice Channel
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectVoice} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Twilio Account SID</label>
                      <input
                        type="text"
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        placeholder="AC67af83d..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">Twilio Phone Number</label>
                      <input
                        type="text"
                        value={twilioPhoneNumber}
                        onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                        placeholder="+15555551234"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Twilio Auth Token</label>
                    <input
                      type="password"
                      value={twilioAuthToken}
                      onChange={(e) => setTwilioAuthToken(e.target.value)}
                      placeholder="Enter Twilio Auth Token"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-mono transition"
                      required
                    />
                  </div>

                  {voiceError && <div className="p-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-lg">{voiceError}</div>}
                  {voiceSuccess && <div className="p-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">{voiceSuccess}</div>}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={voiceSubmitting}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition shadow-sm"
                    >
                      {voiceSubmitting ? 'Verifying...' : 'Connect Twilio'}
                    </button>
                  </div>
                </form>
              )}
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export default Channels;
