const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  maxAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  proofs: {
    type: [String],
    default: [],
  },
  description: {
    type: String,
    default: '',
    maxlength: 500,
  },
  status: {
    type: String,
    enum: ['pending', 'refunded', 'rejected'],
    default: 'pending',
  },
  applyTime: {
    type: Date,
    default: Date.now,
  },
  processTime: {
    type: Date,
    default: null,
  },
  processorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  processRemark: {
    type: String,
    default: '',
  },
});

module.exports = mongoose.model('Refund', RefundSchema);
