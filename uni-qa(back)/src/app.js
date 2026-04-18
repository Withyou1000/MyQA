require('dotenv').config();

const db = require('./db/db');

//3. 连接 mongodb 服务                        数据库的名称

// 初始化云开发(已注释)
// const cloud = cloudbase.init({
//   env: process.env.CLOUDBASE_ENV_ID,
//   // 添加腾讯云密钥配置
//   secretId: process.env.TENCENTCLOUD_SECRETID,
//   secretKey: process.env.TENCENTCLOUD_SECRETKEY
// });

// 导出数据库实例供其他模块使用(已注释)
// const db = cloud.database();
// exports.db = db;
db(() => {
  const express = require('express');
  const cors = require('cors');
  // const cloudbase = require("@cloudbase/node-sdk");
  const authRoutes = require('./routes/auth');
  const questionRoutes = require('./routes/questions');
  const userRoutes = require('./routes/users');
  const uploadRouter = require('./routes/upload');
  const ratingsRouter = require('./routes/ratings');
  const applyRouter = require('./routes/apply');
  const chatRouter = require('./routes/chat');
  const refundRouter = require('./routes/refund');
  const customerServiceRouter = require('./routes/customerService');

  // 初始化 Express 应用
  const app = express();
  // 中间件配置
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // 健康检查接口
  app.get('/health', (req, res) => {
    res.status(200).json({
      code: 200,
      message: 'Service is healthy'
    });
  });
 app.use('/uploads', express.static('public/uploads'));
  // 路由配置
  app.use('/upload', uploadRouter);
  app.use('/auth', authRoutes);
  app.use('/question', questionRoutes);
  app.use('/user', userRoutes);
  app.use('/ratings', ratingsRouter);
  app.use('/apply', applyRouter);
  app.use('/chat', chatRouter);
  app.use('/refund', refundRouter);
  app.use('/customer-service', customerServiceRouter);

  // 错误处理中间件
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: err.message
    });
  });

  // 启动服务器
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`服务器运行在端口 ${PORT}`);
  });

  // 初始化WebSocket服务
  const socketService = require('./services/socket');
  socketService.initWebSocket(server);
})
