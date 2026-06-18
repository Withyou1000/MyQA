const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/auth');
const CustomerServiceSessionModel = require('../models/CustomerServiceSessionModel');
const CustomerServiceMessageModel = require('../models/CustomerServiceMessageModel');
const CustomerServiceRequestModel = require('../models/CustomerServiceRequestModel');
const QuestionModel = require('../models/QuestionModel');
const ChatModel = require('../models/ChatModel');
const RefundModel = require('../models/RefundModel');
const UserModel = require('../models/UserModel');
const socketService = require('../services/socket');
const { generateCustomerServiceReply } = require('../ai/services/customerServiceAiOrchestrator');

// 获取用户展示名，优先使用昵称，没有昵称时退回账号，避免客服列表出现空名称。
function getDisplayName(user) {
  if (!user) return '';
  return user.name || user.account || '匿名用户';
}

// 获取用户头像路径，统一处理用户不存在或头像为空的情况。
function getAvatar(user) {
  return user?.avatar || '';
}

// 把问答交易、双方用户和退款记录整理成前端交易卡片需要的快照结构。
function buildTransactionSnapshot(question, currentUserId, refundMap = new Map()) {
  if (!question || !question.author || !question.answerer) return null;

  const questionId = question._id.toString();
  const isAsker = question.author._id.toString() === currentUserId.toString();
  const otherUser = isAsker ? question.answerer : question.author;
  const refund = refundMap.get(questionId);

  return {
    questionId,
    title: question.title || '',
    topic: question.topic || '',
    tags: question.tags || [],
    reward: question.reward || 0,
    status: question.status || 'pending',
    createTime: question.createTime,
    role: isAsker ? 'asker' : 'answerer',
    otherUser: {
      userId: otherUser?._id || '',
      name: getDisplayName(otherUser),
      avatar: getAvatar(otherUser)
    },
    refund: refund
      ? {
          status: refund.status,
          amount: refund.amount,
          applyTime: refund.applyTime
        }
      : null
  };
}

// 根据消息类型生成会话列表里的最后一条消息预览。
function getLastMessagePreview(messageType, text, transactionInfo) {
  if (messageType === 'image') return '[图片]';
  if (messageType === 'transaction') {
    return `[交易] ${transactionInfo?.title || '交易咨询'}`;
  }
  return text || '';
}

// 标准化交易消息附带的数据，只保留客服排查交易时需要展示和查询的字段。
function normalizeTransactionInfo(messageType, transactionInfo) {
  if (messageType !== 'transaction' || !transactionInfo) return null;

  return {
    questionId: String(transactionInfo.questionId || ''),
    title: transactionInfo.title || '',
    topic: transactionInfo.topic || '',
    tags: Array.isArray(transactionInfo.tags) ? transactionInfo.tags : [],
    reward: Number(transactionInfo.reward || 0),
    status: transactionInfo.status || 'pending',
    createTime: transactionInfo.createTime || null,
    role: transactionInfo.role || '',
    otherUser: transactionInfo.otherUser || null,
    refund: transactionInfo.refund || null
  };
}

// 构造客服会话状态元信息，给前端判断 AI 模式、人工排队和会话状态使用。
function buildSessionMeta(session) {
  if (!session) {
    return {
      sessionId: '',
      serviceMode: 'ai',
      aiStatus: 'enabled',
      handoffStatus: 'none',
      status: 'active'
    };
  }

  return {
    sessionId: session._id,
    serviceMode: session.serviceMode || 'ai',
    aiStatus: session.aiStatus || 'enabled',
    handoffStatus: session.handoffStatus || 'none',
    status: session.status || 'active'
  };
}

// 判断当前 AI 回复或用户表达是否需要建议转人工客服。
function shouldSuggestHandoff(session, messageText, aiResult) {
  if (!session) return false;
  if (aiResult?.suggestHandoff) return true;

  const safeText = String(messageText || '');
  return /人工客服|转人工|投诉|纠纷|账号|登录|冻结|封号/.test(safeText);
}

// 判断 AI 跳过回复时，是否需要给用户追加“人工排队中”的系统提示。
function shouldCreateHandoffPendingNotice(reason) {
  // 只有“已经申请人工、AI 已暂停”这类排队状态，才需要给用户回一条系统提示。
  return ['handoff_requested', 'ai_status_paused'].includes(reason);
}

// 创建人工排队中的系统提示消息，提醒用户补充内容会被人工客服看到。
async function createHandoffPendingNotice(session, customerId) {
  if (!session?._id) return null;

  // 排队期间每次用户补充消息，都落一条系统提示，明确告诉用户消息会给人工客服看到。
  return createCustomerServiceMessage({
    sessionId: session._id,
    customerId,
    serviceId: session.serviceId || null,
    senderId: null,
    receiverId: customerId,
    senderType: 'system',
    messageType: 'text',
    text: '已提交人工客服请求，人工客服接入后会看到你的补充内容。',
    image: '',
    isRead: true,
    extra: {
      type: 'handoff_pending_notice'
    }
  });
}

// 把数据库里的客服消息转换成前端聊天组件统一使用的消息结构。
function serializeCustomerServiceMessage(message, viewerId) {
  const senderType = message.senderType || 'user';
  const senderId = message.senderId ? message.senderId.toString() : '';
  const isMine =
    senderType === 'user' || senderType === 'human_service'
      ? senderId === viewerId.toString()
      : false;

  return {
    id: message._id,
    text: message.text,
    image: message.image,
    messageType: message.messageType,
    transactionInfo: message.transactionInfo || null,
    senderId: message.senderId,
    receiverId: message.receiverId,
    createdAt: message.createdAt,
    isMine,
    senderType,
    extra: message.extra || null
  };
}

// 查询当前客户正在进行中的客服会话。
async function findActiveSession(customerId) {
  return CustomerServiceSessionModel.findOne({
    customerId,
    status: 'active'
  }).sort({ updatedAt: -1 });
}

// 为首次进入客服的用户创建默认 AI 客服会话。
async function createAiSession(customerId) {
  const session = new CustomerServiceSessionModel({
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
  await session.save();
  return session;
}

// 保存一条客服消息，统一封装模型创建和持久化。
async function createCustomerServiceMessage(payload) {
  const message = new CustomerServiceMessageModel(payload);
  await message.save();
  return message;
}

// 构造 WebSocket 推送 payload，保证前端收到的实时消息字段和接口返回基本一致。
function buildSocketPayload(message) {
  return {
    type: 'message_received',
    messageId: message._id,
    sessionId: message.sessionId || null,
    customerId: message.customerId || null,
    serviceId: message.serviceId || null,
    text: message.text || '',
    image: message.image || '',
    messageType: message.messageType,
    transactionInfo: message.transactionInfo || null,
    createdAt: message.createdAt,
    senderType: message.senderType || 'user',
    extra: message.extra || null
  };
}

// 创建或复用用户的待处理人工客服请求，并把当前会话切换到人工排队状态。
async function createHandoffRequest(customerId, session, message) {
  let request = await CustomerServiceRequestModel.findOne({
    customerId,
    status: 'pending'
  });

  if (!request) {
    request = new CustomerServiceRequestModel({
      customerId,
      status: 'pending',
      sessionId: session?._id || null,
      message: message || '用户请求转接人工客服'
    });
    await request.save();
  }

  session.handoffStatus = 'requested';
  session.aiStatus = 'paused';
  session.updatedAt = new Date();
  await session.save();

  return request;
}

/**
 * 获取客服会话列表
 * GET /api/customer-service/sessions
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以查看会话列表'
      });
    }

    const sessions = await CustomerServiceSessionModel.find({
      serviceId: userId,
      status: 'active'
    })
      .populate('customerId', 'account name avatar')
      .sort({ lastMessageTime: -1 });

    res.status(200).json({
      code: 200,
      data: sessions.map((session) => ({
        id: session._id,
        customerId: session.customerId._id,
        customerName: session.customerId.name || session.customerId.account,
        customerAvatar: session.customerId.avatar,
        lastMessage: session.lastMessage,
        lastMessageTime: session.lastMessageTime,
        unreadCount: session.unreadCount,
        serviceMode: session.serviceMode || 'human',
        handoffStatus: session.handoffStatus || 'accepted'
      }))
    });
  } catch (error) {
    console.error('获取客服会话列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取客服会话列表失败'
    });
  }
});

/**
 * 获取客服与客户的聊天记录
 * GET /api/customer-service/chat/:customerId
 */
router.get('/chat/:customerId', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== 'customer_service' && userId.toString() !== customerId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '没有权限查看该客服会话'
      });
    }

    const [messages, customer, session] = await Promise.all([
      CustomerServiceMessageModel.find({ customerId }).sort({ createdAt: 1 }),
      UserModel.findById(customerId).select('account name avatar'),
      findActiveSession(customerId)
    ]);

    res.status(200).json({
      code: 200,
      data: {
        customerInfo: {
          id: customer?._id || customerId,
          name: customer ? customer.name || customer.account : '智能客服会话',
          avatar: customer?.avatar || ''
        },
        sessionMeta: buildSessionMeta(session),
        messages: messages.map((message) => serializeCustomerServiceMessage(message, userId))
      }
    });
  } catch (error) {
    console.error('获取聊天记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取聊天记录失败'
    });
  }
});

/**
 * 获取当前客服会话模式
 * GET /api/customer-service/session/:customerId/mode
 */
router.get('/session/:customerId/mode', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    if (role !== 'customer_service' && userId.toString() !== customerId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '没有权限查看会话模式'
      });
    }

    const session = await findActiveSession(customerId);
    res.status(200).json({
      code: 200,
      data: buildSessionMeta(session)
    });
  } catch (error) {
    console.error('获取会话模式失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取会话模式失败'
    });
  }
});

/**
 * 发送消息
 * POST /api/customer-service/message/:customerId
 */
router.post('/message/:customerId', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { text, image, messageType = 'text', transactionInfo } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;
    const senderType = role === 'customer_service' ? 'human_service' : 'user';
    const senderIsCustomer = senderType === 'user';

    if (role !== 'customer_service' && userId.toString() !== customerId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '没有权限发送该客服消息'
      });
    }

    const normalizedTransactionInfo = normalizeTransactionInfo(messageType, transactionInfo);
    let session = await findActiveSession(customerId);

    if (!session && senderIsCustomer) {
      session = await createAiSession(customerId);
    }

    let receiverId = null;
    if (session) {
      session.lastMessage = getLastMessagePreview(messageType, text, normalizedTransactionInfo);
      session.lastMessageTime = new Date();
      session.updatedAt = new Date();

      // 只有已经转为人工会话时，才维护人工客服工作台的未读数量。
      if (senderIsCustomer && session.serviceMode === 'human' && session.serviceId) {
        session.unreadCount += Array.isArray(image) ? image.length : 1;
      }
      await session.save();
      receiverId = senderIsCustomer ? session.serviceId : customerId;
    }

    const savedMessages = [];
    let aiReplyPayload = null;
    // 记录 AI 没有回复的原因，前端可以据此判断是否需要展示系统提示或调试日志。
    let aiSkippedReason = '';
    const images = Array.isArray(image) ? image : null;

    if (images) {
      for (const currentImage of images) {
        const message = await createCustomerServiceMessage({
          sessionId: session?._id || null,
          customerId,
          serviceId: session?.serviceId || null,
          text: text || '',
          image: currentImage,
          messageType,
          transactionInfo: normalizedTransactionInfo,
          senderId: userId,
          receiverId,
          senderType,
          isRead: false,
          extra: null
        });
        savedMessages.push(message);

        if (receiverId) {
          socketService.notifyUser(receiverId.toString(), buildSocketPayload(message));
        }
      }
    } else {
      const message = await createCustomerServiceMessage({
        sessionId: session?._id || null,
        customerId,
        serviceId: session?.serviceId || null,
        text: text || '',
        image: image || '',
        messageType,
        transactionInfo: normalizedTransactionInfo,
        senderId: userId,
        receiverId,
        senderType,
        isRead: false,
        extra: null
      });
      savedMessages.push(message);

      if (receiverId) {
        socketService.notifyUser(receiverId.toString(), buildSocketPayload(message));
      }
    }

    let latestSessionMeta = buildSessionMeta(session);

    // AI 只在“普通用户 + AI 模式 + 文本/交易消息”下触发；人工会话、排队中、图片消息都不自动回复。
    const shouldTriggerAi =
      senderIsCustomer &&
      session &&
      session.serviceMode !== 'human' &&
      session.aiStatus === 'enabled' &&
      session.handoffStatus !== 'requested' &&
      messageType !== 'image';

    if (!shouldTriggerAi && senderIsCustomer) {
      // 把跳过原因拆成稳定字符串，方便前端和日志判断具体是哪一种状态导致没有 AI 回复。
      aiSkippedReason = session.serviceMode === 'human'
        ? 'human_mode'
        : session.aiStatus !== 'enabled'
          ? `ai_status_${session.aiStatus}`
          : session.handoffStatus === 'requested'
            ? 'handoff_requested'
            : messageType === 'image'
              ? 'image_message'
              : 'not_customer_message';
      console.log('AI 自动回复跳过:', {
        customerId: String(customerId || ''),
        sessionId: session?._id ? String(session._id) : '',
        serviceMode: session?.serviceMode || '',
        aiStatus: session?.aiStatus || '',
        handoffStatus: session?.handoffStatus || '',
        messageType,
        reason: aiSkippedReason
      });

      if (shouldCreateHandoffPendingNotice(aiSkippedReason)) {
        // 用户已经在等待人工时继续补充消息，后端主动落库一条系统消息，刷新页面后也能看到提示和撤销入口。
        const pendingNotice = await createHandoffPendingNotice(session, customerId);
        if (pendingNotice) {
          savedMessages.push(pendingNotice);
          socketService.notifyUser(customerId.toString(), buildSocketPayload(pendingNotice));
        }
      }
    }

    // 只有普通用户在 AI 会话中发送文本类消息时，才会触发 RAG 自动回复。
    if (shouldTriggerAi) {
      // 编排层内部会先查 RAG 知识库和业务上下文，再调用大模型生成客服回复。
      const aiResult = await generateCustomerServiceReply({
        customerId,
        sessionId: session._id,
        messageText: text || normalizedTransactionInfo?.title || ''
      });

      const suggestHandoff = shouldSuggestHandoff(session, text, aiResult);
      if (suggestHandoff) {
        // AI 判断需要人工兜底时，只先标记为“建议转人工”，是否真正转人工仍由用户确认。
        session.handoffStatus = 'suggested';
        session.handoffOfferedAt = new Date();
        session.updatedAt = new Date();
        await session.save();
      }

      const aiMessage = await createCustomerServiceMessage({
        sessionId: session._id,
        customerId,
        // AI 消息不应该挂人工客服 ID，否则会污染后续人工客服统计和消息归属语义。
        serviceId: null,
        // AI 不是用户实体，不再使用 customerId 做占位 senderId。
        senderId: null,
        receiverId: customerId,
        senderType: 'ai',
        messageType: 'text',
        text: aiResult.replyText,
        image: '',
        isRead: true,
        extra: {
          confidence: aiResult.confidence,
          intent: aiResult.intent,
          handoffSuggestion: suggestHandoff,
          handoffReason: aiResult.handoffReason || '',
          knowledgeRefs: Array.isArray(aiResult.knowledgeChunks)
            ? aiResult.knowledgeChunks.map((item) => ({
                docId: item.docId,
                chunkId: item.chunkId,
                sectionTitle: item.sectionTitle
              }))
            : []
        }
      });

      session.lastMessage = aiResult.replyText;
      session.lastMessageTime = new Date();
      session.updatedAt = new Date();
      await session.save();

      // 直接把 AI 回复随接口返回给前端，避免前端只能依赖 WebSocket 才能看到自动回复。
      aiReplyPayload = serializeCustomerServiceMessage(aiMessage, userId);
      socketService.notifyUser(customerId.toString(), buildSocketPayload(aiMessage));
      latestSessionMeta = buildSessionMeta(session);
    }

    res.status(200).json({
      code: 200,
      data: {
        status: 'sent',
        sessionMeta: latestSessionMeta,
        messageCount: savedMessages.length,
        sentMessages: savedMessages.map((message) => serializeCustomerServiceMessage(message, userId)),
        aiReply: aiReplyPayload,
        aiSkippedReason
      }
    });
  } catch (error) {
    console.error('发送消息失败:', error);
    res.status(500).json({
      code: 500,
      message: '发送消息失败'
    });
  }
});

/**
 * 获取当前用户最近的问答交易
 * GET /api/customer-service/transactions/recent
 */
router.get('/transactions/recent', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const questions = await QuestionModel.find({
      $or: [{ author: userId }, { answerer: userId }],
      answerer: { $ne: null }
    })
      .populate('author', 'account name avatar')
      .populate('answerer', 'account name avatar')
      .sort({ createTime: -1 })
      .limit(20);

    const refunds = await RefundModel.find({
      questionId: { $in: questions.map((item) => item._id) }
    }).select('questionId status amount applyTime');

    const refundMap = new Map(
      refunds.map((refund) => [refund.questionId.toString(), refund])
    );

    res.status(200).json({
      code: 200,
      data: questions
        .map((question) => buildTransactionSnapshot(question, userId, refundMap))
        .filter(Boolean)
    });
  } catch (error) {
    console.error('获取最近交易失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取最近交易失败'
    });
  }
});

/**
 * 获取交易详情
 * GET /api/customer-service/transaction/:questionId/detail
 */
router.get('/transaction/:questionId/detail', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;

    const question = await QuestionModel.findById(questionId)
      .populate('author', 'account name avatar')
      .populate('answerer', 'account name avatar');

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    const isParticipant =
      question.author?._id?.toString() === userId.toString() ||
      question.answerer?._id?.toString() === userId.toString();

    if (role !== 'customer_service' && !isParticipant) {
      return res.status(403).json({
        code: 403,
        message: '没有权限查看该交易详情'
      });
    }

    const [chatMessages, refund] = await Promise.all([
      ChatModel.find({ questionId }).sort({ createTime: 1 }),
      RefundModel.findOne({ questionId }).sort({ applyTime: -1 })
    ]);

    const authorId = question.author?._id?.toString() || '';
    const answererId = question.answerer?._id?.toString() || '';

    res.status(200).json({
      code: 200,
      data: {
        question: {
          questionId: question._id,
          title: question.title || '',
          topic: question.topic || '',
          tags: question.tags || [],
          reward: question.reward || 0,
          images: question.images || [],
          status: question.status || 'pending',
          createTime: question.createTime,
          author: question.author
            ? {
                userId: question.author._id,
                name: getDisplayName(question.author),
                avatar: getAvatar(question.author)
              }
            : null,
          answerer: question.answerer
            ? {
                userId: question.answerer._id,
                name: getDisplayName(question.answerer),
                avatar: getAvatar(question.answerer)
              }
            : null
        },
        chatMessages: chatMessages.map((message) => ({
          messageId: message._id,
          text: message.text || '',
          image: message.image || '',
          messageType: message.messageType,
          createTime: message.createTime,
          senderRole:
            message.senderId.toString() === authorId
              ? 'asker'
              : message.senderId.toString() === answererId
                ? 'answerer'
                : 'system'
        })),
        refund: refund
          ? {
              refundId: refund._id,
              amount: refund.amount,
              reason: refund.reason,
              description: refund.description,
              proofs: refund.proofs || [],
              status: refund.status,
              applyTime: refund.applyTime,
              processTime: refund.processTime,
              processRemark: refund.processRemark || ''
            }
          : null
      }
    });
  } catch (error) {
    console.error('获取交易详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取交易详情失败'
    });
  }
});

/**
 * 标记会话已读
 * PUT /api/customer-service/session/:sessionId/read
 */
router.put('/session/:sessionId/read', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const role = req.user.role;

    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以标记已读'
      });
    }

    const session = await CustomerServiceSessionModel.findByIdAndUpdate(
      sessionId,
      { unreadCount: 0, updatedAt: new Date() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        code: 404,
        message: '会话不存在'
      });
    }

    await CustomerServiceMessageModel.updateMany(
      {
        sessionId,
        isRead: false
      },
      { isRead: true }
    );

    res.status(200).json({
      code: 200,
      data: {
        status: 'success'
      }
    });
  } catch (error) {
    console.error('标记会话已读失败:', error);
    res.status(500).json({
      code: 500,
      message: '标记会话已读失败'
    });
  }
});

/**
 * 用户申请人工客服（兼容旧接口）
 * POST /api/customer-service/request
 */
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    let session = await findActiveSession(userId);

    if (!session) {
      session = await createAiSession(userId);
    }

    const request = await createHandoffRequest(
      userId,
      session,
      req.body?.message || '用户主动请求人工客服'
    );

    const notifyMessage = await createCustomerServiceMessage({
      sessionId: session._id,
      customerId: userId,
      serviceId: null,
      senderId: userId,
      receiverId: userId,
      senderType: 'system',
      messageType: 'text',
      text: '已提交人工客服请求，人工客服接入后会看到你的补充内容。',
      image: '',
      isRead: true,
      extra: {
        type: 'handoff_pending_notice',
        handoffSuggestion: false
      }
    });

    socketService.notifyUser(userId.toString(), buildSocketPayload(notifyMessage));

    res.status(200).json({
      code: 200,
      message: '客服请求已发送',
      data: {
        requestId: request._id,
        status: request.status,
        sessionMeta: buildSessionMeta(session)
      }
    });
  } catch (error) {
    console.error('发送客服请求失败:', error);
    res.status(500).json({
      code: 500,
      message: '发送客服请求失败'
    });
  }
});

/**
 * 用户确认转人工
 * POST /api/customer-service/ai/handoff-confirm
 */
router.post('/ai/handoff-confirm', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    if (role === 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '客服端不能发起转人工确认'
      });
    }

    const customerId = req.body?.customerId || userId;
    if (customerId.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '只能为当前登录用户发起转人工'
      });
    }

    let session = await findActiveSession(customerId);
    if (!session) {
      session = await createAiSession(customerId);
    }

    const existingRequest = await CustomerServiceRequestModel.findOne({
      customerId,
      status: 'pending'
    });

    const request = existingRequest || (await createHandoffRequest(
      customerId,
      session,
      req.body?.message || '用户确认转人工客服'
    ));

    if (!existingRequest) {
      const notifyMessage = await createCustomerServiceMessage({
        sessionId: session._id,
        customerId,
        serviceId: null,
        senderId: customerId,
        receiverId: customerId,
        senderType: 'system',
        messageType: 'text',
        text: '已提交人工客服请求，人工客服接入后会看到你的补充内容。',
        image: '',
      isRead: true,
      extra: {
        type: 'handoff_pending_notice',
        handoffSuggestion: false
      }
    });

      socketService.notifyUser(customerId.toString(), buildSocketPayload(notifyMessage));
    }

    res.status(200).json({
      code: 200,
      message: '已提交人工客服请求',
      data: {
        requestId: request._id,
        status: request.status,
        sessionMeta: buildSessionMeta(session)
      }
    });
  } catch (error) {
    console.error('确认转人工失败:', error);
    res.status(500).json({
      code: 500,
      message: '确认转人工失败'
    });
  }
});

/**
 * 用户撤销转人工
 * POST /api/customer-service/ai/handoff-cancel
 */
router.post('/ai/handoff-cancel', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    // 撤销权只给用户自己，人工客服不能代替用户撤销请求，避免客服端误操作改变用户意愿。
    if (role === 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '客服端不能撤销用户的转人工请求'
      });
    }

    const customerId = req.body?.customerId || userId;
    // 用户只能撤销自己的客服请求，不能通过传 customerId 操作别人的会话。
    if (userId.toString() !== customerId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '没有权限撤销该客服请求'
      });
    }

    const session = await findActiveSession(customerId);
    // 人工客服已经接入后，撤销会破坏人工会话状态，所以只允许在排队阶段撤销。
    if (!session || session.serviceMode === 'human' || session.handoffStatus === 'accepted') {
      return res.status(400).json({
        code: 400,
        message: '人工客服已接入，不能撤销'
      });
    }

    const request = await CustomerServiceRequestModel.findOne({
      customerId,
      status: 'pending'
    }).sort({ createdAt: -1 });

    // 如果既没有待处理请求，会话也不是 requested，说明当前没有可撤销的排队状态。
    if (!request && session.handoffStatus !== 'requested') {
      return res.status(400).json({
        code: 400,
        message: '当前没有待撤销的人工客服请求'
      });
    }

    if (request) {
      // 保留历史请求记录，只把状态改为 cancelled，后续客服工作台不会再把它当待处理请求展示。
      request.status = 'cancelled';
      request.updatedAt = new Date();
      await request.save();
    }

    // 撤销后恢复 AI 模式，用户后续继续发消息时可以重新走 RAG 智能客服。
    session.serviceMode = 'ai';
    session.aiStatus = 'enabled';
    session.handoffStatus = 'none';
    session.serviceId = null;
    session.lastMessage = '已撤销人工客服请求，智能客服继续为你服务。';
    session.lastMessageTime = new Date();
    session.updatedAt = new Date();
    await session.save();

    const noticeMessage = await createCustomerServiceMessage({
      sessionId: session._id,
      customerId,
      serviceId: null,
      senderId: null,
      receiverId: customerId,
      senderType: 'system',
      messageType: 'text',
      text: '已撤销人工客服请求，智能客服继续为你服务。',
      image: '',
      isRead: true,
      extra: {
        type: 'handoff_cancelled_notice'
      }
    });

    // 撤销动作也落成系统消息，保证用户刷新客服聊天页后仍能看到状态变化。
    socketService.notifyUser(customerId.toString(), buildSocketPayload(noticeMessage));

    res.status(200).json({
      code: 200,
      message: '已撤销人工客服请求',
      data: {
        requestId: request?._id || null,
        sessionMeta: buildSessionMeta(session),
        noticeMessage: serializeCustomerServiceMessage(noticeMessage, userId)
      }
    });
  } catch (error) {
    console.error('撤销转人工失败:', error);
    res.status(500).json({
      code: 500,
      message: '撤销转人工失败'
    });
  }
});

/**
 * 获取待处理的客服请求列表
 * GET /api/customer-service/requests
 */
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const role = req.user.role;

    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以查看请求列表'
      });
    }

    const requests = await CustomerServiceRequestModel.find({
      status: 'pending'
    })
      .populate('customerId', 'account name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      code: 200,
      data: requests.map((request) => ({
        id: request._id,
        customerId: request.customerId._id,
        customerName: request.customerId.name || request.customerId.account,
        customerAvatar: request.customerId.avatar,
        message: request.message,
        createdAt: request.createdAt
      }))
    });
  } catch (error) {
    console.error('获取客服请求列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取客服请求列表失败'
    });
  }
});

/**
 * 客服接受请求并绑定会话
 * POST /api/customer-service/accept-request/:requestId
 */
router.post('/accept-request/:requestId', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const serviceId = req.user.userId;
    const role = req.user.role;

    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以接受请求'
      });
    }

    const request = await CustomerServiceRequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({
        code: 404,
        message: '请求不存在'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该请求已被处理或已取消'
      });
    }

    let session = await findActiveSession(request.customerId);

    if (!session) {
      session = new CustomerServiceSessionModel({
        customerId: request.customerId,
        serviceId,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0,
        serviceMode: 'human',
        aiStatus: 'escalated',
        handoffStatus: 'accepted'
      });
    }

    session.serviceId = serviceId;
    session.serviceMode = 'human';
    session.aiStatus = 'escalated';
    session.handoffStatus = 'accepted';
    session.lastMessage = '人工客服已接入，请描述你的问题';
    session.lastMessageTime = new Date();
    session.updatedAt = new Date();
    await session.save();

    request.status = 'accepted';
    request.serviceId = serviceId;
    request.sessionId = session._id;
    request.updatedAt = new Date();
    await request.save();

    const message = await createCustomerServiceMessage({
      sessionId: session._id,
      customerId: request.customerId,
      serviceId,
      senderId: serviceId,
      receiverId: request.customerId,
      senderType: 'system',
      text: '人工客服已接入，请描述你的问题',
      image: '',
      messageType: 'text',
      isRead: true,
      extra: null
    });

    socketService.notifyUser(request.customerId.toString(), {
      type: 'notify',
      message: '人工客服已接入，请描述你的问题',
      messageId: message._id,
      sessionId: session._id,
      senderType: 'system'
    });

    res.status(200).json({
      code: 200,
      message: '接受请求成功',
      data: {
        requestId: request._id,
        sessionId: session._id,
        customerId: request.customerId,
        serviceId
      }
    });
  } catch (error) {
    console.error('接受请求失败:', error);
    res.status(500).json({
      code: 500,
      message: '接受请求失败'
    });
  }
});

/**
 * 结束会话
 * PUT /api/customer-service/session/:sessionId/close
 */
router.put('/session/:sessionId/close', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;
    const role = req.user.role;
    const customerId = req.body.customerId;

    const session = await CustomerServiceSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        code: 404,
        message: '会话不存在'
      });
    }

    if (role === 'customer_service' && session.serviceId?.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '只有该会话的客服可以结束会话'
      });
    }

    if (role !== 'customer_service' && session.customerId.toString() !== userId.toString()) {
      return res.status(403).json({
        code: 403,
        message: '只有该会话的客户可以结束会话'
      });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        code: 400,
        message: '该会话已结束'
      });
    }

    session.status = 'closed';
    session.updatedAt = new Date();
    await session.save();

    const message = await createCustomerServiceMessage({
      sessionId: session._id,
      customerId,
      serviceId: session.serviceId || null,
      senderId: userId,
      receiverId: customerId,
      senderType: 'system',
      text: '会话已结束',
      image: '',
      messageType: 'text',
      isRead: true,
      extra: null
    });

    socketService.notifyUser(customerId, {
      type: 'notify',
      message: '会话已结束',
      messageId: message._id,
      sessionId: session._id,
      senderType: 'system'
    });

    res.status(200).json({
      code: 200,
      message: '会话已结束',
      data: {
        sessionId: session._id,
        status: session.status
      }
    });
  } catch (error) {
    console.error('结束会话失败:', error);
    res.status(500).json({
      code: 500,
      message: '结束会话失败'
    });
  }
});

module.exports = router;
