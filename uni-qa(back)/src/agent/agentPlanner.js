const { createStructuredReply } = require('../ai/services/aiClient');
const { listTools } = require('./agentToolRegistry');

function detectKeyword(goal, keywords) {
  const text = String(goal || '').toLowerCase();
  return keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
}

function detectQuestionStatsIntent(goal) {
  const text = String(goal || '');
  const asksCount = /几个|多少|数量|一共|总共|统计/.test(text);
  const ownsQuestion = /我.*(发布|提出|提问).*问题|我的.*(发布|提出|提问)|我.*问题/.test(text);
  return asksCount && ownsQuestion;
}

function extractSearchInput(goal, memory) {
  const text = String(goal || '');
  const preferences = memory?.preferences || {};
  const topic = (preferences.topics || []).find((item) => text.includes(item)) || '';
  const rewardMatch = text.match(/(\d+)\s*(元|块|以上)/);
  const minReward = rewardMatch
    ? Number(rewardMatch[1])
    : detectKeyword(text, ['高赏金', '高收益'])
      ? Math.max(preferences.minReward || 0, 20)
      : preferences.minReward || 0;
  const keyword = [...(preferences.keywords || []), ...(preferences.topics || [])]
    .find((item) => text.toLowerCase().includes(String(item).toLowerCase())) || '';

  return {
    keyword,
    topic,
    minReward
  };
}

function extractQuotedQuestionTitle(goal) {
  const text = String(goal || '');
  const quoteMatch = text.match(/[“"']([^“"']+)[”"']/);
  if (quoteMatch) return quoteMatch[1].trim();

  const applicantTitleMatch = text.match(/(?:查看|查询|看看)?(.+?)的(?:所有)?(?:申请者|申请人|申请回答)/);
  if (applicantTitleMatch) {
    return applicantTitleMatch[1]
      .replace(/^某个问题$/, '')
      .replace(/^问题/, '')
      .trim();
  }

  const titleMatch = text.match(/问题(.+?)的.*申请/);
  return titleMatch ? titleMatch[1].trim() : '';
}

function getRecentCard(memory, types = []) {
  const turns = Array.isArray(memory?.contextTurns) ? memory.contextTurns : [];
  for (let index = turns.length - 1; index >= 0; index -= 1) {
    const cards = Array.isArray(turns[index].resultCards) ? turns[index].resultCards : [];
    const matched = cards.find((card) => types.includes(card.type));
    if (matched) return matched;
  }
  return null;
}

function resolveQuestionTitleFromContext(goal, memory) {
  const explicitTitle = extractQuotedQuestionTitle(goal);
  if (explicitTitle) return explicitTitle;

  const text = String(goal || '');
  const usesContext = /刚才|上面|上一个|这个|那个|当前|现在/.test(text);
  if (!usesContext) return '';

  const recentQuestionCard = getRecentCard(memory, [
    'question_recommendation',
    'question_stats',
    'question_selection',
    'question_applicants'
  ]);

  if (recentQuestionCard?.type === 'question_recommendation') {
    return recentQuestionCard.title || '';
  }

  const ownedQuestions = recentQuestionCard?.payload?.ownedQuestions || recentQuestionCard?.payload?.recentQuestions || [];
  return ownedQuestions[0]?.title || recentQuestionCard?.title || '';
}

function fallbackPlan(goal, memory) {
  const text = String(goal || '');

  if (detectQuestionStatsIntent(text)) {
    return {
      intent: 'user_question_stats',
      plan: ['识别用户是在查询自己的发题统计', '调用用户问题统计工具', '直接回答发布数量和状态分布'],
      toolSteps: [
        { toolName: 'get_user_question_stats', input: {} }
      ]
    };
  }

  if (detectKeyword(text, ['申请者', '申请人', '谁申请', '申请回答', '报名'])) {
    return {
      intent: 'question_applicants',
      plan: ['识别用户想查看某个问题的申请者', '调用申请者查询工具', '如果问题不明确则返回可选问题列表'],
      toolSteps: [
        {
          toolName: 'get_question_applicants',
          input: {
            questionTitle: resolveQuestionTitleFromContext(text, memory)
          }
        }
      ]
    };
  }

  if (detectKeyword(text, ['人工', '客服', '转人工'])) {
    return {
      intent: 'handoff',
      plan: ['理解用户是否需要人工客服', '生成需要用户确认的转人工动作卡片'],
      toolSteps: [],
      needsConfirmation: true
    };
  }

  if (detectKeyword(text, ['退款', '退钱', '退款状态'])) {
    return {
      intent: 'refund_support',
      plan: ['读取用户画像', '查询退款记录', '检索退款规则知识库', '总结当前状态和下一步建议'],
      toolSteps: [
        { toolName: 'get_user_profile', input: {} },
        { toolName: 'get_refund_status', input: {} },
        { toolName: 'search_knowledge_base', input: { keyword: text } }
      ]
    };
  }

  if (detectKeyword(text, ['交易', '订单', '记录', '进度'])) {
    return {
      intent: 'transaction_summary',
      plan: ['读取用户画像', '查询最近交易', '总结交易进度和风险点'],
      toolSteps: [
        { toolName: 'get_user_profile', input: {} },
        { toolName: 'get_recent_transactions', input: {} }
      ]
    };
  }

  if (detectKeyword(text, ['找', '推荐', '问题', '回答', '赏金', '适合'])) {
    const searchInput = extractSearchInput(text, memory);
    return {
      intent: 'question_discovery',
      plan: ['读取用户画像和偏好记忆', '搜索平台待回答问题', '按匹配度、赏金和新鲜度排序', '输出推荐问题卡片'],
      toolSteps: [
        { toolName: 'get_user_profile', input: {} },
        { toolName: 'search_questions', input: searchInput },
        { toolName: 'rank_questions_for_user', inputFrom: 'search_questions' }
      ]
    };
  }

  return {
    intent: 'knowledge_help',
    plan: ['读取用户画像', '检索平台知识库', '结合记忆给出回答和下一步建议'],
    toolSteps: [
      { toolName: 'get_user_profile', input: {} },
      { toolName: 'search_knowledge_base', input: { keyword: text } }
    ]
  };
}

function describeToolStep(step) {
  const map = {
    get_user_profile: '读取用户画像和偏好记忆',
    get_user_question_stats: '统计当前用户发布的问题',
    get_question_applicants: '查询指定问题的申请者',
    search_questions: '搜索平台待回答问题',
    rank_questions_for_user: '按用户偏好、赏金和新鲜度排序',
    get_recent_transactions: '查询最近问答交易',
    get_refund_status: '查询退款记录和处理状态',
    search_knowledge_base: '检索平台知识库',
    create_handoff_request: '等待用户确认后转人工客服'
  };
  return map[step.toolName] || `调用工具 ${step.toolName}`;
}

function buildExecutablePlan(toolSteps = [], needsConfirmation = false) {
  const plan = toolSteps.map(describeToolStep);
  if (needsConfirmation && !plan.length) {
    return ['识别需要用户确认的动作', '生成确认卡片'];
  }
  if (needsConfirmation) {
    return [...plan, '生成需要用户确认的动作卡片'];
  }
  return [...plan, '基于实际工具结果生成最终回答'];
}

function normalizeModelPlan(modelPlan, goal, memory) {
  const fallback = fallbackPlan(goal, memory);
  const allowedTools = new Set(listTools().map((tool) => tool.name));
  const rawSteps = Array.isArray(modelPlan?.toolSteps) ? modelPlan.toolSteps : [];

  const toolSteps = rawSteps
    .map((step) => ({
      toolName: step.toolName || step.name || '',
      input: step.input && typeof step.input === 'object' ? step.input : {},
      inputFrom: step.inputFrom || ''
    }))
    .filter((step) => allowedTools.has(step.toolName))
    .slice(0, 5);

  // 模型如果没有给出可执行工具，就退回规则计划，避免 Agent 空跑。
  if (!toolSteps.length && !modelPlan?.needsConfirmation) {
    return {
      ...fallback,
      source: 'fallback',
      sourceLabel: '规则兜底',
      fallbackReason: '模型计划没有可执行工具'
    };
  }

  // 页面展示计划必须由已通过工具白名单校验的 toolSteps 生成，
  // 避免模型另外生成一份自然语言 plan 后与实际执行工具不一致。
  const plan = buildExecutablePlan(toolSteps, modelPlan?.needsConfirmation);

  return {
    intent: String(modelPlan?.intent || fallback.intent),
    plan,
    toolSteps,
    needsConfirmation: Boolean(modelPlan?.needsConfirmation),
    source: 'model',
    sourceLabel: '模型 Planner',
    fallbackReason: ''
  };
}

async function createModelPlan(goal, memory) {
  const tools = listTools();
  const systemPrompt = [
    '你是 MyQA 平台的 Agent Planner。',
    '你要根据用户目标，从工具列表中选择少量必要工具，并输出 JSON。',
    '不要暴露完整思维链，只输出结构化的工具选择结果。',
    '如果用户的问题缺少必要参数，可以先调用能列出候选项的工具。',
    '输出字段必须包含 intent、toolSteps、needsConfirmation，不要输出 plan。',
    '页面展示计划由后端根据校验后的 toolSteps 生成，保证计划与实际执行一致。',
    'toolSteps 每项格式：{ "toolName": string, "input": object, "inputFrom": string }。',
    '只能选择工具列表中存在的 toolName。'
  ].join('\n');

  const userPrompt = [
    `用户目标：${goal}`,
    '',
    `用户记忆：${JSON.stringify(memory || {})}`,
    '',
    '最近上下文说明：contextTurns 是最近几轮用户目标和 Agent 结果摘要。用户说“刚才那个、上面的、现在执行”时，优先结合最近 resultCards 补全参数。',
    '',
    `可用工具：${JSON.stringify(tools)}`
  ].join('\n');

  const modelPlan = await createStructuredReply([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]);

  return normalizeModelPlan(modelPlan, goal, memory);
}

async function createPlan(goal, memory) {
  try {
    return await createModelPlan(goal, memory);
  } catch (error) {
    // 模型配置缺失或调用失败时，用确定性规则兜底，保证 Agent 基础能力仍可用。
    return {
      ...fallbackPlan(goal, memory),
      source: 'fallback',
      sourceLabel: '规则兜底',
      fallbackReason: error.message || '模型 Planner 调用失败'
    };
  }
}

module.exports = {
  createPlan,
  fallbackPlan
};
