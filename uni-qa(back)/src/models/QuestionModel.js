// 导入 mongoose
const mongoose = require('mongoose');

// 创建问题文档结构
const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  tags: {
    type: [String],
    default: []
  },
  reward: {
    type: Number,
    required: true
  },
  images: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    default: 'pending'
  },
  createTime: {
    type: Date,
    default: Date.now
  },
  answerer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
});

// 创建模型对象
const QuestionModel = mongoose.model('Question', QuestionSchema);

// 暴露模型对象
module.exports = QuestionModel;