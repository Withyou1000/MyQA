const mongoose = require('mongoose');

const CustomerServiceSessionSchema = new mongoose.Schema({
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
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageTime: {
    type: Date,
    default: Date.now
  },
  unreadCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  serviceMode: {
    type: String,
    enum: ['ai', 'human', 'hybrid'],
    default: 'ai'
  },
  aiStatus: {
    type: String,
    enum: ['enabled', 'paused', 'escalated'],
    default: 'enabled'
  },
  handoffStatus: {
    type: String,
    enum: ['none', 'suggested', 'requested', 'accepted'],
    default: 'none'
  },
  handoffOfferedAt: {
    type: Date,
    default: null
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

module.exports = mongoose.model('CustomerServiceSession', CustomerServiceSessionSchema);
