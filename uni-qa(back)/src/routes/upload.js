const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// 确保上传目录存在
const uploadDir = 'public/uploads/images';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 确保头像目录存在
const avatarDir = 'public/uploads/avatars';
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

//确保聊天图片目录存在
const chatDir = 'public/uploads/chat';
if (!fs.existsSync(chatDir)) {
  fs.mkdirSync(chatDir, { recursive: true });
}

// 确保评价图片目录存在
const rateDir = 'public/uploads/rate';
if (!fs.existsSync(rateDir)) {
  fs.mkdirSync(rateDir, { recursive: true });
}

// 确保问题图片目录存在
const questionDir = 'public/uploads/question';
if (!fs.existsSync(questionDir)) {
  fs.mkdirSync(questionDir, { recursive: true });
}

// 确保退款图片目录存在
const refundDir = 'public/uploads/refund';
if (!fs.existsSync(refundDir)) {
  fs.mkdirSync(refundDir, { recursive: true });
}

//默认先全都先存在images目录，然后通过压缩后存储在不同位置
// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// 文件过滤
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传JPEG、PNG、GIF或WebP格式的图片'), false);
  }
};

// 上传频率限制
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 20, // 最多20次请求
  message: {
    code: 429,
    message: '上传过于频繁，请稍后再试'
  },
  skip: (req) => {
    // VIP用户不受限制
    return req.user?.isVip;
  }
});

// 创建multer实例
const createUpload = (req) => {
  const maxFiles = req.user?.isVip ? 50 : (req.user ? 20 : 10);
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 5 * 1024 * 1024, // 限制5MB
      files: maxFiles
    }
  });
};

// 通用图片上传接口，接收单个文件
router.post('/image', authMiddleware, uploadLimiter, async (req, res) => {
  try {
    const upload = createUpload(req);

    upload.any()(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          code: 400,
          message: err.message
        });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          code: 400,
          message: '没有上传文件或文件格式不正确'
        });
      }
      // 只处理第一个文件
      const file = req.files[0];
      const webpFilename = path.parse(file.filename).name + '.webp';

      // 根据字段名确定存储目录
      let targetDir = uploadDir;
      let urlPath = '/uploads/images';

      switch (file.fieldname) {
        case 'chat':
          targetDir = chatDir;
          urlPath = '/uploads/chat';
          break;
        case 'avatar':
          targetDir = avatarDir;
          urlPath = '/uploads/avatars';
          break;
        case 'rate':
          targetDir = rateDir;
          urlPath = '/uploads/rate';
          break;
        case 'question':
          targetDir = questionDir;
          urlPath = '/uploads/question';
          break;
        case 'refund':
          targetDir = refundDir;
          urlPath = '/uploads/refund';
          break;
        default:
          targetDir = uploadDir;
          urlPath = '/uploads/images';
      }

      const webpPath = path.join(targetDir, webpFilename);

      // 压缩并转换为webp
      let sharpInstance = sharp(file.path).webp({ quality: 80 });

      // 如果是头像，添加尺寸调整
      if (file.fieldname === 'avatar') {
        sharpInstance = sharpInstance.resize({
          width: 200,
          height: 200,
          fit: sharp.fit.cover
        });
      }

      await sharpInstance.toFile(webpPath);

      // 删除临时原始文件
      fs.unlinkSync(file.path);

      // 生成访问URL
      const url = `${urlPath}/${webpFilename}`;

      res.status(200).json({
        code: 200,
        data: {
          url: url
        }
      });
    });
  } catch (error) {
    console.error('图片处理失败:', error);
    res.status(500).json({
      code: 500,
      message: '图片处理失败'
    });
  }
});

module.exports = router;
