const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const RatingModel = require('../models/RatingModel');
const QuestionModel = require('../models/QuestionModel');
const UserModel = require('../models/UserModel');
const authMiddleware = require('../middleware/auth');

/**
 * 创建评价
 * POST /api/ratings
 */
router.post('/addrating', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const raterId = req.user.userId;
        const { questionId, content, images, score, account, avatar } = req.body;


        // 验证评分是否在1-5之间
        if (score < 1 || score > 5 || !Number.isInteger(score)) {
            return res.status(400).json({
                code: 400,
                message: '评分必须是1-5之间的整数'
            });
        }
        // 通过问题ID查找问题信息，并关联查询回答者信息
        const question = await QuestionModel.findById(questionId).populate('answerer', '_id');
        question.status = 'rated';
        // 保存问题
        await question.save();

        if (!question) {
            return res.status(404).json({
                code: 404,
                message: '未找到该问题'
            });
        }

        // 获取回答者ID和账号
        const ratedId = question.answerer?._id;
        const raterName = account;
        const raterAvatar = avatar;


        // 创建评价
        const rating = new RatingModel({
            questionId,
            ratedId,
            content,
            images,
            score,
            raterId,
            raterName,
            raterAvatar
        });

        await rating.save();

        // 更新被评价者的评分相关字段
        const user = await UserModel.findById(ratedId);
        if (user) {
            // 计算新的好评率
            const newRatingCount = user.ratingCount + 1;
            // 将5分制评分转换为百分制（乘以20）
            const newRatingScore = Math.round((user.ratingScore * user.ratingCount + score * 20) / newRatingCount);

            await UserModel.findByIdAndUpdate(ratedId, {
                ratingScore: newRatingScore,
                ratingCount: newRatingCount
            });
        }

        res.status(200).json({
            code: 200,
            message: '评价创建成功',
            data: {
                ratingId: rating._id
            }
        });
    } catch (error) {
        // 发生错误，回滚事务
        await session.abortTransaction();
        console.error('创建评价失败:', error);
        res.status(500).json({
            code: 500,
            message: '创建评价失败'
        });
    }
    finally {
        session.endSession();
    }
});

/**
 * 通过被评价者id获取所有评价
 * GET /ratings
 */
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        // 查询评价总数
        const total = await RatingModel.countDocuments({ ratedId: req.params.userId });

        // 查询评价列表（移除了分页和populate关联查询）
        const ratings = await RatingModel.find({ ratedId: req.params.userId })
            .sort({ createTime: -1 });

        // 格式化返回数据
        const formattedRatings = ratings.map(rating => ({
            ratingId: rating._id,
            content: rating.content,
            images: rating.images,
            score: rating.score,
            raterName: rating.raterName,
            raterAvatar: rating.raterAvatar,
            createTime: rating.createTime
        }));

        // 获取被评价者信息
        const ratedUser = await UserModel.findById(req.params.userId, 'account reputation ratingScore');

        res.status(200).json({
            code: 200,
            data: {
                total,
                list: formattedRatings,
                userInfo: {
                    userName: ratedUser.account,
                    reputation: ratedUser.reputation,
                    ratingScore: ratedUser.ratingScore
                }
            }
        });

    } catch (error) {
        console.error('获取评价列表失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取评价列表失败'
        });
    }
});

/**
 * 通过问题ID获取评价
 * GET /api/ratings/question/:questionId
 */
router.get('/question/:questionId', authMiddleware, async (req, res) => {
    try {
        const { questionId } = req.params;

        // 查找该问题的评价
        const rating = await RatingModel.findOne({ questionId });

        if (!rating) {
            return res.status(404).json({
                code: 404,
                message: '未找到该问题的评价'
            });
        }

        res.status(200).json({
            code: 200,
            data: {
                content: rating.content,
                images: rating.images,
                score: rating.score,
                createTime: rating.createTime
            }
        });
    } catch (error) {
        console.error('获取评价失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取评价失败'
        });
    }
});

module.exports = router;