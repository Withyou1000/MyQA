const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const RefundModel = require('../models/RefundModel');
const QuestionModel = require('../models/QuestionModel');
const UserModel = require('../models/UserModel');

/**
 * 提交退款申请
 * POST /api/refund
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { questionId, amount, reason, proofs, description, maxAmount } = req.body;
    const userId = req.user.userId;

    // 验证必填字段
    if (!questionId || !amount || !reason) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 验证问题是否存在
    const question = await QuestionModel.findById(questionId);
    if (!question) {
      return res.status(404).json({
        code: 404,
        message: '问题不存在'
      });
    }

    // 验证用户是否有权限申请退款（必须是问题作者）
    if (question.author.toString() !== userId) {
      return res.status(403).json({
        code: 403,
        message: '只有问题作者才能申请退款'
      });
    }

    // 验证是否已经存在针对该问题的退款申请
    const existingRefund = await RefundModel.findOne({ questionId });
    if (existingRefund) {
      return res.status(400).json({
        code: 400,
        message: '该问题已经提交过退款申请',
        data: {
          refundId: existingRefund._id,
          status: existingRefund.status,
          applyTime: existingRefund.applyTime
        }
      });
    }

    // 验证退款金额
    if (amount <= 0 || amount > maxAmount) {
      return res.status(400).json({
        code: 400,
        message: '退款金额无效'
      });
    }

    // 创建退款申请
    const newRefund = new RefundModel({
      questionId,
      userId,
      amount,
      maxAmount,
      reason,
      proofs: proofs || [],
      description,
      status: 'pending'
    });

    await newRefund.save();

    // 更新问题状态为退款中
    await QuestionModel.findByIdAndUpdate(questionId, {
      status: 'refunding'
    });

    res.status(200).json({
      code: 200,
      message: '退款申请提交成功',
      data: {
        refundId: newRefund._id,
        questionId,
        amount,
        status: newRefund.status,
        applyTime: newRefund.applyTime
      }
    });
  } catch (error) {
    console.error('提交退款申请失败:', error);
    res.status(500).json({
      code: 500,
      message: '提交退款申请失败'
    });
  }
});

/**
 * 获取用户的退款记录
 * GET /api/refund/user
 */
router.get('/user', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const refunds = await RefundModel.find({ userId })
      .populate('questionId', 'title topic status')
      .sort({ applyTime: -1 });

    res.status(200).json({
      code: 200,
      data: {
        total: refunds.length,
        list: refunds.map(refund => ({
          refundId: refund._id,
          questionId: refund.questionId._id,
          questionTitle: refund.questionId.title,
          questionTopic: refund.questionId.topic,
          questionStatus: refund.questionId.status,
          amount: refund.amount,
          maxAmount: refund.maxAmount,
          reason: refund.reason,
          status: refund.status,
          applyTime: refund.applyTime,
          processTime: refund.processTime
          
        }))
      }
    });
  } catch (error) {
    console.error('获取退款记录失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取退款记录失败'
    });
  }
});

/**
 * 通过问题ID获取退款记录
 * GET /api/refund/question/:questionId
 */
router.get('/detail/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;

    const refund = await RefundModel.findOne({ questionId })
      .populate('questionId', 'title topic status')
      

    if (!refund) {
      return res.status(404).json({
        code: 404,
        message: '退款记录不存在'
      });
    }

    // // 验证权限（只能查看自己的退款记录）
    // if (refund.userId.toString() !== userId) {
    //   return res.status(403).json({
    //     code: 403,
    //     message: '无权查看此退款记录'
    //   });
    // }

    res.status(200).json({
      code: 200,
      data: {
        isMine: refund.userId.toString() === userId,
        refundId: refund._id,
        questionId: refund.questionId._id,
        questionTitle: refund.questionId.title,
        questionTopic: refund.questionId.topic,
        questionStatus: refund.questionId.status,
        amount: refund.amount,
        reason: refund.reason,
        proofs: refund.proofs,
        description: refund.description,
        status: refund.status,
        applyTime: refund.applyTime,
        processTime: refund.processTime,
        processRemark: refund.processRemark,
      }
    });
  } catch (error) {
    console.error('获取退款详情失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取退款详情失败'
    });
  }
});


/**
 * 处理退款申请
 * PUT /api/refund/:refundId/process
 */
router.put('/:refundId/process', authMiddleware, async (req, res) => {
  try {
    const { refundId } = req.params;
    const { status, remark } = req.body;
    const userId = req.user.userId;

    // 验证状态
    if (!status || !['refunded', 'rejected'].includes(status)) {
      return res.status(400).json({
        code: 400,
        message: '无效的状态'
      });
    }

    const refund = await RefundModel.findById(refundId);
    if (!refund) {
      return res.status(404).json({
        code: 404,
        message: '退款记录不存在'
      });
    }

    // 只能处理待处理的退款
    if (refund.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该退款已经处理过了'
      });
    }

    // 更新退款状态
    refund.status = status;
    refund.processTime = new Date();
    refund.processorId = userId;
    refund.processRemark = remark;

    await refund.save();

    // 根据退款结果更新问题状态
    if (status === 'refunded') {
      // 退款批准，更新问题状态为已退款
      await QuestionModel.findByIdAndUpdate(refund.questionId, {
        status: 'refunded'
      });
      //这里添加退款到用户余额的逻辑
      await UserModel.findByIdAndUpdate(refund.userId, {
        $inc: { balance: refund.amount }
      });
    } else if (status === 'rejected') {
      // 退款拒绝，更新问题状态为退款失败
      await QuestionModel.findByIdAndUpdate(refund.questionId, {
        status: 'rejected'
      });
    }

    res.status(200).json({
      code: 200,
      message: '处理退款成功',
      data: {
        refundId: refund._id,
        status: refund.status,
        processTime: refund.processTime,
        processorId: refund.processorId,
        processRemark: refund.processRemark
      }
    });
  } catch (error) {
    console.error('处理退款失败:', error);
    res.status(500).json({
      code: 500,
      message: '处理退款失败'
    });
  }
});

/**
 * 取消退款申请
 * DELETE /api/refund/question/:questionId
 */
router.delete('/cancel/:questionId', authMiddleware, async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.userId;

    const refund = await RefundModel.findOne({ questionId });
    if (!refund) {
      return res.status(404).json({
        code: 404,
        message: '退款记录不存在'
      });
    }

    // // 验证权限（只能取消自己的退款申请）
    // if (refund.userId.toString() !== userId) {
    //   return res.status(403).json({
    //     code: 403,
    //     message: '无权取消此退款申请'
    //   });
    // }

    // 只能取消待处理的退款
    if (refund.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '该退款已经处理过了，无法取消'
      });
    }

    // 删除退款记录
    await RefundModel.findByIdAndDelete(refund._id);

    // 更新问题状态为answering
    await QuestionModel.findByIdAndUpdate(questionId, {
      status: 'answering'
    });

    res.status(200).json({
      code: 200,
      message: '取消退款申请成功',
      data: {
        refundId: refund._id,
        questionId
      }
    });
  } catch (error) {
    console.error('取消退款申请失败:', error);
    res.status(500).json({
      code: 500,
      message: '取消退款申请失败'
    });
  }
});

module.exports = router;
