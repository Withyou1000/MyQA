import { request } from './config'

/**
 * 退款相关API服务
 */
export const refundApi = {
  /**
   * 通过问题ID获取退款记录
   * @param {string} questionId - 问题ID
   * @returns {Promise<{
   *   refundId: string,
   *   questionId: string,
   *   questionTitle: string,
   *   questionTopic: string,
   *   questionStatus: string,
   *   amount: number,
   *   maxAmount: number,
   *   reason: string,
   *   proofs: string[],
   *   description: string,
   *   status: string,
   *   applyTime: string,
   *   processTime: string,
   *   processorId: string,
   *   processRemark: string,
   *   user: {
   *     userId: string,
   *     account: string,
   *     name: string
   *   }
   * }>} 返回退款记录详情
   */
  getRefundByQuestionId(questionId) {
    return request({
      url: `/refund/detail/${questionId}`,
      method: 'GET'
    })
  },

  /**
   * 提交退款申请
   * @param {Object} params - 退款申请参数
   * @param {string} params.questionId - 问题ID
   * @param {number} params.amount - 退款金额
   * @param {number} params.maxAmount - 最大退款金额
   * @param {string} params.reason - 退款原因
   * @param {string[]} params.proofs - 凭证图片
   * @param {string} params.description - 补充描述
   * @returns {Promise<{
   *   refundId: string,
   *   status: string
   * }>} 返回退款申请结果
   */
  submitRefund(params) {
    return request({
      url: '/refund',
      method: 'POST',
      data: params
    })
  },

  /**
   * 取消退款申请
   * @param {string} questionId - 问题ID
   * @returns {Promise<{
   *   status: string
   * }>} 返回取消退款结果
   */
  cancelRefund(questionId) {
    return request({
      url: `/refund/cancel/${questionId}`,
      method: 'DELETE'
    })
  },

  /**
   * 处理退款申请
   * @param {string} refundId - 退款ID
   * @param {Object} params - 处理参数
   * @param {string} params.status - 处理状态 (refunded 或 rejected)
   * @param {string} [params.remark] - 处理备注
   * @returns {Promise<{
   *   status: string
   * }>} 返回处理结果
   */
  processRefund(refundId, params) {
    return request({
      url: `/refund/${refundId}/process`,
      method: 'PUT',
      data: params
    })
  }
}