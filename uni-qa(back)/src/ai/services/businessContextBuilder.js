const QuestionModel = require('../../models/QuestionModel');
const RefundModel = require('../../models/RefundModel');
const CustomerServiceMessageModel = require('../../models/CustomerServiceMessageModel');

/**
 * 构建 AI 回复所需的实时业务上下文。
 * 这里只查用户交易、退款和最近客服消息，不放 serviceMode、aiStatus 这类后端流程控制状态。
 */
async function buildBusinessContext({ customerId }) {
  const [recentQuestions, recentRefunds, recentMessages] = await Promise.all([
    QuestionModel.find({
      $or: [{ author: customerId }, { answerer: customerId }]
    })
      .sort({ createTime: -1 })
      .limit(5)
      .select('title topic tags reward status createTime author answerer'),
    RefundModel.find({ userId: customerId })
      .sort({ applyTime: -1 })
      .limit(5)
      .select('questionId amount reason status applyTime processRemark'),
    CustomerServiceMessageModel.find({ customerId })
      .sort({ createdAt: -1 })
      .limit(10)
  ]);

  return {
    recentTransactions: recentQuestions.map((question) => ({
      questionId: question._id,
      title: question.title || '',
      topic: question.topic || '',
      tags: question.tags || [],
      reward: question.reward || 0,
      status: question.status || 'pending',
      createTime: question.createTime
    })),
    refundSnapshots: recentRefunds.map((refund) => ({
      refundId: refund._id,
      questionId: refund.questionId,
      amount: refund.amount,
      reason: refund.reason,
      status: refund.status,
      applyTime: refund.applyTime,
      processRemark: refund.processRemark || ''
    })),
    recentMessages: recentMessages
      .reverse()
      .map((message) => ({
        senderType: message.senderType || 'user',
        messageType: message.messageType,
        text: message.text || '',
        createdAt: message.createdAt
      }))
  };
}

module.exports = {
  buildBusinessContext
};
