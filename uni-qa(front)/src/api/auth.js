import { request } from './config'

/**
 * 认证相关API服务
 */
export const authApi = {
  /**
   * 用户登录
   * @param {Object} params - 登录参数
   * @param {string} params.account - 账号
   * @param {string} params.password - 密码
   * @returns {Promise<{
   *   token: string,
   *   userId: string,
   *   account: string
   * }>} 返回登录结果和token
   * @throws {Error} 账号或密码错误时抛出错误
   */
  login(params) {
    return request({
      url: '/auth/login',
      method: 'POST',
      data: params
    })
  },

  /**
   * 用户注册
   * @param {Object} params - 注册参数
   * @param {string} params.account - 账号
   * @param {string} params.password - 密码
   * @param {string} params.phone - 手机号
   * @param {string} params.code - 验证码
   * @returns {Promise<{
   *   userId: string,
   *   account: string,
   *   createTime: string
   * }>} 返回注册结果
   * @throws {Error} 账号已存在或验证码错误时抛出错误
   */
  register(params, config) {
    return request({
      url: '/auth/register',
      method: 'POST',
      data: params,
      ...config
    })
  },

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @returns {Promise<{
   *   phone: string,
   *   expireTime: string
   * }>} 返回发送结果
   * @throws {Error} 手机号格式错误或发送过于频繁时抛出错误
   */
  sendCode(phone) {
    return request({
      url: '/auth/send-code',
      method: 'POST',
      data: { phone }
    })
  },

  /**
   * 退出登录
   * @returns {Promise<{
   *   message: string
   * }>} 返回退出结果
   */
  logout() {
    return request({
      url: '/auth/logout',
      method: 'POST'
    })
  }
}