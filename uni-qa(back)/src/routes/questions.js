const express = require('express');
const router = express.Router();
const QuestionModel = require('../models/QuestionModel');
const UserModel = require('../models/UserModel');
const authMiddleware = require('../middleware/auth');

// 统一序列化作者信息，保证列表页和详情页都能拿到头像。
const serializeQuestionAuthor = (author) => {
  if (!author) {
    return {
      _id: '',
      account: '',
      name: '',
      avatar: ''
    };
  }

  return {
    _id: author._id,
    account: author.account || '',
    name: author.name || '',
    avatar: author.avatar || ''
  };
};


/**
 * 搜索问题
 */
router.get('/search', async (req, res) => {
  try {
    const { keyword } = req.query;

    // 使用正则表达式进行模糊搜索，只返回pending状态的问题
    const questions = await QuestionModel.find({
      title: { $regex: keyword, $options: 'i' },
      status: 'pending'
    }).populate('author', 'account name avatar');

    res.status(200).json({
      code: 200,
      data: {
        total: questions.length,
        list: questions.map(q => ({
          questionId: q._id,
          title: q.title,
          topic: q.topic,
          tags: q.tags,
          reward: q.reward,
          status: q.status,
          createTime: q.createTime,
          author: serializeQuestionAuthor(q.author)
        }))
      }
    });
  } catch (error) {
    console.error('搜索问题失败:', error);
    res.status(500).json({
      code: 500,
      message: '搜索问题失败'
    });
  }
});

/**
 * 发布问题
 */
router.post('/questions', authMiddleware, async (req, res) => {
  try {
    const { title, content, topic, tags, reward, images } = req.body;
    const userId = req.user.userId;


    // 验证必填字段
    if (!title || !topic || !reward) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 检查用户余额是否足够
    const user = await UserModel.findById(userId);

    if (user.balance < reward) {
      return res.status(400).json({
        code: 400,
        message: '余额不足'
      });
    }

    // 创建问题
    const newQuestion = new QuestionModel({
      title,
      content: content || '',
      topic,
      tags: tags || [],
      reward,
      images: images || [],
      status: 'pending',
      createTime: new Date(),
      author: userId,
    });

    // 保存问题
    const savedQuestion = await newQuestion.save();
    const questionId = savedQuestion._id;


    // 扣除用户余额
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { balance: -reward }
    });

    res.status(200).json({
      code: 200,
      message: '发布成功',
      data: {
        questionId: questionId,
        title,
        content: content || '',
        createTime: newQuestion.createTime
      }
    });
  } catch (error) {
    console.error('发布问题失败:', error);
    res.status(500).json({
      code: 500,
      message: '发布问题失败'
    });
  }
});

/**
 * 获取分类下的问题列表
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { topic } = req.query;
    const query = { status: 'pending' };
    if (topic) {
      query.topic = topic;
    }

    const questions = await QuestionModel.find(query)
      .sort({ createTime: -1 })  // 按创建时间倒序排列
      .populate('author', 'account name avatar');

    res.status(200).json({
      code: 200,
      data: {
        total: questions.length,
        list: questions.map(q => ({
          questionId: q._id,
          title: q.title,
          topic: q.topic,
          tags: q.tags,
          reward: q.reward,
          status: q.status,
          createTime: q.createTime,
          author: serializeQuestionAuthor(q.author)
        }))
      }
    });
  } catch (error) {
    console.error('获取问题列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取问题列表失败'
    });
  }
});

/**
 * 获取问题详情
 */
router.get('/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await QuestionModel.findById(questionId).populate('author', 'account name avatar');

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    res.status(200).json({
      code: 200,
      data: {
        questionId: question._id,
        title: question.title,
        content: question.content || '',
        topic: question.topic,
        tags: question.tags,
        reward: question.reward,
        createTime: question.createdAt,
        images: question.images,
        author: serializeQuestionAuthor(question.author),
        status: question.status
      }
    });
  } catch (error) {
    console.error('获取问题详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取问题详情失败'
    });
  }
});



/**
 * 获取问题状态
 */
router.get('/status/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await QuestionModel.findById(questionId).select('status');

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    res.status(200).json({
      code: 200,
      data: {
        questionId,
        status: question.status
      }
    });
  } catch (error) {
    console.error('获取问题状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取问题状态失败'
    });
  }
});

/**
 * 删除问题
 */
router.delete('/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;

    // 验证问题是否存在
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    // 验证权限（只能删除自己的问题）
    if (question.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: '只有问题作者才能删除问题'
      });
    }

    // 验证问题状态（只能删除待处理的问题）
    if (question.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '只能删除待处理的问题'
      });
    }

    // 删除问题
    await QuestionModel.findByIdAndDelete(questionId);

    res.status(200).json({
      code: 200,
      message: '删除问题成功',
      data: {
        questionId
      }
    });
  } catch (error) {
    console.error('删除问题失败:', error);
    res.status(500).json({
      code: 500,
      message: '删除问题失败'
    });
  }
});

module.exports = router;
