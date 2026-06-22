const AgentMemoryLedgerModel = require('../models/AgentMemoryLedgerModel');
const AgentMemoryViewModel = require('../models/AgentMemoryViewModel');
const { getOrCreateMemory, serializeMemory } = require('./agentMemoryService');

/**
 * 将 Date 或可解析日期转换成 Date；解析失败时使用 fallback。
 * validTime 和 transactionTime 需要稳定日期对象，避免 Mongo 中混入任意字符串。
 */
function toDate(value, fallback = new Date()) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
}

/**
 * 追加一条记忆账本事件。
 * Ledger 是 append-only 黑匣子，记录发生过什么，不直接修改旧事件。
 */
async function appendLedgerEvent({
  userId,
  runId = null,
  eventType,
  memoryType = 'system',
  payload = {},
  reason = '',
  validTime = {},
  actor = 'agent'
}) {
  return AgentMemoryLedgerModel.create({
    userId,
    runId,
    eventType,
    memoryType,
    payload,
    reason,
    validTime: {
      from: toDate(validTime.from || payload.validFrom),
      to: validTime.to || payload.validTo ? toDate(validTime.to || payload.validTo, null) : null
    },
    transactionTime: new Date(),
    actor
  });
}

/**
 * 记录本轮 Agent 读取了哪些记忆视图。
 * 这让前端能说明“本次规划参考了哪些偏好和上下文”。
 */
async function recordMemoryRead({ userId, runId, views }) {
  return appendLedgerEvent({
    userId,
    runId,
    eventType: 'memory_read',
    memoryType: 'system',
    payload: {
      profileView: views?.profileView || {},
      recentContextCount: views?.recentContextView?.length || 0
    },
    reason: 'Agent 运行前读取 Memory Views，供 Planner 和工具排序使用。',
    actor: 'agent'
  });
}

/**
 * 根据 Policy 决策记录记忆写入、忽略或遗忘事件。
 * 真正的偏好快照仍由 AgentMemoryModel 保存，Ledger 负责溯源。
 */
async function recordMemoryPolicyDecision({ userId, runId, memoryPatch, policyDecision }) {
  return appendLedgerEvent({
    userId,
    runId,
    eventType: policyDecision.eventType,
    memoryType: policyDecision.memoryType,
    payload: {
      ...memoryPatch,
      policyAction: policyDecision.action
    },
    reason: policyDecision.reason,
    validTime: {
      from: memoryPatch.validFrom,
      to: memoryPatch.validTo
    },
    actor: 'agent'
  });
}

/**
 * 记录成功工具链，供 tool_success_view 展示历史可复用事实。
 * 只记录工具名和简要输入，避免 Ledger 过大。
 */
async function recordToolSuccess({ userId, runId, plannerResult, toolResults }) {
  const toolNames = (plannerResult.toolSteps || []).map((step) => step.toolName);
  if (!toolNames.length) return null;

  return appendLedgerEvent({
    userId,
    runId,
    eventType: 'tool_success',
    memoryType: 'tool_success',
    payload: {
      intent: plannerResult.intent,
      toolNames,
      resultTools: Object.keys(toolResults || {})
    },
    reason: 'Agent 任务成功完成，记录可复用工具链事实。',
    actor: 'agent'
  });
}

/**
 * 从当前记忆和 Ledger 刷新结构化 Views。
 * 首版不做向量检索，只生成 Mongo 结构化视图，供前端和 Planner 使用。
 */
async function refreshMemoryViews(userId) {
  const memory = serializeMemory(await getOrCreateMemory(userId));
  const [timelineEvents, toolEvents] = await Promise.all([
    AgentMemoryLedgerModel.find({
      userId,
      eventType: { $in: ['memory_write', 'memory_forget'] }
    }).sort({ transactionTime: -1 }).limit(20),
    AgentMemoryLedgerModel.find({
      userId,
      eventType: 'tool_success'
    }).sort({ transactionTime: -1 }).limit(20)
  ]);

  const viewPayload = {
    profileView: {
      topics: memory.preferences.topics || [],
      keywords: memory.preferences.keywords || [],
      minReward: memory.preferences.minReward || 0,
      avoidTopics: memory.preferences.avoidTopics || [],
      summaries: memory.summaries || []
    },
    recentContextView: memory.contextTurns || [],
    timelineView: timelineEvents.map((event) => ({
      eventType: event.eventType,
      memoryType: event.memoryType,
      summary: event.payload?.summary || event.payload?.content || '',
      action: event.payload?.policyAction || event.payload?.action || '',
      validTime: event.validTime,
      transactionTime: event.transactionTime,
      reason: event.reason
    })),
    toolSuccessView: toolEvents.map((event) => ({
      intent: event.payload?.intent || '',
      toolNames: event.payload?.toolNames || [],
      transactionTime: event.transactionTime,
      reason: event.reason
    })),
    refreshedAt: new Date()
  };

  const view = await AgentMemoryViewModel.findOneAndUpdate(
    { userId },
    { userId, ...viewPayload },
    { new: true, upsert: true }
  );

  await appendLedgerEvent({
    userId,
    eventType: 'view_refresh',
    memoryType: 'system',
    payload: {
      profileTopicCount: viewPayload.profileView.topics.length,
      timelineCount: viewPayload.timelineView.length,
      toolSuccessCount: viewPayload.toolSuccessView.length
    },
    reason: 'Ledger 更新后刷新当前 Memory Views。',
    actor: 'system'
  });

  return view;
}

/**
 * 获取当前用户 Memory Views。
 * 如果还没有派生视图，则先根据当前记忆和 Ledger 生成一份。
 */
async function getMemoryViews(userId) {
  const existing = await AgentMemoryViewModel.findOne({ userId });
  return existing || refreshMemoryViews(userId);
}

/**
 * 查询当前用户 Ledger，按 transactionTime 倒序返回。
 * 前端用于展示原始账本和 Policy 决策过程。
 */
async function listLedgerEvents(userId, limit = 50) {
  return AgentMemoryLedgerModel.find({ userId })
    .sort({ transactionTime: -1 })
    .limit(Math.min(Number(limit || 50), 100));
}

/**
 * 用户主动遗忘某类记忆。
 * 首版用 Ledger 记录遗忘事件，并刷新 Views；原始 Ledger 不删除，保留溯源能力。
 */
async function forgetMemory({ userId, memoryType = 'preference', reason = '用户主动遗忘记忆' }) {
  const event = await appendLedgerEvent({
    userId,
    eventType: 'memory_forget',
    memoryType,
    payload: { memoryType },
    reason,
    actor: 'user'
  });
  await refreshMemoryViews(userId);
  return event;
}

module.exports = {
  appendLedgerEvent,
  recordMemoryRead,
  recordMemoryPolicyDecision,
  recordToolSuccess,
  refreshMemoryViews,
  getMemoryViews,
  listLedgerEvents,
  forgetMemory
};
