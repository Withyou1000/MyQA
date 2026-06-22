const mongoose = require('mongoose');

const AgentTraceStepSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'plan',
        'tool_call',
        'observation',
        'evaluation',
        'react_reason',
        'react_action',
        'react_observation',
        'memory',
        'memory_read',
        'memory_policy',
        'memory_view',
        'chat',
        'clarification',
        'decision',
        'final',
        'error'
      ],
      required: true
    },
    title: {
      type: String,
      default: ''
    },
    toolName: {
      type: String,
      default: ''
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    output: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    summary: {
      type: String,
      default: ''
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const AgentTraceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  goal: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['running', 'waiting_confirmation', 'waiting_clarification', 'completed', 'failed'],
    default: 'running'
  },
  plan: {
    type: [String],
    default: []
  },
  steps: {
    type: [AgentTraceStepSchema],
    default: []
  },
  finalAnswer: {
    type: String,
    default: ''
  },
  resultCards: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  actionCards: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  memorySnapshot: {
    type: mongoose.Schema.Types.Mixed,
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

module.exports = mongoose.model('AgentTrace', AgentTraceSchema);
