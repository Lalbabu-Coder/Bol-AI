import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios.js';

export const BillingBanner = () => {
  const [subData, setSubData] = useState(null);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.get('/api/billing/subscription');
        setSubData(res.data.data);
      } catch (err) {
        // Fail silently so we don't break dashboard layout
      }
    };
    fetchSub();
  }, []);

  if (!subData) return null;

  const { planId, status, trialEndsAt, currentPeriodEnd, usage, limits } = subData;
  const now = new Date();

  // Check if subscription has expired/lapsed
  const isExpired =
    status === 'past_due' ||
    (status === 'trialing' && new Date(trialEndsAt) <= now) ||
    (status === 'canceled' && currentPeriodEnd && new Date(currentPeriodEnd) <= now);

  if (isExpired) {
    return (
      <div className="w-full bg-rose-950/40 border border-rose-800/60 text-rose-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm">⚠️</span>
          <span>Your subscription or free trial has expired. Conversations and connection features are currently locked.</span>
        </div>
        <Link
          to="/billing"
          className="px-3.5 py-1.5 bg-rose-600 text-white hover:bg-rose-500 rounded-lg font-medium transition shrink-0 ml-4"
        >
          Renew Now
        </Link>
      </div>
    );
  }

  // Check if monthly conversation limits have been hit
  if (usage.conversationsUsed >= limits.maxConversationsPerMonth) {
    return (
      <div className="w-full bg-amber-950/40 border border-amber-800/60 text-amber-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm">🚨</span>
          <span>You have reached your plan conversation limit ({limits.maxConversationsPerMonth}). New chats cannot be created.</span>
        </div>
        <Link
          to="/billing"
          className="px-3.5 py-1.5 bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold rounded-lg transition shrink-0 ml-4"
        >
          Upgrade Plan
        </Link>
      </div>
    );
  }

  // Check if free trial is ending soon (within 3 days)
  if (status === 'trialing') {
    const trialDate = new Date(trialEndsAt);
    const diffMs = trialDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays >= 0 && diffDays <= 3) {
      return (
        <div className="w-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-medium mb-6">
          <div className="flex items-center space-x-2">
            <span className="text-sm">⏳</span>
            <span>Your free trial ends in {diffDays} {diffDays === 1 ? 'day' : 'days'}. Upgrade your plan to keep workflows active.</span>
          </div>
          <Link
            to="/billing"
            className="px-3.5 py-1.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg font-medium transition shrink-0 ml-4"
          >
            Upgrade Now
          </Link>
        </div>
      );
    }
  }

  return null;
};

export default BillingBanner;
