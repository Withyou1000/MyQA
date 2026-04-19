import { request } from './config'

export const applyApi = {
    /**
     * 申请回答问题
     * @param {string} questionId - 问题ID
     * @returns {Promise}
     */
    applyAnswerQuestion(questionId) {
        return request({
            url: `/apply/${questionId}/apply-answer`,
            method: 'POST',
        });
    },

    /**
    * 接受申请并设置回答者
    * @param {string} questionId - 问题ID
    * @param {string} applicantId - 申请者ID
    * @returns {Promise<{
    *   code: number,
    *   message: string,
    *   data: {
    *     questionId: string,
    *     answererId: string,
    *     status: string
    *   }
    * }>}
    */
    acceptApplication(questionId, applicantId) {
        return request({
            url: `/apply/${questionId}/apply/${applicantId}/accept`,
            method: 'PATCH',
            needToken: true
        });
    },

    /**
     * 通过问题ID查询所有申请回答的用户
     * @param {string} questionId - 问题ID
     * @returns {Promise}
     */
    getQuestionApplicants(questionId) {
        return request({
            url: `/apply/${questionId}/applicants`,
            method: 'GET',
        });
    },

    /**
       * 采纳回答
       * @param {string} questionId - 问题ID
       * @param {string} answererId - 回答者ID
       * @returns {Promise<{
       *   questionId: string,
       *   acceptTime: string,
       *   reward: number,
       *   asker: {
       *     userId: string,
       *     account: string
       *   },
       *   answerer: {
       *     userId: string,
       *     account: string,
       *     balanceAfter: number
       *   }
       * }>} 返回采纳结果
       * @throws {Error} 权限不足或问题/回答者不存在时抛出错误
       */
    acceptAnswer(questionId, accept) {
        return request({
            url: `/apply/accept/${questionId}/${accept}`,
            method: 'POST',
        })
    },

    /**
 * 申请采纳回答
 * 回答者调用此接口向提问者发送采纳申请通知
 * @param {string} questionId - 问题ID
 * @returns {Promise<{
 *   success: boolean,
 *   message: string,
 *   applyTime: string,
 *   questionId: string
 * }>} 返回申请结果
 * @throws {Error} 问题不存在或状态不允许时抛出错误
 */
    applyAcceptAnswer(questionId, answererName) {
        return request({
            url: `/apply/apply-accept/${questionId}`,
            method: 'POST',
            data: {
                name: answererName
            }
        });
    },
    /**
   * 验证申请采纳状态
   * 检查当前用户是否有未完成的申请采纳请求
   * @param {string} authorId - 提问者ID
   * @returns {Promise<{
   *   notCompleted: boolean,
   *   answererName?: string,
   *   completedAt?: string
   * }>} 返回验证结果
   * @throws {Error} 验证失败时抛出错误
   */
    verifyApplyAcceptStatus(authorId) {
        return request({
            url: `/apply/apply-accept/verify/${authorId}`, 
            method: 'GET'
        });
    },

    /**
     * 标记申请为已完成
     * 当提问者处理完申请后，标记对应的申请记录为已完成
     * @param {string} id - 申请记录ID
     * @returns {Promise<{
     *   code: number,
     *   message: string
     * }>} 返回操作结果
     * @throws {Error} 标记失败时抛出错误
     */
    markApplyAcceptAsFinished(id) {
        return request({
            url: `/apply/apply-accept/${id}/finish`,
            method: 'PATCH'
        });
    },
}