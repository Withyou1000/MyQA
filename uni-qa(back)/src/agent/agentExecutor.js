const AgentTraceModel = require('../models/AgentTraceModel');
const { callTool } = require('./agentToolRegistry');
const {
  getOrCreateMemory,
  updateMemoryWithPatch,
  appendContextTurn,
  serializeMemory
} = require('./agentMemoryService');
const { createPlan } = require('./agentPlanner');
const { evaluateToolResult } = require('./agentEvaluator');
const { analyzeAgentInput } = require('./agentInputAnalyzer');
const { summarizeFinalAnswer } = require('./agentFinalSummarizer');

/**
 * 把工具返回值压缩成一行 Trace 摘要。
 * Trace 列表只需要让用户快速看懂结果数量或失败原因，不展示完整数据。
 */
function summarizeToolResult(toolName, result) {
  if (!result) return '工具没有返回结果。';
  if (Array.isArray(result.list)) {
    return `${toolName} 返回 ${result.total ?? result.list.length} 条结果。`;
  }
  if (result.error) {
    return `${toolName} 调用失败：${result.error}`;
  }
  return `${toolName} 已完成。`;
}

/**
 * 把排序后的问题结果转换成前端推荐卡片。
 * 卡片只保留展示和跳转需要的字段，详细数据放在 payload 里。
 */
function buildQuestionCards(rankedResult) {
  const list = rankedResult?.list || [];
  return list.map((question) => ({
    type: 'question_recommendation',
    title: question.title,
    description: `${question.topic || '未分类'} · ${question.reward || 0} 元 · 匹配分 ${question.matchScore || 0}`,
    payload: {
      questionId: question.questionId,
      topic: question.topic,
      reward: question.reward,
      tags: question.tags || [],
      reason: question.reason || ''
    },
    confirmAction: ''
  }));
}

/**
 * 生成搜索条件调整卡片。
 * ReAct 放宽关键词或赏金时，用这张卡告诉用户 Agent 为什么改了条件。
 */
function buildAdjustmentCards(adjustments = []) {
  return adjustments.map((item) => ({
    type: 'condition_adjustment',
    title: 'Agent 已自动修正搜索条件',
    description: item.summary,
    payload: item,
    confirmAction: ''
  }));
}

/**
 * 把退款工具结果转换成退款状态卡片。
 * 这里不判断退款是否成功，只负责把工具事实结构化给前端。
 */
function buildRefundCards(refundResult) {
  const list = refundResult?.list || [];
  return list.map((refund) => ({
    type: 'refund_status',
    title: refund.questionTitle || '退款记录',
    description: `状态：${refund.status}，金额：${refund.amount || 0} 元`,
    payload: refund,
    confirmAction: ''
  }));
}

/**
 * 把交易工具结果转换成交易摘要卡片。
 * 用户可以通过这些卡片快速扫到最近交易状态。
 */
function buildTransactionCards(transactionResult) {
  const list = transactionResult?.list || [];
  return list.map((item) => ({
    type: 'transaction_summary',
    title: item.title || '交易记录',
    description: `${item.role === 'asker' ? '我的提问' : '我的回答'} · ${item.status} · ${item.reward || 0} 元`,
    payload: item,
    confirmAction: ''
  }));
}

/**
 * 把用户发题统计转换成单张统计卡片。
 * 状态分布在这里拼成短文本，避免前端重复理解后端结构。
 */
function buildQuestionStatsCards(statsResult) {
  if (!statsResult) return [];
  const statusText = Object.entries(statsResult.byStatus || {})
    .map(([status, count]) => `${status}: ${count}`)
    .join('，') || '暂无状态分布';

  return [
    {
      type: 'question_stats',
      title: `你一共发布了 ${statsResult.total || 0} 个问题`,
      description: `状态分布：${statusText}`,
      payload: {
        total: statsResult.total || 0,
        byStatus: statsResult.byStatus || {},
        recentQuestions: statsResult.recentQuestions || []
      },
      confirmAction: ''
    }
  ];
}

/**
 * 把问题申请者查询结果转换成卡片。
 * 如果工具表示还需要选择具体问题，则返回选择提示卡而不是申请者列表。
 */
function buildApplicantCards(applicantResult) {
  if (!applicantResult) return [];

  if (applicantResult.needsQuestionSelection) {
    return [
      {
        type: 'question_selection',
        title: '需要指定具体问题',
        description: applicantResult.message || '请选择要查看申请者的问题。',
        payload: {
          ownedQuestions: applicantResult.ownedQuestions || []
        },
        confirmAction: ''
      }
    ];
  }

  return [
    {
      type: 'question_applicants',
      title: applicantResult.question?.title || '问题申请者',
      description: `共有 ${applicantResult.total || 0} 位用户申请回答这个问题。`,
      payload: {
        question: applicantResult.question || null,
        applicants: applicantResult.applicants || []
      },
      confirmAction: ''
    }
  ];
}

/**
 * 规则兜底最终回答。
 * Final Summarizer 模型失败时使用这里的确定性回答，避免用户看到空泛或空白结果。
 */
function buildFinalAnswer(intent, toolResults, memory, adjustments = []) {
  const hasQuestionRecommendations = Boolean(toolResults.rank_questions_for_user);
  const hasRefundResult = Boolean(toolResults.get_refund_status);
  const hasTransactionResult = Boolean(toolResults.get_recent_transactions);
  const hasQuestionStatsResult = Boolean(toolResults.get_user_question_stats);
  const hasApplicantResult = Boolean(toolResults.get_question_applicants);

  if (intent === 'question_applicants' || hasApplicantResult) {
    const result = toolResults.get_question_applicants;
    if (result?.needsQuestionSelection) {
      return '你想查看申请者，但还没有指定具体问题。我列出了你最近发布的问题，请用标题或 questionId 再问一次。';
    }

    return `问题「${result?.question?.title || ''}」目前共有 ${result?.total || 0} 位申请者。`;
  }

  if (intent === 'user_question_stats' || hasQuestionStatsResult) {
    const stats = toolResults.get_user_question_stats;
    const total = stats?.total || 0;
    const statusText = Object.entries(stats?.byStatus || {})
      .map(([status, count]) => `${status} ${count} 个`)
      .join('，');

    return statusText
      ? `你一共发布了 ${total} 个问题，其中 ${statusText}。`
      : `你一共发布了 ${total} 个问题。`;
  }

  if (intent === 'question_discovery' || hasQuestionRecommendations) {
    const ranked = toolResults.rank_questions_for_user;
    if (!ranked?.list?.length) {
      return '我已经搜索了当前平台问题，但暂时没有找到足够匹配的待回答问题。可以换一个关键词，或者先让我记住你的擅长方向。';
    }
    const adjustmentText = adjustments.length
      ? `由于初次搜索候选偏少，我已按以下方式放宽条件：${adjustments.map((item) => item.summary).join('；')}。`
      : '';
    return `我按你的偏好、赏金和发布时间筛出了 ${ranked.list.length} 个更适合回答的问题。${adjustmentText}`;
  }

  if (intent === 'refund_support' || hasRefundResult) {
    const refunds = toolResults.get_refund_status;
    if (!refunds?.list?.length) {
      return [
        '我没有查到你当前账号下的退款记录。',
        '建议你先确认这笔交易是否已经提交退款申请、是否使用了当前登录账号；如果你确认已经申请过退款，可以点击下方确认转人工，让客服按交易记录继续核查。'
      ].join('');
    }
    return `我查到了 ${refunds.list.length} 条退款记录，并结合平台规则整理了状态。`;
  }

  if (intent === 'transaction_summary' || hasTransactionResult) {
    const transactions = toolResults.get_recent_transactions;
    return transactions?.list?.length
      ? `我整理了你最近 ${transactions.list.length} 笔问答交易，下面是关键状态。`
      : '我暂时没有查到你最近参与的问答交易。';
  }

  const topics = memory?.preferences?.topics || [];
  return topics.length
    ? `我已结合你的偏好（${topics.join('、')}）完成分析。`
    : '我已完成这次 Agent 分析，并给出可执行建议。';
}

/**
 * 解析模型生成的工具结果占位符。
 * 例如 $search_questions.results 会被替换成 search_questions 的真实 list。
 */
function resolveToolReference(value, toolResults) {
  if (typeof value !== 'string') return value;

  const match = value.match(/^\$(\w+)\.(results|list)$/);
  if (!match) return value;

  const [, toolName] = match;
  // 模型 Planner 有时会输出 "$search_questions.results" 这类占位符，
  // 执行器在真正调用工具前把它解析成上一步的真实结果，避免把字符串传给排序工具。
  return toolResults[toolName]?.list || [];
}

/**
 * 递归解析 input 里的工具引用。
 * Planner 可能把引用藏在对象或数组里，所以这里统一递归处理。
 */
function resolveInputReferences(input, toolResults) {
  if (Array.isArray(input)) {
    return input.map((item) => resolveInputReferences(item, toolResults));
  }

  if (input && typeof input === 'object') {
    return Object.entries(input).reduce((result, [key, value]) => {
      result[key] = resolveInputReferences(value, toolResults);
      return result;
    }, {});
  }

  return resolveToolReference(input, toolResults);
}

/**
 * 计算某个工具步骤真正要接收的 input。
 * 它负责把 inputFrom 和占位符都转换成上一步工具的真实输出。
 */
function resolveStepInput(step, toolResults) {
  if (step.inputFrom === 'search_questions') {
    return {
      questions: toolResults.search_questions?.list || []
    };
  }
  if (step.inputFrom && toolResults[step.inputFrom]) {
    return toolResults[step.inputFrom];
  }

  const input = resolveInputReferences(step.input || {}, toolResults);
  if (step.toolName === 'rank_questions_for_user' && !Array.isArray(input.questions)) {
    return {
      ...input,
      questions: toolResults.search_questions?.list || []
    };
  }
  return input;
}

/**
 * 合并多轮问题搜索结果。
 * ReAct 放宽搜索后可能拿到重复问题，这里按 questionId 去重。
 */
function mergeQuestionSearchResults(firstResult = {}, secondResult = {}) {
  const map = new Map();
  [...(firstResult.list || []), ...(secondResult.list || [])].forEach((question) => {
    if (!question?.questionId) return;
    map.set(String(question.questionId), question);
  });

  return {
    total: map.size,
    list: Array.from(map.values())
  };
}

/**
 * 执行单个工具步骤，并写入 tool_call / observation 两条 Trace。
 * 这样用户既能看到调用参数，也能看到工具真实返回结果。
 */
async function executeToolStep({ trace, userId, memory, step, input, phase = 'tool_call' }) {
  const titlePrefix = phase === 'react_action' ? '再次调用工具' : '调用工具';
  trace.steps.push({
    type: phase,
    title: `${titlePrefix}：${step.toolName}`,
    toolName: step.toolName,
    input,
    summary: phase === 'react_action'
      ? 'Agent 根据评估结果调整参数后再次调用工具。'
      : 'Agent 正在把任务拆成平台工具调用。'
  });

  const output = await callTool(step.toolName, {
    userId,
    input,
    memory
  });

  const observationType = phase === 'react_action' ? 'react_observation' : 'observation';
  trace.steps.push({
    type: observationType,
    title: `观察结果：${step.toolName}`,
    toolName: step.toolName,
    output,
    summary: summarizeToolResult(step.toolName, output)
  });

  return output;
}

/**
 * 构造需要用户确认的动作卡片。
 * 转人工这类高影响动作不能自动执行，只能先生成确认卡。
 */
function buildActionCards(intent, goal, toolResults = {}) {
  const shouldHandoffForRefund = Boolean(
    toolResults.get_refund_status && !(toolResults.get_refund_status.list || []).length
  );

  if (intent !== 'handoff' && !shouldHandoffForRefund) return [];
  return [
    {
      type: shouldHandoffForRefund ? 'refund_handoff_confirm' : 'handoff_confirm',
      title: shouldHandoffForRefund ? '转人工核查退款' : '确认转人工客服',
      description: shouldHandoffForRefund
        ? '当前没有查到退款记录。确认后会创建人工客服请求，让客服继续核查你的交易和退款状态。'
        : '这个动作会暂停智能客服，并创建一条人工客服排队请求。',
      payload: {
        message: goal || '用户从 Agent 助手请求人工客服'
      },
      confirmAction: 'create_handoff_request'
    }
  ];
}

/**
 * 调用最终总结模型，并在失败时降级到规则回答。
 * 模型只负责把真实工具结果讲清楚，不能编造不存在的执行结果。
 */
async function buildFinalSummaryWithModel({
  goal,
  plannerResult,
  trace,
  toolResults,
  resultCards,
  actionCards,
  memory,
  adjustments
}) {
  const fallbackAnswer = buildFinalAnswer(plannerResult.intent, toolResults, memory, adjustments);
  try {
    return await summarizeFinalAnswer({
      goal,
      plannerResult,
      traceSteps: trace.steps || [],
      toolResults,
      resultCards,
      actionCards,
      memory,
      fallbackAnswer
    });
  } catch (error) {
    return {
      finalAnswer: fallbackAnswer,
      statusLabel: '',
      nextActions: [],
      source: 'fallback',
      fallbackReason: error.message || 'Final Summarizer 调用失败'
    };
  }
}

/**
 * 非任务聊天的简单回复。
 * 当前 Agent 不是完整聊天机器人，所以这里只做轻量提示，不进入工具链。
 */
function buildChatAnswer(goal) {
  const text = String(goal || '').trim();
  if (/你好|hello|hi|在吗/.test(text.toLowerCase())) {
    return '我在。你可以直接和我聊天；如果要让我执行平台任务，可以说“帮我找 Java 高赏金问题”“查询我的退款状态”这类明确目标。';
  }

  return '我理解你的意思了。当前没有检测到需要调用平台工具的明确任务，所以我不会自动执行完整 Agent 流程。你可以继续补充问题，或者直接说“帮我查询/帮我推荐/帮我统计”。';
}

/**
 * 生成追问文案。
 * 优先使用模型给出的 clarificationQuestion，缺少问题 ID 时使用更具体的兜底问题。
 */
function buildClarificationAnswer(route = {}) {
  if (route.clarificationQuestion) {
    return route.clarificationQuestion;
  }

  const missingFields = Array.isArray(route.missingFields) ? route.missingFields : [];
  if (missingFields.some((field) => ['questionId', 'questionTitle'].includes(field))) {
    return '请告诉我你要查看哪个问题，可以提供问题标题或 questionId。';
  }

  return '我还不能确定你希望我执行什么任务，请补充要查询或处理的具体内容。';
}

/**
 * 创建 chat、memory_only、clarification 三类非任务 Trace。
 * 这些输入不执行 Planner，但仍保存历史，方便用户回看 Agent 的判断。
 */
async function createNonTaskTrace({ userId, goal, memory, memoryExtraction, route }) {
  const isMemoryOnly = route.mode === 'memory_only';
  const isClarification = route.mode === 'clarification';
  const finalAnswer = isMemoryOnly
    ? `已记住你的偏好：${memoryExtraction.summary || '后续推荐会参考这条偏好。'}`
    : isClarification
      ? buildClarificationAnswer(route)
      : buildChatAnswer(goal);
  const traceType = isMemoryOnly ? 'memory' : isClarification ? 'clarification' : 'chat';
  const traceTitle = isMemoryOnly ? '仅更新记忆' : isClarification ? '需要补充信息' : '普通对话';
  const traceSummary = isMemoryOnly
    ? 'Agent 判断这是偏好表达，只更新记忆，不进入 Planner 和工具执行。'
    : isClarification
      ? `Agent 对任务判断的置信度为 ${route.confidence ?? 0}，当前信息不足，因此先追问而不调用工具。`
      : 'Agent 判断这是普通聊天，没有明确平台任务，因此不调用工具。';

  const trace = await AgentTraceModel.create({
    userId,
    goal,
    status: isClarification ? 'waiting_clarification' : 'completed',
    plan: isMemoryOnly
      ? ['识别为偏好记忆', '写入记忆', '直接回复']
      : isClarification
        ? ['检查任务置信度和缺失参数', '暂停工具执行', '向用户追问']
        : ['识别为普通对话', '不调用平台工具', '直接回复'],
    memorySnapshot: memory,
    finalAnswer,
    resultCards: [],
    actionCards: [],
    steps: [
      {
        type: traceType,
        title: traceTitle,
        output: {
          route,
          memoryExtraction
        },
        summary: traceSummary
      },
      {
        type: 'final',
        title: isClarification ? '等待用户补充' : '任务完成',
        summary: finalAnswer
      }
    ],
    updatedAt: new Date()
  });

  await appendContextTurn(userId, {
    goal,
    intent: route.mode,
    finalAnswer,
    resultCards: []
  });

  return trace;
}

/**
 * Agent 主入口。
 * 这段函数只保留主流程：分析输入、写记忆、路由分流、计划工具、执行工具、总结落库。
 */
async function runAgentTask({ userId, goal }) {
  const currentMemory = await getOrCreateMemory(userId);
  const inputAnalysis = await analyzeAgentInput(goal, serializeMemory(currentMemory));
  const updatedMemory = await updateMemoryWithPatch(userId, inputAnalysis.memoryPatch);
  const memory = serializeMemory(updatedMemory);
  const memoryExtraction = memory.lastExtractionMeta || {
    source: inputAnalysis.memoryPatch?.source || 'fallback',
    sourceLabel: inputAnalysis.memoryPatch?.sourceLabel || '规则兜底',
    shouldRemember: Boolean(inputAnalysis.memoryPatch?.shouldRemember),
    operation: inputAnalysis.memoryPatch?.operation || 'add',
    summary: inputAnalysis.memoryPatch?.summary || ''
  };
  const route = inputAnalysis.route;

  if (route.mode !== 'task') {
    return createNonTaskTrace({
      userId,
      goal,
      memory,
      memoryExtraction,
      route
    });
  }

  const plannerResult = await createPlan(goal, memory);
  const trace = await AgentTraceModel.create({
    userId,
    goal,
    status: 'running',
    plan: plannerResult.plan,
    memorySnapshot: memory,
    steps: [
      {
        type: 'plan',
        title: '生成执行计划',
        summary: [
          `计划来源：${plannerResult.sourceLabel || '未知'}`,
          `记忆提取：${memoryExtraction.sourceLabel || '未知'}`,
          plannerResult.fallbackReason ? `兜底原因：${plannerResult.fallbackReason}` : '',
          plannerResult.plan.join(' -> ')
        ].filter(Boolean).join('；'),
        output: {
          intent: plannerResult.intent,
          plan: plannerResult.plan,
          plannerSource: plannerResult.source || '',
          plannerSourceLabel: plannerResult.sourceLabel || '',
          plannerFallbackReason: plannerResult.fallbackReason || '',
          memoryExtraction
        }
      }
    ]
  });

  const toolResults = {};
  const adjustments = [];

  try {
    for (const step of plannerResult.toolSteps || []) {
      const input = resolveStepInput(step, toolResults);
      const output = await executeToolStep({
        trace,
        userId,
        memory,
        step,
        input,
      });
      toolResults[step.toolName] = output;

      let reactCount = 0;
      let evaluation = evaluateToolResult({
        intent: plannerResult.intent,
        goal,
        toolName: step.toolName,
        input,
        output,
        reactCount
      });

      if (step.toolName === 'search_questions') {
        trace.steps.push({
          type: 'evaluation',
          title: `评估结果：${step.toolName}`,
          toolName: step.toolName,
          input,
          output: evaluation,
          summary: evaluation.reason
        });
      }

      while (!evaluation.sufficient && evaluation.nextAction === 'relax_search' && reactCount < 2) {
        reactCount += 1;
        adjustments.push({
          toolName: evaluation.toolName,
          summary: evaluation.adjustmentSummary,
          input: evaluation.adjustedInput
        });

        trace.steps.push({
          type: 'react_reason',
          title: `第 ${reactCount} 轮 ReAct 修正`,
          toolName: evaluation.toolName,
          input: evaluation.adjustedInput,
          output: {
            reason: evaluation.reason,
            adjustment: evaluation.adjustmentSummary
          },
          summary: `${evaluation.reason}${evaluation.adjustmentSummary ? `，${evaluation.adjustmentSummary}` : ''}。`
        });

        const reactStep = {
          toolName: evaluation.toolName,
          input: evaluation.adjustedInput
        };
        const reactOutput = await executeToolStep({
          trace,
          userId,
          memory,
          step: reactStep,
          input: evaluation.adjustedInput,
          phase: 'react_action'
        });
        toolResults[step.toolName] = mergeQuestionSearchResults(toolResults[step.toolName], reactOutput);

        evaluation = evaluateToolResult({
          intent: plannerResult.intent,
          goal,
          toolName: step.toolName,
          input: evaluation.adjustedInput,
          output: toolResults[step.toolName],
          reactCount
        });

        trace.steps.push({
          type: 'evaluation',
          title: `修正后评估：${step.toolName}`,
          toolName: step.toolName,
          input: reactStep.input,
          output: evaluation,
          summary: evaluation.reason
        });
      }
    }

    const resultCards = [
      ...buildAdjustmentCards(adjustments),
      ...buildQuestionStatsCards(toolResults.get_user_question_stats),
      ...buildApplicantCards(toolResults.get_question_applicants),
      ...buildQuestionCards(toolResults.rank_questions_for_user),
      ...buildRefundCards(toolResults.get_refund_status),
      ...buildTransactionCards(toolResults.get_recent_transactions)
    ];
    const actionCards = buildActionCards(plannerResult.intent, goal, toolResults);
    const finalSummary = await buildFinalSummaryWithModel({
      goal,
      plannerResult,
      trace,
      toolResults,
      resultCards,
      actionCards,
      memory,
      adjustments
    });
    const finalAnswer = finalSummary.finalAnswer;

    trace.steps.push({
      type: 'decision',
      title: '形成最终建议',
      output: {
        resultCardCount: resultCards.length,
        actionCardCount: actionCards.length,
        finalSummarySource: finalSummary.source,
        finalSummaryFallbackReason: finalSummary.fallbackReason || '',
        nextActions: finalSummary.nextActions || []
      },
      summary: actionCards.length
        ? `Agent 已根据工具结果生成最终回复（${finalSummary.source === 'model' ? '模型总结' : '规则兜底'}），并准备了需要用户确认的下一步动作。`
        : `Agent 已根据工具结果生成最终回复（${finalSummary.source === 'model' ? '模型总结' : '规则兜底'}）。`
    });
    trace.steps.push({
      type: 'final',
      title: '任务完成',
      summary: finalAnswer
    });

    trace.status = actionCards.length ? 'waiting_confirmation' : 'completed';
    trace.finalAnswer = finalAnswer;
    trace.resultCards = resultCards;
    trace.actionCards = actionCards;
    trace.updatedAt = new Date();
    await trace.save();
    await appendContextTurn(userId, {
      goal,
      intent: plannerResult.intent,
      finalAnswer,
      resultCards
    });

    return trace;
  } catch (error) {
    trace.status = 'failed';
    trace.finalAnswer = 'Agent 执行时遇到错误，建议稍后重试或转人工客服。';
    trace.steps.push({
      type: 'error',
      title: '执行失败',
      summary: error.message,
      output: {
        message: error.message
      }
    });
    trace.updatedAt = new Date();
    await trace.save();
    await appendContextTurn(userId, {
      goal,
      intent: plannerResult.intent,
      finalAnswer: trace.finalAnswer,
      resultCards: []
    });
    return trace;
  }
}

/**
 * 用户确认高影响动作后的执行入口。
 * 先校验 Trace 属于当前用户且动作来自本次 Agent，再真正调用工具。
 */
async function confirmAgentAction({ userId, runId, actionType, payload }) {
  const trace = await AgentTraceModel.findOne({ _id: runId, userId });
  if (!trace) {
    throw new Error('Agent 任务不存在或无权限确认');
  }

  const matchedCard = (trace.actionCards || []).find((item) => item.confirmAction === actionType);
  if (!matchedCard) {
    throw new Error('当前 Agent 任务没有这个可确认动作');
  }

  const output = await callTool(actionType, {
    userId,
    input: payload || matchedCard.payload || {}
  });

  trace.steps.push({
    type: 'tool_call',
    title: `用户确认执行：${actionType}`,
    toolName: actionType,
    input: payload || matchedCard.payload || {},
    output,
    summary: '用户已确认，高影响动作现在才真正执行。'
  });
  trace.status = 'completed';
  trace.finalAnswer = '已根据你的确认完成操作。';
  trace.actionCards = [];
  trace.updatedAt = new Date();
  await trace.save();

  return {
    trace,
    output
  };
}

module.exports = {
  runAgentTask,
  confirmAgentAction
};



