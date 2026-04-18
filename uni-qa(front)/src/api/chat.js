import { request } from './config'

export const chatApi = {
  getChatList(params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
    ).toString()

    return request({
      url: queryString ? `/chat/list?${queryString}` : '/chat/list',
      method: 'GET'
    })
  },

  getQuestionChat(questionId) {
    return request({
      url: `/chat/${questionId}`,
      method: 'GET'
    })
  },

  sendChatMessage(questionId, params) {
    return request({
      url: `/chat/${questionId}/message`,
      method: 'POST',
      data: params
    })
  }
}
