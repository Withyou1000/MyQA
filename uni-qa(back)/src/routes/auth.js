const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserModel = require('../models/UserModel');
const mongoose = require('mongoose');

/**
 * 用户注册
 */
router.post('/register', async (req, res) => {
  try {
    const { account, password } = req.body;

    // 验证必填字段
    if (!account || !password ) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 检查用户是否已存在
    const existingUser = await UserModel.findOne({ account: account });

    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '该账号已被注册'
      });
    }

    // 验证验证码
    // TODO: 实现验证码验证逻辑

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = new UserModel({
      account,
      password: hashedPassword,
      reputation: 100, // 初始信誉分
      level: 1,       // 初始等级
      balance: 100,   // 初始余额
      isVip: 0,      // 非VIP
      role: 'user',  // 默认普通用户
      createTime: new Date()
    });

    const savedUser = await newUser.save();
    const userId = savedUser._id;

    // 生成token
    const token = jwt.sign({ userId, account }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      code: 200,
      message: '注册成功',
      data: {
        userId,
        account,
        token
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      code: 500,
      message: '注册失败'
    });
  }
});

/**
 * 注册客服账号（仅管理员）
 */
router.post('/register-customer-service', async (req, res) => {
  try {
    const { account, password, name } = req.body;

    // 验证必填字段
    if (!account || !password) {
      return res.status(400).json({
        code: 400,
        message: '缺少必要参数'
      });
    }

    // 检查用户是否已存在
    const existingUser = await UserModel.findOne({ account });

    if (existingUser) {
      return res.status(400).json({
        code: 400,
        message: '该账号已被注册'
      });
    }

    // 密码加密
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建客服账号
    const newCustomerService = new UserModel({
      account,
      password: hashedPassword,
      name: name || '',
      reputation: 100,
      level: 1,
      balance: 100,
      isVip: 0,
      role: 'customer_service', // 客服角色
      createTime: new Date()
    });

    const savedUser = await newCustomerService.save();
    const userId = savedUser._id;

    // 生成token
    const token = jwt.sign({ userId, account }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(200).json({
      code: 200,
      message: '客服账号注册成功',
      data: {
        userId,
        account,
        name: savedUser.name,
        role: savedUser.role,
        token
      }
    });
  } catch (error) {
    console.error('注册客服账号失败:', error);
    res.status(500).json({
      code: 500,
      message: '注册客服账号失败'
    });
  }
});

/**
 * 发送验证码
 */
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        code: 400,
        message: '手机号不能为空'
      });
    }

    // TODO: 实现短信验证码发送逻辑

    res.status(200).json({
      code: 200,
      message: '发送成功',
      data: {
        expireTime: 300 // 5分钟有效期
      }
    });
  } catch (error) {
    console.error('发送验证码失败:', error);
    res.status(500).json({
      code: 500,
      message: '发送验证码失败'
    });
  }
});

/**
 * 用户登录
 */
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({
        code: 400,
        message: '账号和密码不能为空'
      });
    }

    // 查找用户
    const user = await UserModel.findOne({ account });

    if (!user) {
      return res.status(400).json({
        code: 400,
        message: '账号或密码错误'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        code: 400,
        message: '账号或密码错误'
      });
    }

    // 生成token
    const token = jwt.sign(
      { userId: user._id, account, role: user.role }, 
      process.env.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        userId: user._id,
        account: user.account,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        token,
        reputation: user.reputation
      }
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      code: 500,
      message: '登录失败'
    });
  }
});

module.exports = router;
