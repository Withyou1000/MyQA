const mongoose = require('mongoose');

const AgentMemoryViewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  profileView: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  recentContextView: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  timelineView: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  toolSuccessView: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  refreshedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AgentMemoryView', AgentMemoryViewSchema);
