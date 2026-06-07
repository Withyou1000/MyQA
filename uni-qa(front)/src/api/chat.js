import { request } from './config'

const buildQueryString = (params = {}) => {
  return Object.entries(params)
    .filter(([, value]) => value !== '' && value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

export const chatApi = {
  getChatList(params = {}) {
    const queryString = buildQueryString(params)
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
