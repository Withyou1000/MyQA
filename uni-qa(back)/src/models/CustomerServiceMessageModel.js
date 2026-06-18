const mongoose = require('mongoose');

const CustomerServiceMessageSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerServiceSession',
    default: null
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  text: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  transactionInfo: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'transaction'],
    required: true
  },
  senderType: {
    type: String,
    enum: ['user', 'ai', 'human_service', 'system'],
    default: 'user'
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  isRead: {
    type: Boolean,
    default: false
  },
  extra: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CustomerServiceMessage', CustomerServiceMessageSchema);
