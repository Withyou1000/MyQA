//导入 mongoose
const mongoose = require('mongoose');
//创建文档的结构对象
//设置集合中文档的属性以及属性值的类型
const UserSchema = new mongoose.Schema({
  account: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  reputation: {
    type: Number,
    default: 100
  },
  ratingScore: {
    type: Number,
    default: 0,
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  balance: {
    type: Number,
    default: 100
  },
  isVip: {
    type: Number,
    default: 0
  },
  name: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'customer_service', 'admin'],
    default: 'user'
  },
  createTime: {
    type: Date,
    default: Date.now
  }
});
//创建模型对象  对文档操作的封装对象
let UserModel = mongoose.model('User', UserSchema);

//暴露模型对象
module.exports = UserModel;
