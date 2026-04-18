import { request } from './config'

/**
 * 用户相关API服务
 */
export const userApi = {
  /**
   * 获取我的问题列表
   * @returns {Promise<{
   *   total: number,
   *   list: Array<{
   *     questionId: string,
   *     title: string,
   *     topic: string,
   *     tags: string[],
   *     reward: number,
   *     status: string,
   *     createTime: string
   *   }>
   * }>} 返回我的问题列表
   */
  getMyQuestions() {
    return request({
      url: '/user/myquestions',
      method: 'GET'
    })
  },
  hasRelate(questionId) {
    return request({
      url: `/user/myquestions/${questionId}`,
      method: 'GET'
    })
  },

  /**
   * 获取我的回答列表
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
   *     asker: {
   *       userId: string,
   *       account: string
   *     }
   *   }>
   * }>} 返回我的回答列表
   */
  getMyAnswers() {
    return request({
      url: '/user/myanswers',
      method: 'GET'
    })
  },

  /**
   * 获取用户信息
   * @returns {Promise<{
   *   userId: string,
   *   account: string,
   *   phone: string,
   *   balance: number,
   *   createTime: string
   * }>} 返回用户信息
   */
  getUserInfo() {
    return request({
      url: '/user/info',
      method: 'GET'
    })
  },

 
  /**
   * 更新用户头像
   * @param {Object} params - 头像参数
   * @param {string} params.avatar - 头像URL
   * @returns {Promise<{
   *   userId: string,
   *   avatar: string,
   *   updateTime: string
   * }>} 返回更新后的用户头像
   */
  updateAvatar(params) {
    return request({
      url: '/user/avatar',
      method: 'PUT',
      data: params
    })
  },

  /**
   * 更新用户昵称
   * @param {Object} params - 昵称参数
   * @param {string} params.nickname - 昵称
   * @returns {Promise<{
   *   userId: string,
   *   nickname: string,
   *   updateTime: string
   * }>} 返回更新后的用户昵称
   */
  updateNickname(params) {
    return request({
      url: '/user/nickname',
      method: 'PUT',
      data: params
    })
  }
}