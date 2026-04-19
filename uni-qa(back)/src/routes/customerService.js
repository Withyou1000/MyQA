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

function getDisplayName(user) {
  if (!user) return '';
  return user.name || user.account || '匿名用户';
}

function getAvatar(user) {
  return user?.avatar || '';
}

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

function getLastMessagePreview(messageType, text, transactionInfo) {
  if (messageType === 'image') return '[图片]';
  if (messageType === 'transaction') {
    return `[交易] ${transactionInfo?.title || '交易咨询'}`;
  }
  return text || '';
}

/**
 * 获取客服会话列表
 * GET /api/customer-service/sessions
 */
router.get('/sessions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    // 验证是否为客服角色
    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以查看会话列表'
      });
    }

    // 获取客服的所有会话
    const sessions = await CustomerServiceSessionModel.find({
      serviceId: userId,
      status: 'active'
    })
      .populate('customerId', 'account name avatar')
      .sort({ lastMessageTime: -1 });

    res.status(200).json({
      code: 200,
      data: sessions.map(session => ({
        id: session._id,
        customerId: session.customerId._id,
        customerName: session.customerId.name || session.customerId.account,
        customerAvatar: session.customerId.avatar,
        lastMessage: session.lastMessage,
        lastMessageTime: session.lastMessageTime,
        unreadCount: session.unreadCount
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

    // 获取聊天记录
    const messages = await CustomerServiceMessageModel.find({
      customerId
    })
      .sort({ createdAt: 1 });

    // 获取客户信息
    const customer = await UserModel.findById(customerId).select('account name avatar');

    res.status(200).json({
      code: 200,
      data: {
        customerInfo: {
          id: customer._id,
          name: customer.name || customer.account,
          avatar: customer.avatar
        },
        messages: messages.map(msg => ({
          id: msg._id,
          text: msg.text,
          image: msg.image,
          messageType: msg.messageType,
          transactionInfo: msg.transactionInfo || null,
          senderId: msg.senderId,
          receiverId: msg.receiverId,
          createdAt: msg.createdAt,
          isMine: msg.senderId.toString() === userId.toString()
        }))
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
 * 发送消息
 * POST /api/customer-service/message/:customerId
 */
router.post('/message/:customerId', authMiddleware, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { text, image, messageType, transactionInfo } = req.body;
    const userId = req.user.userId;
    const role = req.user.role;
    const senderId = userId;
    let receiverId = null;
    const normalizedTransactionInfo =
      messageType === 'transaction' && transactionInfo
        ? {
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
          }
        : null;


    // // 验证是否为客服角色
    // if (role !== 'customer_service') {
    //   return res.status(403).json({
    //     code: 403,
    //     message: '只有客服可以发送消息'
    //   });
    // }

    // // 验证消息类型
    // if (!messageType || !['text', 'image'].includes(messageType)) {
    //   return res.status(400).json({
    //     code: 400,
    //     message: '无效的消息类型'
    //   });
    // }

    // 验证必填字段
    // if (messageType === 'text' && !text) {
    //   return res.status(400).json({
    //     code: 400,
    //     message: '文本消息不能为空'
    //   });
    // }

    // if (messageType === 'image' && !image) {
    //   return res.status(400).json({
    //     code: 400,
    //     message: '图片URL不能为空'
    //   });
    // }

    // 获取会话
    let session = await CustomerServiceSessionModel.findOne({
      customerId,
      status: 'active'
    });
    //如果会话激活，存在客服，更新会话的最后消息
    if (session) {
      // 更新会话的最后消息
      session.lastMessage = getLastMessagePreview(messageType, text, normalizedTransactionInfo);
      session.lastMessageTime = new Date();
      if (userId.toString() === customerId.toString()) {
        session.unreadCount += Array.isArray(image) ? image.length : 1;
      }
      await session.save();
      //有会话的话就有接收者
      receiverId = userId === customerId ? session.serviceId : customerId
    }


    if (Array.isArray(image)) {
      // 为每张图片创建一个消息
      for (const img of image) {
        const msg = new CustomerServiceMessageModel({
          sessionId: session?._id || null,
          customerId,
          serviceId: session?.serviceId || null,
          text: text || '',
          image: img,
          messageType,
          transactionInfo: normalizedTransactionInfo,
          senderId,
          receiverId,
          isRead: true
        });
        await msg.save();

        // 发送WebSocket通知
        if (receiverId) {
          socketService.notifyUser(receiverId.toString(), {
            type: 'message_received',
            messageId: msg._id,
            text: text || '',
            image: img,
            messageType,
            transactionInfo: normalizedTransactionInfo
          });
        }
      }
    } else {

      // 创建消息记录
      const message = new CustomerServiceMessageModel({
        sessionId: session?._id || null,
        customerId,
        serviceId: session?.serviceId || null,
        text: text || '',
        image: image || '',
        messageType,
        transactionInfo: normalizedTransactionInfo,
        senderId,
        receiverId,
        isRead: true
      });

      await message.save();

      // // 发送WebSocket通知
      // socketService.notifyUser(senderId, {
      //   type: 'message_sent',
      //   messageId: message._id,
      // });

      //注意！！！！！！ 从数据库取出的id一开始是对象要转换为字符串
      if (receiverId) {
        socketService.notifyUser(receiverId.toString(), {
          type: 'message_received',
          messageId: message._id,
          text: typeof text === 'string' ? text : '',
          image: image || '',
          messageType,
          transactionInfo: normalizedTransactionInfo
        });
      }
    }



    res.status(200).json({
      code: 200,
      data: {
        // id: message._id,
        status: 'sent'
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
 * 标记会话为已读
 * PUT /api/customer-service/session/:sessionId/read
 */
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

router.put('/session/:sessionId/read', authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const serviceId = req.user.userId;
    const role = req.user.role;

    // 验证是否为客服角色
    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以标记已读'
      });
    }

    // 更新会话的未读数
    const session = await CustomerServiceSessionModel.findByIdAndUpdate(
      sessionId,
      { unreadCount: 0 },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({
        code: 404,
        message: '会话不存在'
      });
    }

    // 更新该会话中未读的消息
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
    console.error('标记会话为已读失败:', error);
    res.status(500).json({
      code: 500,
      message: '标记会话为已读失败'
    });
  }
});


/**
 * 用户申请人工客服
 * POST /api/customer-service/request
 */
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    // 检查是否已有待处理的请求
    const existingRequest = await CustomerServiceRequestModel.findOne({
      customerId: userId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({
        code: 400,
        message: '您已有待处理的客服请求，请勿重复提交'
      });
    }

    // 创建客服请求
    const request = new CustomerServiceRequestModel({
      customerId: userId,
      status: 'pending'
    });

    await request.save();

    res.status(200).json({
      code: 200,
      message: '客服请求已发送',
      data: {
        requestId: request._id,
        status: request.status
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
 * 获取待处理的客服请求列表
 * GET /api/customer-service/requests
 */
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    // 验证是否为客服角色
    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以查看请求列表'
      });
    }

    // 获取待处理的请求
    const requests = await CustomerServiceRequestModel.find({
      status: 'pending'
    })
      .populate('customerId', 'account name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      code: 200,
      data: requests.map(request => ({
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

    // 验证是否为客服角色
    if (role !== 'customer_service') {
      return res.status(403).json({
        code: 403,
        message: '只有客服可以接受请求'
      });
    }

    // 查找请求
    const request = await CustomerServiceRequestModel.findById(requestId);
    if (!request) {
      return res.status(404).json({
        code: 404,
        message: '请求不存在'
      });
    }

    // 检查请求状态
    if (request.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该请求已被处理或已取消'
      });
    }

    // 检查是否已有会话
    let session = await CustomerServiceSessionModel.findOne({
      customerId: request.customerId,
      status: 'active'
    });

    if (!session) {
      // 创建新会话
      session = new CustomerServiceSessionModel({
        customerId: request.customerId,
        serviceId,
        lastMessage: '',
        lastMessageTime: new Date(),
        unreadCount: 0
      });
      await session.save();
    }

    session.lastMessage = '客服已赶来，请描述你的问题';
    session.lastMessageTime = new Date();
    await session.save();

    // 更新请求状态
    request.status = 'accepted';
    request.serviceId = serviceId;
    request.sessionId = session._id;
    request.updatedAt = new Date();
    await request.save();

    // 创建消息记录
    const message = new CustomerServiceMessageModel({
      sessionId: session?._id || null,
      customerId: request.customerId,
      serviceId: session?.serviceId || null,
      text: '客服已赶来，请描述你的问题',
      messageType: 'text',
      senderId: serviceId,
      receiverId: request.customerId._id,
      isRead: true
    });

    await message.save();

    socketService.notifyUser(request.customerId.toString(), {
      type: 'notify',
      message: '客服已赶来，请描述你的问题',
      messageId: message._id,
      sessionId: session._id,
    });






    res.status(200).json({
      code: 200,
      message: '接受请求成功',
      data: {
        requestId: request._id,
        sessionId: session._id,
        customerId: request.customerId,
        serviceId: serviceId
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

    // 查找会话
    const session = await CustomerServiceSessionModel.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        code: 404,
        message: '会话不存在'
      });
    }

    // 验证权限（只有会话相关的客户或客服可以结束会话）
    if (role === 'customer_service' && session.serviceId.toString() !== userId.toString()) {
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

    // 检查会话状态
    if (session.status !== 'active') {
      return res.status(400).json({
        code: 400,
        message: '该会话已结束'
      });
    }

    // 更新会话状态
    session.status = 'closed';
    session.updatedAt = new Date();
    await session.save();

    // 创建消息记录
    const message = new CustomerServiceMessageModel({
      sessionId: session?._id || null,
      customerId,
      serviceId: session?.serviceId || null,
      text: '会话已结束',
      messageType: 'text',
      senderId: userId,
      isRead: true
    });

    await message.save();

    socketService.notifyUser(customerId, {
      type: 'notify',
      message: '会话已结束',
      messageId: message._id,
      sessionId: session._id,
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
