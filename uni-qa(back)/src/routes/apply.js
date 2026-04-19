const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const QuestionModel = require('../models/QuestionModel');
const UserQAModel = require('../models/UserQAModel');
const ApplyAcceptModel = require('../models/ApplyAcceptModel');
const UserModel = require('../models/UserModel');
const socketService = require('../services/socket');
/**
 * 申请回答问题
 * POST /api/questions/:questionId/apply-answer
 */
router.post('/:questionId/apply-answer', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;


    // 2. 检查用户是否已经申请过该问题
    const existingApply = await UserQAModel.findOne({
      userId,
      questionId
    });

    if (existingApply) {
      return res.status(400).json({
        code: 400,
        message: '您已申请回答该问题'
      });
    }

    // 3. 创建申请记录
    const newApply = new UserQAModel({
      userId,
      questionId,
    });

    await newApply.save();

    // 4. 增加问题的申请数量
    await QuestionModel.findByIdAndUpdate(questionId, {
      $inc: { applicationCount: 1 }
    });

    res.status(200).json({
      code: 200,
      message: '申请成功',
      data: {
        applyId: newApply._id,
        questionId,
        applyTime: newApply.applyTime
      }
    });
  } catch (error) {
    console.error('申请回答问题失败:', error);
    res.status(500).json({
      code: 500,
      message: '申请回答问题失败'
    });
  }
});

/**
 * 接受申请（设置回答者）
 * PATCH /api/questions/:questionId/apply/:applicantId/accept
 */
router.patch('/:questionId/apply/:applicantId/accept', authMiddleware, async (req, res) => {
  try {
    const { questionId, applicantId } = req.params;
    const userId = req.user.userId;

    // 1. 检查问题是否存在
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    // 2. 验证是否为问题作者
    if (question.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: '只有问题作者可以接受申请'
      });
    }

    // 3. 检查申请是否存在
    const application = await UserQAModel.findOne({
      userId: applicantId,
      questionId
    });

    if (!application) {
      return res.status(404).json({
        code: 404,
        message: '申请不存在'
      });
    }

    // 4. 设置问题的回答者
    question.answerer = applicantId;
    question.status = 'answering'; // 更新问题状态为回答中

    await question.save();


    res.status(200).json({
      code: 200,
      message: '已接受申请并设置回答者',
      data: {
        questionId,
        answererId: applicantId,
        status: question.status
      }
    });
  } catch (error) {
    console.error('接受申请失败:', error);
    res.status(500).json({
      code: 500,
      message: '接受申请失败'
    });
  }
});


/**
 * 是否采纳回答
 */
router.post('/accept/:questionId/:accept', authMiddleware, async (req, res) => {
  try {
    const { questionId, accept } = req.params;
    const userId = req.user.userId;
    const question = await QuestionModel.findById(questionId);

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    // 验证是否是提问者
    if (question.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: '只有提问者可以采纳回答'
      });
    }
    if (accept === 'true') {
      question.status = 'accepted';
    } else {
      question.status = 'rejected';
    }

    await question.save();

    // 合并查询回答者和更新余额的操作
    let answerer;
    if (question.status === 'accepted') {
      answerer = await UserModel.findByIdAndUpdate(
        question.answerer,  // 回答者ID
        { $inc: { balance: question.reward } },  // 增加余额
        { new: true, fields: 'balance _id' }  // 返回更新后的文档，只包含balance和_id字段
      );
    }

    res.status(200).json({
      code: 200,
      message: '操作成功',
      data: {
        questionId,
        acceptTime: new Date(),
        answerer: answerer ? {
          userId: answerer._id,
          balanceAfter: answerer.balance
        } : null
      }
    });
  } catch (error) {
    console.error('采纳回答失败:', error);
    res.status(500).json({
      code: 500,
      message: '采纳回答失败'
    });
  }
});

/**
 * 申请采纳回答
 */
router.post('/apply-accept/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const { name: answererName } = req.body;

    // 先检查是否已有记录
    const existingRecord = await ApplyAcceptModel.findOne({ questionId });

    if (existingRecord) {
      return res.status(200).json({
        code: 200,
        applied: false,
        message: '您已申请采纳该问题'
      });
    }
    // 查询问题并获取作者信息
    const question = await QuestionModel.findById(questionId).populate('author', '_id');

    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    const authorId = question.author._id.toString();

    // 通过socketService通知作者
    socketService.notifyUser(authorId, {
      type: 'apply_accept',
      questionId,
      answererName: answererName || '匿名用户'
    });

    // 保存申请记录到数据库
    await ApplyAcceptModel.create({
      questionId,
      authorId,
      answererName: answererName || '匿名用户',
      finish: false
    });

    res.status(200).json({
      code: 200,
      message: '申请已发送',
      applied: true,
      data: {
        questionId,
        authorId,
        answererName: answererName || '匿名用户'
      }
    });
  } catch (error) {
    console.error('申请采纳回答失败:', error);
    res.status(500).json({
      code: 500,
      message: '申请采纳回答失败'
    });
  }
});

/**
 * 验证申请采纳状态
 * GET /api/questions/apply-accept/verify/:authorId
 */
router.get('/apply-accept/verify/:authorId', async (req, res) => {
  try {
    const { authorId } = req.params;

    const Applies = await ApplyAcceptModel.find({
      authorId,
      finish: false
    });

    if (Applies.length > 0) {
      res.status(200).json({
        code: 200,
        data: Applies.map(apply => ({
          questionId: apply.questionId,
          answererName: apply.answererName,
          completedAt: apply.createdAt
        }))
      });
    } else {
      res.status(200).json({
        code: 200,
        data: {
        }
      });
    }
  } catch (error) {
    console.error('验证申请采纳状态失败:', error);
    res.status(500).json({
      code: 500,
      message: '验证申请采纳状态失败'
    });
  }
});

/**
 * 标记申请为已完成
 * PATCH /api/questions/apply-accept/:id/finish
 */
router.patch('/apply-accept/:id/finish', async (req, res) => {
  try {
    const { id } = req.params;

    await ApplyAcceptModel.findOneAndUpdate(
      { questionId: id },  // 查询条件
      { finish: true }     // 更新内容
    );

    res.status(200).json({
      code: 200,
      message: '已标记为完成'
    });
  } catch (error) {
    console.error('标记完成失败:', error);
    res.status(500).json({
      code: 500,
      message: '标记完成失败'
    });
  }
});

/**
 * 通过问题ID查询所有申请回答的用户
 * GET /api/questions/:questionId/applicants
 */
router.get('/:questionId/applicants', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;

    // 1. 检查问题是否存在
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    // 2. 验证权限 - 只有问题作者可以查看申请者列表
    if (question.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: '只有问题作者可以查看申请者列表'
      });
    }

    // 3. 查询所有申请回答该问题的用户
    const applications = await UserQAModel.find({ questionId })
      .populate('userId', 'account avatar ratingScore'); // 关联查询用户信息，只返回account和avatar字段


    // 4. 格式化返回数据
    const applicants = applications.map(app => ({
      applicantId: app.userId._id,
      userName: app.userId.account,
      avatar: app.userId.avatar,
      ratingScore: app.userId.ratingScore,
    }));

    res.status(200).json({
      code: 200,
      message: '查询成功',
      data: {
        questionId,
        total: applicants.length,
        applicants
      }
    });
  } catch (error) {
    console.error('查询申请者列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '查询申请者列表失败'
    });
  }
});

module.exports = router