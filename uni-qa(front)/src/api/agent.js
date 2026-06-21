import { request } from './config'

export const agentApi = {
  getTools() {
    return request({
      url: '/agent/tools',
      method: 'GET'
    })
  },

  getMemory() {
    return request({
      url: '/agent/memory',
      method: 'GET'
    })
  },

  startRun(goal) {
    return request({
      url: '/agent/runs',
      method: 'POST',
      data: { goal }
    })
  },

  listRuns(params = {}) {
    const query = params.limit ? `?limit=${encodeURIComponent(params.limit)}` : ''
    return request({
      url: `/agent/runs${query}`,
      method: 'GET'
    })
  },

  getRun(runId) {
    return request({
      url: `/agent/runs/${runId}`,
      method: 'GET'
    })
  },

  confirmAction(payload) {
    return request({
      url: '/agent/action-confirm',
      method: 'POST',
      data: payload
    })
  }
}
