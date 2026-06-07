/**
 * API基础配置
 */

// API根路径
export const BASE_URL = 'http://10.159.26.34:3000'

// WebSocket根路径
export const WS_URL = 'ws://10.159.26.34:3000'


/**
 * 统一请求配置
 */
export const REQUEST_CONFIG = {
  // 请求拦截器
  beforeRequest(options) {
    // 添加API前缀
    options.url = BASE_URL + options.url
    
    // 设置请求头
    options.header = {
      'Content-Type': 'application/json',
      ...options.header
    }
    
    // 添加token认证
    const token = uni.getStorageSync('token')
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }
    
    return options
  },
  
  // 响应拦截器
  afterResponse(response) {
    const { statusCode, data } = response
    // 处理HTTP状态码
    if (statusCode !== 200) {
      // 401表示未登录或token过期
      if (statusCode === 401) {
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        uni.reLaunch({
          url: '/pages/login/index'
        })
      }
      throw new Error(data.message || '请求失败')
    }
    
    // 处理业务状态码
    if (data.code !== 200) {
      throw new Error(data.message || '请求失败')
    }
  
    // 返回完整响应数据，包括code和message
    return data
  }
}

/**
 * 统一请求方法
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求Promise
 */
export const request = (options) => {
  // 应用请求拦截器
  options = REQUEST_CONFIG.beforeRequest(options)
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => {
        try {
          const result = REQUEST_CONFIG.afterResponse(res)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      },
      fail: reject
    })
  })
}