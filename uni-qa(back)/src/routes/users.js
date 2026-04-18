const express = require('express');
const router = express.Router();
const UserModel = require('../models/UserModel');
const UserQAModel = require('../models/UserQAModel');
const QuestionModel = require('../models/QuestionModel');
const authMiddleware = require('../middleware/auth');

/**
 * 获取用户信息
 */
router.get('/info', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      code: 200,
      data: {   
        userId: user._id,
        account: user.account,  
        name: user.name,
        avatar: user.avatar,
        reputation: user.reputation,
        level: user.level,
        balance: user.balance,
        isVip: user.isVip,
        ratingScore: user.ratingScore,
        ratingCount: user.ratingCount,
        role: user.role || 'user'
      }
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取用户信息失败'
    });
  }
});

/**
 * 更新用户昵称
 */
router.put('/nickname', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '昵称不能为空'
      });
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      code: 200,
      message: '昵称更新成功',
      data: {
        userId: updatedUser._id,
        name: updatedUser.name
      }
    });
  } catch (error) {
    console.error('更新昵称失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新昵称失败'
    });
  }
});

/**
 * 更新用户头像
 */
router.put('/avatar', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        code: 400,
        message: '缺少头像URL'
      });
    }

    // 更新用户头像
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      code: 200,
      message: '头像更新成功',
      data: {
        userId: updatedUser._id,
        avatar: updatedUser.avatar
      }
    });
  } catch (error) {
    console.error('更新头像失败:', error);
    res.status(500).json({
      code: 500,
      message: '更新头像失败'
    });
  }
});

/**
 * 问题是否被用户回答
 */
router.get('/myquestions/:questionId', authMiddleware, async (req, res) => {
  try {
    const questionId = req.params.questionId;
    const hasRelate = await UserQAModel.exists({ questionId });
    
    return res.status(200).json({
      code: 200,
      data: {
        hasRelate: hasRelate
      }
    });
  }

  catch (error) {
    console.error('获取问题信息失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取问题信息失败'

    });
  }
});
/**
 * 获取我的提问列表
 */
router.get('/myquestions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const questions = await QuestionModel.find({ author: userId })
      .sort({ createTime: -1 })
      .select('title topic tags reward status createTime applicationCount');


    res.status(200).json({
      code: 200,
      data: {
        total: questions.length,
        list: questions.map(q => ({
          questionId: q._id,
          applicationCount: q.applicationCount,
          topic: q.topic,
          title: q.title,
          tags: q.tags,
          reward: q.reward,
          status: q.status,
          createTime: q.createTime
        }))
      }
    });
  } catch (error) {
    console.error('获取我的提问列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取我的提问列表失败'
    });
  }
});

/**
 * 获取我的回答列表
 */
router.get('/myanswers', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const userQAs = await UserQAModel.find({ userId })
      .populate({
        path: 'questionId',
        select: 'title topic tags reward status answerer createTime'
      });

    res.status(200).json({
      code: 200,
      data: {
        total: userQAs.length,
        list: userQAs.map(qa => ({
          questionId: qa.questionId._id,
          topic: qa.questionId.topic,
          title: qa.questionId.title,
          tags: qa.questionId.tags,
          reward: qa.questionId.reward,
          status: qa.questionId.status,
          answerer: qa.questionId.answerer,
          createTime: qa.questionId.createTime
        }))
      }
    });
  } catch (error) {
    console.error('获取我的回答列表失败:', error);
    res.status(500).json({
      code: 500,
      message: '获取我的回答列表失败'
    });
  }
});

  router.post('/', async (req, res) => {
    try {
      const { image } = req.body;
      // 验证image参数是否存在且格式正确
      if (!image || typeof image !== 'string' || !image.startsWith('data:image/png;base64,')) {
        return res.status(400).json({
          code: 400,
          message: '无效的图片数据格式，请提供以data:image/png;base64,开头的Base64编码图片'
        });
      }
      
      
      // 返回API响应结果
      res.status(200).json({
        code: 200,
          inference_results: [
            {
              class_num: 1,
              confidence: 0.92,
              label: "猫"
            },
            {
              class_num: 2,
              confidence: 0.85,
               label: "沙发"
            }
          ],
          processed_image: image
      });
    } catch (error) {
      console.error('图片识别失败:', error);
      res.status(500).json({
        code: 500,
        message: '图片识别失败，请稍后重试'
      });
    }
  });

module.exports = router;
