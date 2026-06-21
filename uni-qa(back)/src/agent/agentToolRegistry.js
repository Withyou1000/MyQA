const QuestionModel = require('../models/QuestionModel');
const UserModel = require('../models/UserModel');
const UserQAModel = require('../models/UserQAModel');
const RefundModel = require('../models/RefundModel');
const ChatModel = require('../models/ChatModel');
const mongoose = require('mongoose');
const CustomerServiceSessionModel = require('../models/CustomerServiceSessionModel');
const CustomerServiceRequestModel = require('../models/CustomerServiceRequestModel');
const CustomerServiceMessageModel = require('../models/CustomerServiceMessageModel');
const { searchKnowledge } = require('../ai/services/ragServiceClient');

function serializeQuestion(question) {
  return {
    questionId: question._id,
    title: question.title || '',
    topic: question.topic || '',
    tags: question.tags || [],
    reward: question.reward || 0,
    status: question.status || 'pending',
    createTime: question.createTime,
    author: question.author
      ? {
          userId: question.author._id,
          account: question.author.account || '',
          name: question.author.name || ''
        }
      : null
  };
}

function buildKeywordQuery(keyword) {
  if (!keyword) return {};
  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  return {
    $or: [
      { title: regex },
      { topic: regex },
      { tags: regex }
    ]
  };
}

async function findActiveSession(customerId) {
  return CustomerServiceSessionModel.findOne({
    customerId,
    status: 'active'
  }).sort({ updatedAt: -1 });
}

async function createAiSession(customerId) {
  return CustomerServiceSessionModel.create({
    customerId,
    serviceId: null,
    lastMessage: '',
    lastMessageTime: new Date(),
    unreadCount: 0,
    status: 'active',
    serviceMode: 'ai',
    aiStatus: 'enabled',
    handoffStatus: 'none'
  });
}

function scoreQuestion(question, memory) {
  const preferences = memory?.preferences || {};
  const preferredTokens = [
    ...(preferences.topics || []),
    ...(preferences.keywords || [])
  ].map((item) => String(item).toLowerCase());
  const avoidTokens = (preferences.avoidTopics || []).map((item) => String(item).toLowerCase());
  const haystack = [
    question.title,
    question.topic,
    ...(question.tags || [])
  ].join(' ').toLowerCase();

  // 分数故意拆开计算，方便在前端解释 Agent 为什么推荐这条问题。
  const avoidPenalty = avoidTokens.some((token) => token && haystack.includes(token)) ? -100 : 0;
  const preferenceScore = preferredTokens.reduce((score, token) => {
    return haystack.includes(token) ? score + 25 : score;
  }, 0);
  const rewardScore = Math.min(Number(question.reward || 0), 100);
  const freshnessScore = question.createTime
    ? Math.max(0, 20 - Math.floor((Date.now() - new Date(question.createTime).getTime()) / 86400000))
    : 0;

  return avoidPenalty + preferenceScore + rewardScore + freshnessScore;
}

const tools = {
  get_user_profile: {
    name: 'get_user_profile',
    description: '读取当前用户画像、等级、余额、历史申请和回答数量。',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler({ userId }) {
      const [user, applyCount, answeredCount] = await Promise.all([
        UserModel.findById(userId).select('account name reputation ratingScore ratingCount level balance isVip role'),
        UserQAModel.countDocuments({ userId }),
        QuestionModel.countDocuments({ answerer: userId })
      ]);

      return {
        userId,
        account: user?.account || '',
        name: user?.name || '',
        reputation: user?.reputation || 0,
        ratingScore: user?.ratingScore || 0,
        ratingCount: user?.ratingCount || 0,
        level: user?.level || 0,
        balance: user?.balance || 0,
        isVip: user?.isVip || 0,
        role: user?.role || 'user',
        applyCount,
        answeredCount
      };
    }
  },

  get_user_question_stats: {
    name: 'get_user_question_stats',
    description: '统计当前用户发布过的问题数量，并按问题状态分组。',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler({ userId }) {
      const [total, statusGroups, recentQuestions] = await Promise.all([
        QuestionModel.countDocuments({ author: userId }),
        QuestionModel.aggregate([
          { $match: { author: userId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        QuestionModel.find({ author: userId })
          .sort({ createTime: -1 })
          .limit(5)
          .select('title topic reward status createTime')
      ]);

      // 状态分布单独转成对象，前端和最终回答都能直接读取，不需要再猜数组里的下标。
      const byStatus = statusGroups.reduce((result, item) => {
        result[item._id || 'unknown'] = item.count;
        return result;
      }, {});

      return {
        total,
        byStatus,
        recentQuestions: recentQuestions.map((question) => ({
          questionId: question._id,
          title: question.title || '',
          topic: question.topic || '',
          reward: question.reward || 0,
          status: question.status || '',
          createTime: question.createTime
        }))
      };
    }
  },

  get_question_applicants: {
    name: 'get_question_applicants',
    description: '查询当前用户某个已发布问题的所有申请回答者；如果没有指定问题，则返回用户发布的问题候选列表。',
    inputSchema: {
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        questionTitle: { type: 'string' }
      }
    },
    async handler({ userId, input = {} }) {
      const questionId = String(input.questionId || '').trim();
      const questionTitle = String(input.questionTitle || '').trim();
      let question = null;

      if (questionId && mongoose.Types.ObjectId.isValid(questionId)) {
        question = await QuestionModel.findOne({
          _id: questionId,
          author: userId
        }).select('title topic reward status createTime applicationCount');
      }

      if (!question && questionTitle) {
        const titleRegex = new RegExp(questionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        question = await QuestionModel.findOne({
          author: userId,
          title: titleRegex
        })
          .sort({ createTime: -1 })
          .select('title topic reward status createTime applicationCount');
      }

      if (!question) {
        const ownedQuestions = await QuestionModel.find({ author: userId })
          .sort({ createTime: -1 })
          .limit(8)
          .select('title topic reward status createTime applicationCount');

        // 问题没定位到时不瞎查，先返回候选问题，让用户下一轮指定标题或 ID。
        return {
          needsQuestionSelection: true,
          total: ownedQuestions.length,
          message: '请指定要查看申请者的问题标题或 questionId。',
          ownedQuestions: ownedQuestions.map((item) => ({
            questionId: item._id,
            title: item.title || '',
            topic: item.topic || '',
            reward: item.reward || 0,
            status: item.status || '',
            applicationCount: item.applicationCount || 0,
            createTime: item.createTime
          }))
        };
      }

      const applications = await UserQAModel.find({ questionId: question._id })
        .populate('userId', 'account name avatar ratingScore ratingCount level reputation')
        .limit(50);

      return {
        needsQuestionSelection: false,
        question: {
          questionId: question._id,
          title: question.title || '',
          topic: question.topic || '',
          reward: question.reward || 0,
          status: question.status || '',
          applicationCount: question.applicationCount || applications.length,
          createTime: question.createTime
        },
        total: applications.length,
        applicants: applications.map((application) => ({
          applicantId: application.userId?._id || '',
          account: application.userId?.account || '',
          name: application.userId?.name || '',
          avatar: application.userId?.avatar || '',
          ratingScore: application.userId?.ratingScore || 0,
          ratingCount: application.userId?.ratingCount || 0,
          level: application.userId?.level || 0,
          reputation: application.userId?.reputation || 0
        }))
      };
    }
  },

  search_questions: {
    name: 'search_questions',
    description: '搜索平台当前待回答的问题，支持关键词、分类、最低赏金过滤。',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        topic: { type: 'string' },
        minReward: { type: 'number' },
        limit: { type: 'number' }
      }
    },
    async handler({ input = {} }) {
      const rawLimit = Number(input.limit || 20);
      // limit 可能来自模型规划或 ReAct 修正，先做数字兜底，避免异常参数影响数据库查询。
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 20;
      const query = {
        status: 'pending',
        ...buildKeywordQuery(input.keyword)
      };
      if (input.topic) query.topic = input.topic;
      if (Number(input.minReward || 0) > 0) {
        query.reward = { $gte: Number(input.minReward) };
      }

      const questions = await QuestionModel.find(query)
        .populate('author', 'account name')
        .sort({ reward: -1, createTime: -1 })
        .limit(limit);

      return {
        total: questions.length,
        list: questions.map(serializeQuestion)
      };
    }
  },

  rank_questions_for_user: {
    name: 'rank_questions_for_user',
    description: '根据用户记忆、问题标签、赏金和新鲜度对问题排序。',
    inputSchema: {
      type: 'object',
      properties: {
        questions: { type: 'array' }
      }
    },
    async handler({ input = {}, memory }) {
      const questions = Array.isArray(input.questions) ? input.questions : [];
      const ranked = questions
        .map((question) => ({
          ...question,
          matchScore: scoreQuestion(question, memory),
          reason: '综合匹配了你的偏好、问题赏金和发布时间。'
        }))
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 6);

      return {
        total: ranked.length,
        list: ranked
      };
    }
  },

  get_recent_transactions: {
    name: 'get_recent_transactions',
    description: '查询当前用户最近参与的问答交易。',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler({ userId }) {
      const questions = await QuestionModel.find({
        $or: [{ author: userId }, { answerer: userId }]
      })
        .sort({ createTime: -1 })
        .limit(8)
        .populate('author', 'account name')
        .populate('answerer', 'account name');

      return {
        total: questions.length,
        list: questions.map((question) => ({
          questionId: question._id,
          title: question.title || '',
          topic: question.topic || '',
          reward: question.reward || 0,
          status: question.status || '',
          role: question.author?._id?.toString() === userId.toString() ? 'asker' : 'answerer',
          otherUser: question.author?._id?.toString() === userId.toString()
            ? question.answerer
            : question.author
        }))
      };
    }
  },

  get_refund_status: {
    name: 'get_refund_status',
    description: '查询当前用户的退款记录和处理状态。',
    inputSchema: {
      type: 'object',
      properties: {}
    },
    async handler({ userId }) {
      const refunds = await RefundModel.find({ userId })
        .populate('questionId', 'title topic status')
        .sort({ applyTime: -1 })
        .limit(8);

      return {
        total: refunds.length,
        list: refunds.map((refund) => ({
          refundId: refund._id,
          questionId: refund.questionId?._id || refund.questionId,
          questionTitle: refund.questionId?.title || '',
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
          applyTime: refund.applyTime,
          processTime: refund.processTime,
          processRemark: refund.processRemark || ''
        }))
      };
    }
  },

  search_knowledge_base: {
    name: 'search_knowledge_base',
    description: '检索客服知识库，用于平台规则、退款规则、流程说明。',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' }
      }
    },
    async handler({ input = {} }) {
      try {
        const chunks = await searchKnowledge(input.keyword || '');
        return {
          total: chunks.length,
          list: chunks.slice(0, 5).map((item) => ({
            docTitle: item.docTitle,
            sectionTitle: item.sectionTitle,
            text: item.text
          }))
        };
      } catch (error) {
        return {
          total: 0,
          list: [],
          error: error.message
        };
      }
    }
  },

  create_handoff_request: {
    name: 'create_handoff_request',
    description: '用户确认后创建人工客服请求。',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string' }
      }
    },
    async handler({ userId, input = {} }) {
      let session = await findActiveSession(userId);
      if (!session) {
        session = await createAiSession(userId);
      }

      let request = await CustomerServiceRequestModel.findOne({
        customerId: userId,
        status: 'pending'
      });

      if (!request) {
        request = await CustomerServiceRequestModel.create({
          customerId: userId,
          status: 'pending',
          sessionId: session._id,
          message: input.message || '用户从 Agent 助手确认转人工客服'
        });
      }

      // 转人工是高影响动作，只有 action-confirm 接口确认后才会真正改会话状态。
      session.handoffStatus = 'requested';
      session.aiStatus = 'paused';
      session.updatedAt = new Date();
      await session.save();

      await CustomerServiceMessageModel.create({
        sessionId: session._id,
        customerId: userId,
        serviceId: null,
        senderId: null,
        receiverId: userId,
        senderType: 'system',
        messageType: 'text',
        text: '已从 Agent 助手提交人工客服请求，客服接入后会看到你的补充内容。',
        image: '',
        isRead: true,
        extra: {
          type: 'handoff_pending_notice',
          source: 'agent'
        }
      });

      return {
        requestId: request._id,
        sessionId: session._id,
        status: request.status
      };
    }
  }
};

function getTool(name) {
  return tools[name] || null;
}

function listTools() {
  return Object.values(tools).map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema
  }));
}

async function callTool(name, context) {
  const tool = getTool(name);
  if (!tool) {
    throw new Error(`未知 Agent 工具：${name}`);
  }
  return tool.handler(context);
}

module.exports = {
  callTool,
  listTools
};
