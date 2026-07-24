import mongoose from 'mongoose';
import { Conversation } from '../../models/Conversation.js';
import { Message } from '../../models/Message.js';

/**
 * Normalizes dateRange dates and returns a Mongo query filter block.
 * Default range is the last 30 days.
 */
const getDateQuery = (dateRange) => {
  const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
  const startDate = dateRange?.startDate
    ? new Date(dateRange.startDate)
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return { $gte: startDate, $lte: endDate };
};

/**
 * Returns overall dashboard analytics (total convs, breakdown, average call duration,
 * average response time, and resolution rate).
 */
export const getOverviewStats = async (companyId, dateRange) => {
  const dateQuery = getDateQuery(dateRange);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // 1. Total Conversations
  const totalConversations = await Conversation.countDocuments({
    companyId: companyObjectId,
    createdAt: dateQuery
  });

  // 2. Channel Breakdown
  const channelBreakdownRaw = await Conversation.aggregate([
    { $match: { companyId: companyObjectId, createdAt: dateQuery } },
    { $group: { _id: '$channel', count: { $sum: 1 } } }
  ]);

  const channelBreakdown = { web_chat: 0, whatsapp: 0, phone: 0 };
  channelBreakdownRaw.forEach((item) => {
    if (channelBreakdown[item._id] !== undefined) {
      channelBreakdown[item._id] = item.count;
    }
  });

  // 3. Phone statistics
  const totalCalls = await Conversation.countDocuments({
    companyId: companyObjectId,
    channel: 'phone',
    createdAt: dateQuery
  });

  const durationRes = await Conversation.aggregate([
    {
      $match: {
        companyId: companyObjectId,
        channel: 'phone',
        callDuration: { $ne: null },
        createdAt: dateQuery
      }
    },
    { $group: { _id: null, avgDuration: { $avg: '$callDuration' } } }
  ]);
  const avgCallDuration = durationRes[0]?.avgDuration ? Math.round(durationRes[0].avgDuration) : 0;

  // 4. Resolution Rate: (% of support_resolved/interested_lead vs all conversations with outcomes)
  const outcomes = await Conversation.aggregate([
    {
      $match: {
        companyId: companyObjectId,
        createdAt: dateQuery,
        detectedOutcome: { $ne: null }
      }
    },
    { $group: { _id: '$detectedOutcome', count: { $sum: 1 } } }
  ]);

  let totalWithOutcome = 0;
  let resolvedCount = 0;
  outcomes.forEach((o) => {
    totalWithOutcome += o.count;
    if (o._id === 'support_resolved' || o._id === 'interested_lead') {
      resolvedCount += o.count;
    }
  });
  const resolutionRate = totalWithOutcome > 0 ? Math.round((resolvedCount / totalWithOutcome) * 100) : 0;

  // 5. Average Response Time
  // Gather conversations matching query
  const conversationsList = await Conversation.find({
    companyId: companyObjectId,
    createdAt: dateQuery
  }).select('_id');
  const convIds = conversationsList.map((c) => c._id);

  // Group messages for response calculations
  const messageGroups = await Message.aggregate([
    { $match: { conversationId: { $in: convIds } } },
    { $sort: { conversationId: 1, createdAt: 1 } },
    {
      $group: {
        _id: '$conversationId',
        messages: {
          $push: {
            role: '$role',
            createdAt: '$createdAt'
          }
        }
      }
    }
  ]);

  let totalDiff = 0;
  let pairsCount = 0;
  messageGroups.forEach((group) => {
    const msgs = group.messages;
    for (let i = 0; i < msgs.length - 1; i++) {
      // Find where user messaged and AI replied next
      if (msgs[i].role === 'user' && msgs[i + 1].role === 'assistant') {
        const diffMs = new Date(msgs[i + 1].createdAt).getTime() - new Date(msgs[i].createdAt).getTime();
        if (diffMs > 0) {
          totalDiff += diffMs;
          pairsCount++;
        }
      }
    }
  });
  // Average in seconds
  const avgResponseTime = pairsCount > 0 ? Math.round((totalDiff / pairsCount) / 1000) : 0;

  // 6. Avg CSAT
  const csatRes = await Conversation.aggregate([
    {
      $match: {
        companyId: companyObjectId,
        createdAt: dateQuery,
        satisfactionRating: { $ne: null }
      }
    },
    { $group: { _id: null, avgRating: { $avg: '$satisfactionRating' } } }
  ]);
  const avgCsat = csatRes[0]?.avgRating ? parseFloat(csatRes[0].avgRating.toFixed(1)) : 0;

  return {
    totalConversations,
    channelBreakdown,
    totalCalls,
    avgCallDuration,
    avgResponseTime,
    resolutionRate,
    avgCsat
  };
};

/**
 * Returns time-series data for daily conversation volume, grouped by channel.
 */
export const getVolumeOverTime = async (companyId, dateRange) => {
  const dateQuery = getDateQuery(dateRange);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  const rawVolume = await Conversation.aggregate([
    { $match: { companyId: companyObjectId, createdAt: dateQuery } },
    {
      $project: {
        channel: 1,
        dateStr: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        }
      }
    },
    {
      $group: {
        _id: { dateStr: '$dateStr', channel: '$channel' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.dateStr': 1 } }
  ]);

  // Format array to key-value objects suited for Recharts time-series area charts
  const volumeMap = {};
  rawVolume.forEach((item) => {
    const { dateStr, channel } = item._id;
    if (!volumeMap[dateStr]) {
      volumeMap[dateStr] = { date: dateStr, web_chat: 0, whatsapp: 0, phone: 0 };
    }
    volumeMap[dateStr][channel] = item.count;
  });

  return Object.values(volumeMap).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Returns customer satisfaction statistics (average rating, distribution, response rate).
 */
export const getCSATStats = async (companyId, dateRange) => {
  const dateQuery = getDateQuery(dateRange);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  const totalConversations = await Conversation.countDocuments({
    companyId: companyObjectId,
    createdAt: dateQuery
  });

  const ratingAgg = await Conversation.aggregate([
    {
      $match: {
        companyId: companyObjectId,
        createdAt: dateQuery,
        satisfactionRating: { $ne: null }
      }
    },
    {
      $group: {
        _id: '$satisfactionRating',
        count: { $sum: 1 }
      }
    }
  ]);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRated = 0;
  let totalRatingSum = 0;

  ratingAgg.forEach((item) => {
    distribution[item._id] = item.count;
    totalRated += item.count;
    totalRatingSum += item._id * item.count;
  });

  const avgRating = totalRated > 0 ? parseFloat((totalRatingSum / totalRated).toFixed(1)) : 0;
  const responseRate = totalConversations > 0 ? Math.round((totalRated / totalConversations) * 100) : 0;

  return {
    avgRating,
    responseRate,
    totalRated,
    distribution
  };
};

/**
 * Returns breakdown counts of conversations by detected outcome.
 */
export const getOutcomeBreakdown = async (companyId, dateRange) => {
  const dateQuery = getDateQuery(dateRange);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  const outcomesAgg = await Conversation.aggregate([
    {
      $match: {
        companyId: companyObjectId,
        createdAt: dateQuery,
        detectedOutcome: { $ne: null }
      }
    },
    { $group: { _id: '$detectedOutcome', count: { $sum: 1 } } }
  ]);

  // Format nicely for charts: [ { name, count } ]
  return outcomesAgg.map((item) => ({
    name: item._id.replace(/_/g, ' ').toUpperCase(),
    count: item.count
  }));
};

/**
 * Searches the Messages database for assistant messages returning a "don't have information" style string,
 * retrieves the user queries that caused the gap, groups/counts duplicates, and highlights top gaps.
 */
export const getTopKnowledgeGaps = async (companyId, dateRange) => {
  const dateQuery = getDateQuery(dateRange);
  const companyObjectId = new mongoose.Types.ObjectId(companyId);

  // 1. Fetch conversations of company inside date range
  const conversationsList = await Conversation.find({
    companyId: companyObjectId,
    createdAt: dateQuery
  }).select('_id');
  const convIds = conversationsList.map((c) => c._id);

  // 2. Fetch assistant messages indicating gap occurrences
  const gapMessages = await Message.find({
    conversationId: { $in: convIds },
    role: 'assistant',
    content: {
      $regex: /don't have (that )?information|do not have (that )?information|no matching information/i
    }
  });

  const rawGaps = [];

  for (const gapMsg of gapMessages) {
    // Query the user message immediately preceding this gap message
    const userMsg = await Message.findOne({
      conversationId: gapMsg.conversationId,
      createdAt: { $lt: gapMsg.createdAt },
      role: 'user'
    }).sort({ createdAt: -1 });

    if (userMsg) {
      rawGaps.push({
        question: userMsg.content,
        askedAt: userMsg.createdAt
      });
    }
  }

  // 3. Group and count similar normalized queries
  const groupedGaps = {};
  rawGaps.forEach((g) => {
    // Normalize string (strip punctuation, lower case)
    const normalized = g.question
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '');

    if (!normalized) return;

    if (!groupedGaps[normalized]) {
      groupedGaps[normalized] = {
        question: g.question,
        count: 0,
        latestAsked: g.askedAt
      };
    }
    groupedGaps[normalized].count += 1;
    if (new Date(g.askedAt) > new Date(groupedGaps[normalized].latestAsked)) {
      groupedGaps[normalized].latestAsked = g.askedAt;
    }
  });

  // Sort by count descending and return top 10
  return Object.values(groupedGaps)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};
