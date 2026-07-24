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
      <div className="space-y-8 pb-12">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight animate-in fade-in">
            Communication Channels
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Connect external chat and voice networks to link streams with your RAG AI support agent
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500/20 border-t-brand-500 animate-spin"></div>
            <span className="text-sm text-slate-500">Loading channels status...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            
            {/* 1. WhatsApp Card */}
            <div className="glass rounded-2xl p-6 relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-900">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <svg className="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.63-1.023-5.101-2.885-6.963C16.588 1.963 14.122.94 11.99.94 6.552.94 2.131 5.361 2.128 10.8c-.001 1.724.453 3.41 1.315 4.888l-.991 3.62 3.702-.97.103.062zm10.518-6.195c-.29-.145-1.72-.848-1.986-.944-.267-.097-.461-.145-.656.145-.194.29-.752.944-.921 1.139-.168.194-.337.218-.627.073-2.316-1.157-3.418-1.72-4.802-4.088-.168-.29-.016-.448.129-.592.13-.13.29-.338.435-.507.145-.168.194-.29.29-.483.097-.193.048-.361-.024-.506-.073-.145-.656-1.579-.9-2.17-.236-.575-.478-.496-.656-.505l-.56-.009c-.194 0-.509.073-.775.361-.267.29-1.018.991-1.018 2.415 0 1.424 1.039 2.798 1.185 2.992.145.193 2.04 3.116 4.939 4.367.69.299 1.23.477 1.648.609.694.22 1.327.189 1.826.115.557-.083 1.72-.7 1.962-1.376.242-.677.242-1.256.169-1.376-.073-.12-.267-.194-.557-.339z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Meta WhatsApp Cloud API</h3>
                    <p className="text-xs text-slate-400">Deploy your AI assistant on your official WhatsApp Business number</p>
                  </div>
                </div>
                <div>
                  {waConfig?.isConnected ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center space-x-1.5 animate-pulse">
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>

              {subData && !subData.limits?.channelsAllowed?.includes('whatsapp') ? (
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-6 text-center space-y-4">
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    The WhatsApp channel is locked on your current **{subData.planName}** plan. Upgrade to the **Growth** or **Pro** plan to connect Meta's WhatsApp Cloud API.
                  </p>
                  <a
                    href="/billing"
                    className="inline-block px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Upgrade Plan
                  </a>
                </div>
              ) : waConfig?.isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px]">Phone Number ID</span>
                      <span className="text-slate-200 font-mono mt-1 block">{waConfig.phoneNumberId}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px]">Business Account ID</span>
                      <span className="text-slate-200 font-mono mt-1 block">{waConfig.businessAccountId}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase">Webhook Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Callback URL</span>
                        <div className="flex">
                          <input
                            type="text"
                            value={waConfig.webhookUrl}
                            readOnly
                            className="flex-grow bg-slate-950/60 border border-slate-900 border-r-0 rounded-l-xl px-3 py-2 text-xs text-slate-400 focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(waConfig.webhookUrl, 'wa-url')}
                            className="px-4 bg-slate-900 border border-slate-900 rounded-r-xl text-xs text-slate-300 hover:text-white"
                          >
                            {copiedWaUrl ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Verify Token</span>
                        <div className="flex">
                          <input
                            type="text"
                            value={waConfig.webhookVerifyToken}
                            readOnly
                            className="flex-grow bg-slate-950/60 border border-slate-900 border-r-0 rounded-l-xl px-3 py-2 text-xs text-slate-400 focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => copyToClipboard(waConfig.webhookVerifyToken, 'wa-token')}
                            className="px-4 bg-slate-900 border border-slate-900 rounded-r-xl text-xs text-slate-300 hover:text-white"
                          >
                            {copiedWaToken ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900 flex justify-end">
                    <button
                      onClick={handleDisconnectWa}
                      className="px-4 py-2 bg-rose-600/10 border border-rose-500/25 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl text-xs font-semibold transition"
                    >
                      Disconnect WhatsApp
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectWa} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Phone Number ID</label>
                      <input
                        type="text"
                        value={phoneNumberId}
                        onChange={(e) => setPhoneNumberId(e.target.value)}
                        placeholder="e.g. 1098485293847"
                        className="w-full bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">WhatsApp Account ID</label>
                      <input
                        type="text"
                        value={businessAccountId}
                        onChange={(e) => setBusinessAccountId(e.target.value)}
                        placeholder="e.g. 9845729384729"
                        className="w-full bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Meta Access Token</label>
                    <textarea
                      value={waAccessToken}
                      onChange={(e) => setWaAccessToken(e.target.value)}
                      placeholder="EAAGb3e2V... (Meta Cloud API Access Token)"
                      rows="2"
                      className="w-full bg-slate-900/40 border border-slate-900 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono resize-none"
                      required
                    />
                  </div>

                  {waError && <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl">{waError}</div>}
                  {waSuccess && <div className="p-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">{waSuccess}</div>}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={waSubmitting}
                      className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition"
                    >
                      {waSubmitting ? 'Verifying...' : 'Connect WhatsApp'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* 2. Twilio Voice Card */}
            <div className="glass rounded-2xl p-6 relative overflow-hidden space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-900">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Twilio Voice Channel</h3>
                    <p className="text-xs text-slate-400">Answer inbound telephone calls using OpenAI Realtime voice relays</p>
                  </div>
                </div>
                <div>
                  {voiceConfig?.isConnected ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 flex items-center space-x-1.5 animate-pulse">
                      <span>Connected</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-400">
                      Not Configured
                    </span>
                  )}
                </div>
              </div>

              {subData && !subData.limits?.channelsAllowed?.includes('phone') ? (
                <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-6 text-center space-y-4">
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    The Twilio Voice channel is locked on your current **{subData.planName}** plan. Upgrade to the **Pro** plan to connect Twilio voice integrations.
                  </p>
                  <a
                    href="/billing"
                    className="inline-block px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition"
                  >
                    Upgrade Plan
                  </a>
                </div>
              ) : voiceConfig?.isConnected ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px]">Twilio Account SID</span>
                      <span className="text-slate-200 font-mono mt-1 block">{voiceConfig.twilioAccountSid}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500 font-bold uppercase text-[9px]">Active Phone Number</span>
                      <span className="text-slate-200 font-mono mt-1 block">{voiceConfig.twilioPhoneNumber}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase">Twilio Webhook Configuration</h4>
                    <p className="text-xs text-slate-400">
                      Paste the following URL into your Twilio Console phone number configuration under "A Call Comes In" (Webhook, HTTP POST).
                    </p>
                    <div>
                      <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Voice Webhook URL</span>
                      <div className="flex">
                        <input
                          type="text"
                          value={voiceConfig.webhookUrl}
                          readOnly
                          className="flex-grow bg-slate-950/60 border border-slate-900 border-r-0 rounded-l-xl px-3 py-2 text-xs text-slate-400 focus:outline-none font-mono"
                        />
                        <button
                          onClick={() => copyToClipboard(voiceConfig.webhookUrl, 'voice-url')}
                          className="px-4 bg-slate-900 border border-slate-900 rounded-r-xl text-xs text-slate-300 hover:text-white"
                        >
                          {copiedVoiceUrl ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-900 flex justify-end">
                    <button
                      onClick={handleDisconnectVoice}
                      className="px-4 py-2 bg-rose-600/10 border border-rose-500/25 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl text-xs font-semibold transition"
                    >
                      Disconnect Voice Channel
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleConnectVoice} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Twilio Account SID</label>
                      <input
                        type="text"
                        value={twilioAccountSid}
                        onChange={(e) => setTwilioAccountSid(e.target.value)}
                        placeholder="e.g. AC67af83d..."
                        className="w-full bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Twilio Phone Number</label>
                      <input
                        type="text"
                        value={twilioPhoneNumber}
                        onChange={(e) => setTwilioPhoneNumber(e.target.value)}
                        placeholder="e.g. +15555551234"
                        className="w-full bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">Twilio Auth Token</label>
                    <input
                      type="password"
                      value={twilioAuthToken}
                      onChange={(e) => setTwilioAuthToken(e.target.value)}
                      placeholder="Enter Twilio Auth Token"
                      className="w-full bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono"
                      required
                    />
                  </div>

                  {voiceError && <div className="p-3 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/25 rounded-xl">{voiceError}</div>}
                  {voiceSuccess && <div className="p-3 text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-xl">{voiceSuccess}</div>}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={voiceSubmitting}
                      className="px-5 py-2 bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-semibold rounded-xl disabled:opacity-40 transition"
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
