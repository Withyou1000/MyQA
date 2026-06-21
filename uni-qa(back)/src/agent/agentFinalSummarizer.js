const { createStructuredReply } = require('../ai/services/aiClient');

function compactToolResults(toolResults = {}) {
  return Object.entries(toolResults).reduce((result, [toolName, output]) => {
    const list = Array.isArray(output?.list) ? output.list.slice(0, 5) : undefined;
    result[toolName] = {
      total: output?.total,
      error: output?.error || '',
      list,
      needsQuestionSelection: output?.needsQuestionSelection,
      message: output?.message || '',
      question: output?.question || null
    };
    return result;
  }, {});
}

function compactTraceSteps(steps = []) {
  return steps.map((step) => ({
    type: step.type,
    title: step.title,
    toolName: step.toolName,
    summary: step.summary,
    input: step.input || null,
    output: step.output && typeof step.output === 'object'
      ? {
          total: step.output.total,
          error: step.output.error || '',
          reason: step.output.reason || '',
          nextAction: step.output.nextAction || '',
          adjustmentSummary: step.output.adjustmentSummary || ''
        }
      : null
  }));
}

function normalizeSummary(rawSummary, fallbackAnswer) {
  const summary = rawSummary && typeof rawSummary === 'object' ? rawSummary : {};
  const finalAnswer = String(summary.finalAnswer || fallbackAnswer || '').trim();

  return {
    finalAnswer: finalAnswer || '我已经完成分析，但没有得到足够结果。你可以换一个更明确的目标，或转人工继续确认。',
    statusLabel: String(summary.statusLabel || '').slice(0, 30),
    nextActions: Array.isArray(summary.nextActions)
      ? summary.nextActions.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 3)
      : [],
    source: 'model'
  };
}

async function summarizeFinalAnswer({
  goal,
  plannerResult,
  traceSteps,
  toolResults,
  resultCards,
  actionCards,
  memory,
  fallbackAnswer
}) {
  const result = await createStructuredReply([
    {
      role: 'system',
      content: [
        '你是 MyQA Agent 的最终结果总结器。',
        '你只能根据工具结果和执行轨迹总结，不要编造没有发生的操作。',
        '如果工具没有查到结果，要明确说“没有查到”，不要说“已完成并给出建议”这种空话。',
        '如果有 actionCards，说明用户需要确认后才能执行下一步。',
        '输出 JSON：{ "finalAnswer": string, "statusLabel": string, "nextActions": string[] }。',
        'finalAnswer 用简洁中文，直接回答用户目标，并说明失败原因或下一步。'
      ].join('\n')
    },
    {
      role: 'user',
      content: [
        `用户目标：${goal}`,
        '',
        `Planner：${JSON.stringify(plannerResult || {})}`,
        '',
        `执行轨迹摘要：${JSON.stringify(compactTraceSteps(traceSteps || []))}`,
        '',
        `工具结果：${JSON.stringify(compactToolResults(toolResults || {}))}`,
        '',
        `结果卡片：${JSON.stringify(resultCards || [])}`,
        '',
        `待确认动作：${JSON.stringify(actionCards || [])}`,
        '',
        `用户记忆：${JSON.stringify(memory || {})}`,
        '',
        `规则兜底回答：${fallbackAnswer || ''}`
      ].join('\n')
    }
  ]);

  return normalizeSummary(result, fallbackAnswer);
}

module.exports = {
  summarizeFinalAnswer
};
