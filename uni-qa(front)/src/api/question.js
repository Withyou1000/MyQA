import { request } from './config'

const buildQueryString = (params = {}) => {
  if (typeof params === 'string') {
    return encodeURIComponent(params);
  }
  return Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

/**
 * 问题相关API服务
 */
export const questionApi = {
  /**
   * 搜索问题
   * @param {string} keyword - 搜索关键词
   * @returns {Promise<{
   *   total: number,
   *   list: Array<{
   *     questionId: string,
   *     title: string,
   *     topic: string,
   *     tags: string[],
   *     reward: number,
   *     status: string,
   *     createTime: string,
   *     author: {
   *       userId: string,
   *       account: string
   *     }
   *   }>
   * }>} 返回搜索结果列表
   */
  search(keyword) {
    const queryString = buildQueryString(keyword);
    return request({
      url: `/question/search?keyword=${queryString}`,
      method: 'GET',
    })
  },

  /**
   * 发布问题
   * @param {Object} params - 问题参数
   * @param {string} params.title - 问题标题
   * @param {string} params.topic - 问题主题
   * @param {string[]} [params.tags] - 标签（可选）
   * @param {number} params.reward - 悬赏金额
   * @param {string[]} [params.images] - 图片列表（可选）
   * @returns {Promise<{
   *   questionId: string,
   *   createTime: string
   * }>} 返回创建的问题ID和创建时间
   * @throws {Error} 余额不足时抛出错误
   */
  createQuestion(params) {
    return request({
      url: '/question/questions',
      method: 'POST',
      data: params
    })
  },

  /**
   * 获取问题列表
   * @param {Object} [params] - 查询参数
   * @param {string} [params.topic] - 按主题筛选（可选）
   * @returns {Promise<{
   *   total: number,
   *   list: Array<{
   *     questionId: string,
   *     title: string,
   *     topic: string,
   *     tags: string[],
   *     reward: number,
   *     status: string,
   *     createTime: string,
   *     author: {
   *       userId: string,
   *       account: string
   *     }
   *   }>
   * }>} 返回问题列表
   */
  getQuestionList(params = {}) {
    const queryString = buildQueryString(params);
    return request({
      url: queryString ? `/question/?${queryString}` : '/question/',
      method: 'GET'
    })
  },



  /**
   * 获取问题详情
   * @param {string} questionId - 问题ID
   * @returns {Promise<{
   *   questionId: string,
   *   title: string,
   *   topic: string,
   *   tags: string[],
   *   reward: number,
   *   status: string,
   *   createTime: string,
   *   images: string[],
   *   author: {
   *     userId: string,
   *     account: string
   *   }
   * }>} 返回问题详细信息
   * @throws {Error} 问题不存在时抛出错误
   */
  getQuestionDetail(questionId) {
    return request({
      url: `/question/${questionId}`,
      method: 'GET'
    })
  },

  

  /**
   * 获取问题状态
   * @param {string} questionId - 问题ID
   * @returns {Promise<{
   *   questionId: string,
   *   status: 'pending' | 'answering' | 'accepted' | 'rejected',
   *   updateTime: string
   * }>} 返回问题状态信息
   */
  getQuestionStatus(questionId) {
    return request({
      url: `/question/status/${questionId}`,
      method: 'GET'
    });
  },

  /**
   * 删除问题
   * @param {string} questionId - 问题ID
   * @returns {Promise<{
   *   status: string,
   *   message: string
   * }>} 返回删除结果
   */
  deleteQuestion(questionId) {
    return request({
      url: `/question/${questionId}`,
      method: 'DELETE'
    });
  }
}
