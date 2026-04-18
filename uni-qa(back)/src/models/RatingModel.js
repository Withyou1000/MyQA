//导入 mongoose
const mongoose = require('mongoose');

//创建评价文档结构
const RatingSchema = new mongoose.Schema({
  // 评价者ID
  raterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 被评价者ID
  ratedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //问题ID
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  // 评价文字内容
  content: {
    type: String,
    required: true
  },
  // 评价图片数组
  images: {
    type: [String],
    default: []
  },
  // 几星评级（1-5星）
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  // 对方名称
  raterName: {
    type: String,
    required: true
  },
  // 对方头像
  raterAvatar: {
    type: String,
    default: ''
  },
  // 评价时间
  createTime: {
    type: Date,
    default: Date.now
  }
});

// 创建模型对象
const RatingModel = mongoose.model('Rating', RatingSchema);

// 暴露模型对象
module.exports = RatingModel;