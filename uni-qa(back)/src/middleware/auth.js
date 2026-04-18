const jwt = require('jsonwebtoken');

/**
 * 验证 JWT token 的中间件
 */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        code: 401,
        message: '请先登录'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 将解码后的用户信息添加到请求对象中
    next();
  } catch (error) {
    return res.status(401).json({
      code: 401,
      message: 'token过期'
    });
  }
};

module.exports = authMiddleware;
