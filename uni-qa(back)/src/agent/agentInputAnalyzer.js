const { createStructuredReply } = require('../ai/services/aiClient');
const { normalizeMemoryPatch } = require('./agentMemoryExtractor');
const {
  classifyAgentGoalByRule,
  finalizeRoute
} = require('./agentRequestRouter');

/**
 * 清洗模型返回的 route。
 * AgentInputAnalyzer 的模型输出不能直接进入执行链路，这里只保留 Router 需要的字段。
 */
function normalizeModelRoute(rawRoute = {}) {
  const route = rawRoute && typeof rawRoute === 'object' ? rawRoute : {};
  const mode = route.mode || 'chat';

  return {
    mode,
    source: 'model',
    intent: String(route.intent || ''),
    confidence: route.confidence,
    reason: String(route.reason || ''),
    shouldExecuteTools: Boolean(route.shouldExecuteTools ?? mode === 'task'),
    missingFields: Array.isArray(route.missingFields) ? route.missingFields : [],
    clarificationQuestion: String(route.clarificationQuestion || '').trim().slice(0, 200)
  };
}

/**
 * 生成模型失败时的完整兜底分析结果。
 * 兜底同时包含 memoryPatch 和 route，保证主流程不需要知道失败细节。
 */
function buildFallbackAnalysis(goal, memory, error) {
  const memoryPatch = normalizeMemoryPatch(null, goal, 'fallback');
  const ruleRoute = classifyAgentGoalByRule(goal, memoryPatch);
  const fallbackReason = error?.message || 'AgentInputAnalyzer 调用失败';

  return {
    source: 'fallback',
    sourceLabel: '规则兜底',
    fallbackReason,
    memoryPatch,
    route: {
      ...finalizeRoute(goal, memoryPatch, ruleRoute),
      fallbackReason
    },
    memory
  };
}

/**
 * Agent 输入分析的唯一模型入口。
 * 一次模型调用同时输出 memoryPatch 和 route，避免“记忆模型”和“路由模型”对同一句话判断不一致。
 */
async function analyzeAgentInput(goal, memory) {
  const text = String(goal || '').trim();
  if (!text) {
    return buildFallbackAnalysis(goal, memory, new Error('用户输入为空'));
  }

  try {
    const result = await createStructuredReply([
      {
        role: 'system',
        content: [
          '你是 MyQA Agent 的输入分析器 AgentInputAnalyzer。',
          '你只做“理解和分类”，不要执行任务，也不要编造工具结果。',
          '你需要在一次 JSON 输出中同时完成两件事：',
          '1. memoryPatch：判断这句话是否应该写入长期偏好记忆。',
          '2. route：判断这句话应该走 chat、memory_only、task 还是 clarification。',
          '',
          'memoryPatch 字段要求：',
          '- shouldRemember：是否写入长期记忆。',
          '- operation：只能是 add、replace、remove。',
          '- type：preference、constraint、profile、context 之一。',
          '- content：记忆正文，用一句话表达用户偏好或约束。',
          '- confidence：0 到 1，表示你对这条记忆的确定程度。',
          '- validFrom / validTo：现实生效时间；没有结束时间时 validTo 填 null。',
          '- ttlDays：短期记忆可填过期天数，长期偏好填 0。',
          '- importance：0 到 1，表示这条记忆重要程度。',
          '- action：write、ignore、replace、remove、add 之一，表示建议 Policy 如何处理。',
          '- topics、keywords、avoidTopics、removeTopics、removeKeywords、removeAvoidTopics：都必须是字符串数组。',
          '- minReward：数字，没有就填 0。',
          '- summary：一句简短中文摘要。',
          '- 只抽取稳定偏好，不要把一次性查询目标都写成长期记忆。',
          '- “以后、记住、优先、擅长、喜欢、不想、不要、别”通常表示可能需要记忆。',
          '',
          'route 字段要求：',
          '- mode 只能是 chat、memory_only、task、clarification。',
          '- chat：普通聊天、解释、闲聊，没有要求调用平台工具。',
          '- memory_only：用户表达未来偏好或长期约束，不要求立刻查询或执行。',
          '- task：用户明确要求现在查询、推荐、统计、查看、转人工、处理某个平台任务。',
          '- clarification：用户像是在要求执行任务，但目标或关键参数不足，必须先追问。',
          '- confidence 必须是 0 到 1。',
          '- missingFields 填执行任务缺少的关键字段，例如 questionId。',
          '- clarificationQuestion 填一句可以直接问用户的话。',
          '',
          '重要例子：',
          '- “以后推荐给我 Java 问题” => memoryPatch.shouldRemember=true，route.mode=memory_only。',
          '- “推荐给我 Java 问题” => memoryPatch.shouldRemember=false，route.mode=task。',
          '- “帮我查 Java 问题，以后有点累了” => route.mode=task，不要因为出现“以后”就误判为记忆。',
          '- “查看这个问题的申请者”且上下文无法定位问题 => route.mode=clarification，missingFields 包含 questionId。',
          '',
          '只返回 JSON：{ "memoryPatch": object, "route": object }。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `用户输入：${text}`,
          '',
          `当前已有记忆：${JSON.stringify(memory || {})}`,
          '',
          '请只返回 JSON。'
        ].join('\n')
      }
    ]);

    const memoryPatch = normalizeMemoryPatch(result?.memoryPatch, goal, 'model');
    const route = finalizeRoute(goal, memoryPatch, normalizeModelRoute(result?.route));

    return {
      source: 'model',
      sourceLabel: '模型输入分析',
      fallbackReason: '',
      memoryPatch,
      route,
      memory
    };
  } catch (error) {
    return buildFallbackAnalysis(goal, memory, error);
  }
}

module.exports = {
  analyzeAgentInput
};
