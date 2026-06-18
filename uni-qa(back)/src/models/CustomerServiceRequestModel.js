const mongoose = require('mongoose');

const CustomerServiceRequestSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    // cancelled 用于用户在人工客服接入前撤销排队请求，保留记录但不再进入待处理列表。
    enum: ['pending', 'accepted', 'cancelled'],
    default: 'pending'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerServiceSession',
    default: null
  },
  message: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CustomerServiceRequest', CustomerServiceRequestSchema);
