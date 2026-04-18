const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  // 关联的问题ID
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  
  // 关联的申请退款的用户ID
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 退款金额
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  // 退款原因
  reason: {
    type: String,
    required: true
  },
  // 退款凭证（图片URL数组）
  proofs: {
    type: [String],
    default: []
  },
  // 补充描述
  description: {
    type: String,
    maxlength: 500
  },
  // 退款状态
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // 申请时间
  applyTime: {
    type: Date,
    default: Date.now
  },
  // 处理时间
  processTime: {
    type: Date
  },
  // 处理备注
  processRemark: {
    type: String
  }
});

module.exports = mongoose.model('Refund', RefundSchema);
