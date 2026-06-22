/**
 * Memory Policy 决定“模型提取出的 memoryPatch 是否应该进入长期记忆账本”。
 * 它不直接写数据库，只输出可解释的决策，方便 Trace 和 Ledger 展示原因。
 */
function decideMemoryPolicy(memoryPatch = {}) {
  const shouldRemember = Boolean(memoryPatch.shouldRemember);
  const confidence = Number(memoryPatch.confidence || 0);
  const action = memoryPatch.action || memoryPatch.operation || 'ignore';
  const memoryType = memoryPatch.type === 'constraint' || memoryPatch.avoidTopics?.length
    ? 'constraint'
    : 'preference';

  if (!shouldRemember) {
    return {
      shouldWrite: false,
      eventType: 'memory_ignore',
      memoryType,
      action: 'ignore',
      reason: '输入没有稳定长期偏好，Policy 决定忽略长期写入。'
    };
  }

  if (confidence > 0 && confidence < 0.45) {
    return {
      shouldWrite: false,
      eventType: 'memory_ignore',
      memoryType,
      action: 'ignore',
      reason: `记忆置信度 ${confidence} 低于 0.45，Policy 暂不写入长期记忆。`
    };
  }

  if (['remove', 'forget'].includes(action) || memoryPatch.operation === 'remove') {
    return {
      shouldWrite: true,
      eventType: 'memory_forget',
      memoryType,
      action: 'remove',
      reason: '用户表达了删除或规避偏好，Policy 记录为遗忘/约束事件。'
    };
  }

  return {
    shouldWrite: true,
    eventType: 'memory_write',
    memoryType,
    action: memoryPatch.operation === 'replace' ? 'replace' : 'write',
    reason: memoryPatch.operation === 'replace'
      ? '用户表达了覆盖偏好，Policy 记录为新的当前有效偏好。'
      : '用户表达了稳定偏好，Policy 允许写入长期记忆账本。'
  };
}

module.exports = {
  decideMemoryPolicy
};
