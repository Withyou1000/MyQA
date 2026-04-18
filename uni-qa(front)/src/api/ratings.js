import { request } from './config'

/**
 * 创建评价
 * @param {Object} data - 评价数据
 * @param {number} data.score - 评分(1-5)
 * @param {string} data.content - 评价内容
 * @param {Array} [data.images] - 评价图片
 * @param {string} data.ratedId - 被评价者ID
 * @param {string} data.ratedName - 被评价者名称
 * @param {string} data.ratedAvatar - 被评价者头像
 * @returns {Promise}
 */
export const createRating = (data) => {
    return request({
        url: '/ratings/addrating',
        method: 'POST',
        data,
    });
};

/**
 * 获取用户评价列表
 * @param {string} userId - 被评价者ID
 * @returns {Promise}
 */
export const getUserRatings = (userId) => {
    return request({
        url: `/ratings/user/${userId}`,
        method: 'GET',
    })
};

/**
 * 通过问题ID获取评价详情
 * @param {string} questionId - 问题ID
 * @returns {Promise}
 */
export const getRatingDetail = (questionId) => {
    return request({
        url: `/ratings/question/${questionId}`,
        method: 'GET'
    });
};
