const mongoose = require('mongoose');

const AgentMemorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  preferences: {
    topics: {
      type: [String],
      default: []
    },
    keywords: {
      type: [String],
      default: []
    },
    minReward: {
      type: Number,
      default: 0
    },
    avoidTopics: {
      type: [String],
      default: []
    }
  },
  summaries: {
    type: [String],
    default: []
  },
  contextTurns: {
    type: [
      {
        role: {
          type: String,
          enum: ['user', 'agent'],
          required: true
        },
        content: {
          type: String,
          default: ''
        },
        intent: {
          type: String,
          default: ''
        },
        resultSummary: {
          type: String,
          default: ''
        },
        resultCards: {
          type: [mongoose.Schema.Types.Mixed],
          default: []
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    default: []
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AgentMemory', AgentMemorySchema);
