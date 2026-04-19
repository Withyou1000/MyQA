import { request } from './config'

/**
 * 客服相关API服务
 */
export const customerServiceApi = {
  /**
   * 获取客服会话列表
   * @returns {Promise<Array<{
   *   id: string,
   *   customerId: string,
   *   customerName: string,
   *   customerAvatar: string,
   *   lastMessage: string,
   *   lastMessageTime: string,
   *   unreadCount: number
   * }>>} 返回会话列表
   */
  getSessions() {
    return request({
      url: '/customer-service/sessions',
      method: 'GET'
    })
  },

  /**
   * 获取与客户的聊天记录
   * @param {string} customerId - 客户ID
   * @returns {Promise<{
   *   customerInfo: {
   *     id: string,
   *     name: string,
   *     avatar: string
   *   },
   *   messages: Array<{
   *     id: string,
   *     content: string,
   *     messageType: string,
   *     senderId: string,
   *     receiverId: string,
   *     createdAt: string,
   *     isMine: boolean
   *   }>
   * }>} 返回聊天记录
   */
  getCustomerChat(customerId) {
    return request({
      url: `/customer-service/chat/${customerId}`,
      method: 'GET'
    })
  },

  /**
   * 获取当前用户最近的交易列表
   * @returns {Promise<Array>}
   */
  getRecentTransactions() {
    return request({
      url: '/customer-service/transactions/recent',
      method: 'GET'
    })
  },

  /**
   * 获取交易详情
   * @param {string} questionId - 问题ID
   * @returns {Promise<Object>}
   */
  getTransactionDetail(questionId) {
    return request({
      url: `/customer-service/transaction/${questionId}/detail`,
      method: 'GET'
    })
  },

  /**
   * 发送消息给客户
   * @param {string} customerId - 客户ID
   * @param {Object} message - 消息内容
   * @param {string} message.text - 文本消息
   * @param {string} [message.messageType] - 消息类型，默认为text
   * @returns {Promise<{
   *   id: string,
   *   status: string
   * }>} 返回发送结果
   */
  sendMessage(customerId, message) {
    return request({
      url: `/customer-service/message/${customerId}`,
      method: 'POST',
      data: message
    })
  },

  /**
   * 标记会话为已读
   * @param {string} sessionId - 会话ID
   * @returns {Promise<{
   *   status: string
   * }>} 返回操作结果
   */
  markAsRead(sessionId) {
    return request({
      url: `/customer-service/session/${sessionId}/read`,
      method: 'PUT'
    })
  },

  /**
   * 用户申请人工客服
   * @returns {Promise<{
   *   requestId: string,
   *   status: string
   * }>} 返回请求信息
   */
  requestService() {
    return request({
      url: '/customer-service/request',
      method: 'POST'
    })
  },

  /**
   * 获取待处理的客服请求列表
   * @returns {Promise<Array<{
   *   id: string,
   *   customerId: string,
   *   customerName: string,
   *   customerAvatar: string,
   *   message: string,
   *   createdAt: string
   * }>>} 返回请求列表
   */
  getRequests() {
    return request({
      url: '/customer-service/requests',
      method: 'GET'
    })
  },

  /**
   * 客服接受请求并绑定会话
   * @param {string} requestId - 请求ID
   * @returns {Promise<{requestId: string, sessionId: string, customerId: string, serviceId: string}>} 返回操作结果
   */
  acceptRequest(requestId) {
    return request({
      url: `/customer-service/accept-request/${requestId}`,
      method: 'POST'
    })
  },

  /**
   * 结束客服会话
   * @param {string} sessionId - 会话ID
   * @param {string} customerId - 客户ID
   * @returns {Promise<{status: string}>} 返回操作结果
   */
  endSession(sessionId, customerId) {
    return request({
      url: `/customer-service/session/${sessionId}/close`,
      method: 'PUT',
      data: { customerId }
    })
  }
}
