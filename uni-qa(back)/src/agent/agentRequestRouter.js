const TASK_CONFIDENCE_THRESHOLD = 0.65;

/**
 * 判断文本是否包含任意关键词。
 * 这里集中处理关键词命中，避免多个规则里重复写 some/includes。
 */
function includesAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

/**
 * 把模型或规则给出的 mode 限制在系统允许的四种路由内。
 * 未知 mode 一律降级为 chat，避免错误字符串进入执行链路。
 */
function normalizeMode(mode) {
  return ['chat', 'memory_only', 'task', 'clarification'].includes(mode) ? mode : 'chat';
}

/**
 * 把模型返回的置信度统一压到 0~1。
 * 模型偶尔会返回 85 这种百分制值，这里会转换成 0.85，方便后续和 0.65 阈值比较。
 */
function normalizeConfidence(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;

  const normalized = number > 1 && number <= 100 ? number / 100 : number;
  return Math.min(Math.max(normalized, 0), 1);
}

/**
 * 归一化字符串数组字段，例如 missingFields。
 * 只保留非空字符串，并限制最大长度，避免模型返回过大的调试字段。
 */
function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
}

/**
 * 判断用户是否明确要求“现在执行平台任务”。
 * 这个规则只做兜底和保护，不替代模型理解；它主要解决“帮我查/统计/查看”这类很确定的表达。
 */
function hasExplicitExecutionIntent(text) {
  const normalized = String(text || '');
  const hasFutureMemoryCue = hasFutureMemoryIntent(normalized);
  const hasStrongExecutionCue = includesAny(normalized, [
    '帮我找',
    '帮我查',
    '找一下',
    '查一下',
    '查询',
    '查看',
    '统计',
    '一共',
    '多少',
    '退款',
    '交易',
    '订单',
    '申请者',
    '申请人',
    '谁申请',
    '转人工',
    '执行',
    '处理到哪',
    '现在',
    '马上',
    '立刻',
    '顺便'
  ]);

  if (hasStrongExecutionCue) return true;

  // 推荐类表达要区分“现在推荐”和“以后推荐”。
  // 以“以后/后续/今后/下次”开头时更像偏好设置，不应触发当前任务。
  const startsWithFutureCue = /^(以后|后续|今后|下次)/.test(normalized);
  if (!startsWithFutureCue && /帮我推荐|推荐给我|推荐(一下|几个|一些|几条|适合|给我看看)/.test(normalized)) {
    return true;
  }

  return false;
}

/**
 * 判断用户是否在表达未来偏好。
 * 只有“以后/下次/后续”和“推荐/优先/记住/不要”等偏好词同时出现时，才认为是长期记忆意图。
 */
function hasFutureMemoryIntent(text) {
  const normalized = String(text || '');
  return /(以后|后续|今后|下次).*(推荐|优先|记住|偏好|别|不要|不想)|(?:推荐|优先|记住|偏好).*(以后|后续|今后|下次)/.test(normalized);
}

/**
 * 判断当前输入是否只是偏好设置。
 * 这一步依赖 memoryPatch.shouldRemember，避免仅凭关键词把普通任务误判成记忆更新。
 */
function isPureMemoryGoal(goal, memoryExtraction) {
  const text = String(goal || '');
  if (!memoryExtraction?.shouldRemember) return false;

  const hasMemoryCue = includesAny(text, [
    '以后',
    '记住',
    '我喜欢',
    '我擅长',
    '优先',
    '偏好',
    '不想',
    '不要',
    '别给我'
  ]);

  return (hasMemoryCue || hasFutureMemoryIntent(text)) && !hasExplicitExecutionIntent(text);
}

/**
 * 规则兜底路由。
 * 当 AgentInputAnalyzer 模型失败时，用这套最小规则保证聊天、记忆和明确任务仍能工作。
 */
function classifyAgentGoalByRule(goal, memoryExtraction) {
  if (isPureMemoryGoal(goal, memoryExtraction)) {
    return {
      mode: 'memory_only',
      source: 'rule',
      confidence: 1,
      shouldExecuteTools: false,
      reason: '用户表达的是长期偏好，没有明确要求执行平台任务。'
    };
  }

  if (hasExplicitExecutionIntent(goal)) {
    return {
      mode: 'task',
      source: 'rule',
      confidence: 1,
      shouldExecuteTools: true,
      reason: '用户输入包含明确的平台任务动词，需要进入 Planner 和工具执行。'
    };
  }

  return {
    mode: 'chat',
    source: 'rule',
    confidence: 1,
    shouldExecuteTools: false,
    reason: '用户输入更像普通对话，没有明确要求调用平台工具。'
  };
}

/**
 * 对模型 route 做安全保护。
 * 优先处理未来偏好、缺参追问和明确执行意图，避免模型分类结果直接控制工具执行。
 */
function applyRouteGuard(goal, memoryExtraction, route) {
  const text = String(goal || '');
  const guardedRoute = {
    ...route,
    mode: normalizeMode(route.mode),
    confidence: normalizeConfidence(route.confidence),
    missingFields: normalizeStringList(route.missingFields),
    guardReason: ''
  };

  // 只有“纯偏好设置”才强制 memory_only；如果同一句里还有“帮我查/找/统计”等当前任务，
  // 记忆会照常写入，但 route 必须保留 task，保证“偏好 + 任务”可以同时处理。
  if (
    memoryExtraction?.shouldRemember
    && hasFutureMemoryIntent(text)
    && !hasExplicitExecutionIntent(text)
  ) {
    return {
      ...guardedRoute,
      mode: 'memory_only',
      shouldExecuteTools: false,
      guardReason: '检测到纯未来偏好表达，只更新记忆，不执行工具。'
    };
  }

  if (guardedRoute.missingFields.length) {
    return {
      ...guardedRoute,
      mode: 'clarification',
      shouldExecuteTools: false,
      guardReason: '任务缺少关键参数，先向用户追问。'
    };
  }

  if (guardedRoute.mode === 'clarification') {
    return {
      ...guardedRoute,
      shouldExecuteTools: false,
      guardReason: '模型判断当前任务需要补充信息，暂停工具执行。'
    };
  }

  if (hasExplicitExecutionIntent(text)) {
    return {
      ...guardedRoute,
      mode: 'task',
      shouldExecuteTools: true,
      guardReason: '检测到明确执行意图，进入 Planner 和工具执行。'
    };
  }

  return guardedRoute;
}

/**
 * 根据 confidence 决定是否放行 task。
 * 低于 0.65 且没有明确执行 Guard 的任务会被改成 clarification，防止误调用工具。
 */
function applyConfidencePolicy(route) {
  const confidence = normalizeConfidence(route.confidence);
  const normalizedRoute = {
    ...route,
    confidence,
    confidenceThreshold: TASK_CONFIDENCE_THRESHOLD,
    confidenceDecision: 'accepted'
  };

  if (normalizedRoute.mode === 'clarification') {
    return {
      ...normalizedRoute,
      shouldExecuteTools: false,
      confidenceDecision: 'clarification_requested'
    };
  }

  const explicitlyGuardedTask = normalizedRoute.mode === 'task'
    && normalizedRoute.guardReason === '检测到明确执行意图，进入 Planner 和工具执行。';
  if (
    normalizedRoute.mode === 'task'
    && confidence < TASK_CONFIDENCE_THRESHOLD
    && !explicitlyGuardedTask
  ) {
    return {
      ...normalizedRoute,
      mode: 'clarification',
      shouldExecuteTools: false,
      confidenceDecision: 'below_task_threshold',
      clarificationQuestion: normalizedRoute.clarificationQuestion
        || '我还不能确定你希望我执行什么任务，请补充要查询或处理的具体内容。'
    };
  }

  return normalizedRoute;
}

/**
 * Router 对外的唯一整理入口。
 * AgentInputAnalyzer 产出的 route 必须经过 Guard 和 confidence 两道程序化校验后，才能决定是否进入 Planner。
 */
function finalizeRoute(goal, memoryExtraction, route) {
  return applyConfidencePolicy(applyRouteGuard(goal, memoryExtraction, route));
}

module.exports = {
  classifyAgentGoalByRule,
  finalizeRoute,
  normalizeConfidence,
  TASK_CONFIDENCE_THRESHOLD
};



