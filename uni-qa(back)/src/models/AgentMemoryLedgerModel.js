const mongoose = require('mongoose');

const TimeRangeSchema = new mongoose.Schema(
  {
    from: {
      type: Date,
      default: Date.now
    },
    to: {
      type: Date,
      default: null
    }
  },
  { _id: false }
);

const AgentMemoryLedgerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  runId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AgentTrace',
    default: null,
    index: true
  },
  eventType: {
    type: String,
    enum: [
      'memory_read',
      'memory_write',
      'memory_ignore',
      'memory_forget',
      'view_refresh',
      'tool_success'
    ],
    required: true,
    index: true
  },
  memoryType: {
    type: String,
    enum: ['preference', 'constraint', 'context', 'tool_success', 'system'],
    default: 'system',
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  reason: {
    type: String,
    default: ''
  },
  validTime: {
    type: TimeRangeSchema,
    default: () => ({ from: new Date(), to: null })
  },
  transactionTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  actor: {
    type: String,
    enum: ['agent', 'user', 'system'],
    default: 'agent'
  }
});

module.exports = mongoose.model('AgentMemoryLedger', AgentMemoryLedgerSchema);
