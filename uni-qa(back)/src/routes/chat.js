const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const socketService = require('../services/socket');
const authMiddleware = require('../middleware/auth');
const QuestionModel = require('../models/QuestionModel');
const ChatModel = require('../models/ChatModel');

const VALID_FILTERS = new Set(['all', 'unread', 'online']);

function truncateText(text, maxLength = 30) {
  if (typeof text !== 'string') return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function getUserDisplayName(user) {
  if (!user) return '';
  return user.name || user.account || '';
}

function getOtherUser(question, userId) {
  if (!question || !question.author || !question.answerer) return null;
  const authorId = question.author._id.toString();
  return authorId === userId ? question.answerer : question.author;
}

function getMessagePreview(message) {
  if (!message) return '';

  if (message.messageType === 'image') {
    return '[图片]';
  }

  if (message.text) {
    return truncateText(message.text);
  }

  if (message.messageType === 'apply_system' || message.messageType === 'refund_system') {
    return '[系统消息]';
  }

  return '';
}

function matchKeyword(chatItem, keyword) {
  if (!keyword) return true;

  const values = [
    chatItem.title,
    chatItem.topic,
    chatItem.lastMessage,
    chatItem.otherUser.name,
    chatItem.otherUser.account,
    ...(chatItem.tags || [])
  ];

  return values.some((value) => {
    if (typeof value !== 'string') return false;
    return value.toLowerCase().includes(keyword);
  });
}

router.get('/list', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const keyword = (req.query.keyword || '').trim().toLowerCase();
    const filter = VALID_FILTERS.has(req.query.filter) ? req.query.filter : 'all';
    const currentUserObjectId = new mongoose.Types.ObjectId(userId);

    const questionIds = await ChatModel.find({
      $or: [
        { senderId: userId },
        { recipientId: userId }
      ]
    }).distinct('questionId');

    if (!questionIds.length) {
      return res.status(200).json({
        code: 200,
        data: {
          summary: {
            totalCount: 0,
            unreadCount: 0,
            unreadSessionCount: 0,
            onlineCount: 0,
            filteredCount: 0
          },
          chatList: []
        }
      });
    }

    const [questions, chatSummaryList] = await Promise.all([
      QuestionModel.find({
        _id: { $in: questionIds }
      })
        .select('title topic tags reward author answerer')
        .populate('author', 'account name avatar level isVip role')
        .populate('answerer', 'account name avatar level isVip role'),
      ChatModel.aggregate([
        {
          $match: {
            questionId: { $in: questionIds }
          }
        },
        {
          $sort: {
            createTime: -1
          }
        },
        {
          $group: {
            _id: '$questionId',
            lastMessage: { $first: '$$ROOT' },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$recipientId', currentUserObjectId] },
                      { $eq: ['$isRead', false] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    const questionMap = new Map(
      questions.map((question) => [question._id.toString(), question])
    );

    const allChatList = chatSummaryList
      .map((chatSummary) => {
        const question = questionMap.get(chatSummary._id.toString());
        if (!question) return null;

        const otherUser = getOtherUser(question, userId);
        if (!otherUser) return null;

        const isOnline = socketService.isUserOnline(otherUser._id.toString());
        const lastMessage = chatSummary.lastMessage;

        return {
          questionId: question._id,
          title: question.title,
          topic: question.topic || '',
          tags: question.tags || [],
          reward: question.reward || 0,
          unreadCount: chatSummary.unreadCount || 0,
          lastMessage: getMessagePreview(lastMessage),
          lastMessageType: lastMessage.messageType,
          lastMessageTime: lastMessage.createTime,
          isAsker: question.author._id.toString() === userId,
          otherUser: {
            userId: otherUser._id,
            name: getUserDisplayName(otherUser),
            account: otherUser.account || '',
            avatar: otherUser.avatar || '',
            level: otherUser.level || 1,
            isVip: otherUser.isVip || 0,
            role: otherUser.role || 'user',
            online: isOnline
          }
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

    const summary = {
      totalCount: allChatList.length,
      unreadCount: allChatList.reduce((total, item) => total + item.unreadCount, 0),
      unreadSessionCount: allChatList.filter((item) => item.unreadCount > 0).length,
      onlineCount: allChatList.filter((item) => item.otherUser.online).length
    };

    const chatList = allChatList.filter((item) => {
      if (filter === 'unread' && item.unreadCount <= 0) return false;
      if (filter === 'online' && !item.otherUser.online) return false;
      return matchKeyword(item, keyword);
    });

    res.status(200).json({
      code: 200,
      data: {
        summary: {
          ...summary,
          filteredCount: chatList.length
        },
        chatList
      }
    });
  } catch (error) {
    console.error('获取聊天列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取聊天列表失败'
    });
  }
});

router.get('/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const decodedQuestionId = decodeURIComponent(questionId);
    const userId = req.user.userId;

    const question = await QuestionModel.findById(decodedQuestionId)
      .populate('author', 'avatar')
      .populate('answerer', 'avatar');

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    if (question.status === 'pending' || !question.answerer) {
      return res.status(403).json({
        code: 403,
        message: '问题没有回答，不能进入聊天'
      });
    }

    const isAsker = userId === question.author._id.toString();
    const isAnswerer = userId === question.answerer._id.toString();

    if (!isAnswerer && !isAsker) {
      return res.status(403).json({
        code: 403,
        message: '没有权限访问该聊天'
      });
    }

    await ChatModel.updateMany(
      {
        questionId: decodedQuestionId,
        recipientId: userId,
        isRead: false
      },
      {
        isRead: true
      }
    );

    const messages = await ChatModel.find({
      questionId: decodedQuestionId
    }).sort({ createTime: 1 });

    const otherAvatar = isAsker ? (question.answerer.avatar || '') : (question.author.avatar || '');

    res.status(200).json({
      code: 200,
      data: {
        title: question.title,
        isAsker,
        otherAvatar,
        chatMessages: messages.map((message) => ({
          messageId: message._id,
          text: message.text || '',
          image: message.image || '',
          createTime: message.createTime,
          messageType: message.messageType,
          isMine: message.senderId.toString() === userId
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

router.post('/:questionId/message', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { text, image, messageType } = req.body;
    const userId = req.user.userId;

    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    if (question.status === 'pending' || !question.answerer) {
      return res.status(403).json({
        code: 403,
        message: '问题没有回答，不能发送消息'
      });
    }

    const isAsker = userId === question.author.toString();
    const isAnswerer = userId === question.answerer.toString();

    if (!isAsker && !isAnswerer) {
      return res.status(403).json({
        code: 403,
        message: '没有权限发送该聊天消息'
      });
    }

    const authorId = question.author.toString();
    const senderId = userId;
    let recipientId;

    if (userId === authorId) {
      recipientId = question.answerer.toString();
    } else {
      recipientId = authorId;
    }

    const newMessage = new ChatModel({
      questionId,
      senderId,
      recipientId,
      text: typeof text === 'string' ? text : '',
      image: image || '',
      messageType,
      createTime: new Date(),
      isRead: false
    });

    const savedMessage = await newMessage.save();

    socketService.notifyUser(senderId, {
      type: 'message_sent',
      messageId: savedMessage._id,
      questionId
    });
    socketService.notifyUser(recipientId, {
      type: 'message_received',
      messageId: savedMessage._id,
      questionId,
      text: typeof text === 'string' ? text : '',
      image: image || '',
      messageType
    });

    res.status(200).json({
      code: 200,
      message: '发送成功',
      data: {
        messageId: savedMessage._id,
        createTime: savedMessage.createTime
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

module.exports = router;
