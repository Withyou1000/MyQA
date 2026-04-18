//记录了 哪些用户申请了回答哪个问题
const mongoose = require('mongoose');

const UserQASchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
});

const UserQAModel = mongoose.model('UserQA', UserQASchema);

module.exports = UserQAModel;