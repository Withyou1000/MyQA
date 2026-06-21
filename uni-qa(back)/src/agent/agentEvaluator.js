const MIN_RECOMMENDATION_COUNT = 3;

function hasHardSearchConstraint(goal) {
  const text = String(goal || '');
  return /必须|只能|严格|不要放宽|不放宽|只要|限定|一定要/.test(text);
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function buildRelaxedQuestionSearchInput(input = {}) {
  const minReward = normalizeNumber(input.minReward, 0);
  const nextMinReward = minReward > 10 ? Math.floor(minReward / 2) : 0;
  const keyword = String(input.keyword || '').trim();
  const topic = String(input.topic || '').trim();

  // 搜索结果不足时，只放宽“推荐发现类”查询；保留 limit 是为了让下一步排序有更多候选。
  return {
    ...input,
    keyword: keyword && keyword !== '编程' ? '编程' : keyword,
    topic: topic && topic !== '编程' ? '' : topic,
    minReward: nextMinReward,
    limit: Math.max(normalizeNumber(input.limit, 20), 20)
  };
}

function describeSearchRelaxation(input = {}, adjustedInput = {}) {
  const changes = [];
  if ((input.keyword || '') !== (adjustedInput.keyword || '')) {
    changes.push(`关键词从「${input.keyword || '不限'}」放宽为「${adjustedInput.keyword || '不限'}」`);
  }
  if ((input.topic || '') !== (adjustedInput.topic || '')) {
    changes.push(`分类从「${input.topic || '不限'}」放宽为「${adjustedInput.topic || '不限'}」`);
  }
  if (normalizeNumber(input.minReward, 0) !== normalizeNumber(adjustedInput.minReward, 0)) {
    changes.push(`最低赏金从 ${normalizeNumber(input.minReward, 0)} 元调整为 ${normalizeNumber(adjustedInput.minReward, 0)} 元`);
  }
  return changes.length ? changes.join('，') : '放宽搜索条件';
}

function evaluateToolResult({ goal, toolName, input = {}, output = {}, reactCount = 0 }) {
  if (toolName !== 'search_questions') {
    return {
      sufficient: true,
      reason: '当前工具结果不需要进入修正循环。'
    };
  }

  const total = normalizeNumber(output.total, Array.isArray(output.list) ? output.list.length : 0);
  if (output.error) {
    return {
      sufficient: false,
      reason: `搜索工具返回错误：${output.error}`,
      nextAction: ''
    };
  }

  if (total >= MIN_RECOMMENDATION_COUNT) {
    return {
      sufficient: true,
      reason: `找到 ${total} 条候选问题，数量足够进入排序。`
    };
  }

  if (hasHardSearchConstraint(goal)) {
    return {
      sufficient: true,
      reason: `只找到 ${total} 条候选问题，但用户表达了强约束，Agent 不自动放宽条件。`
    };
  }

  if (reactCount >= 2) {
    return {
      sufficient: true,
      reason: `已完成 ${reactCount} 轮修正，停止继续放宽，避免无限搜索。`
    };
  }

  const adjustedInput = buildRelaxedQuestionSearchInput(input);
  return {
    sufficient: false,
    reason: `只找到 ${total} 条候选问题，推荐类任务结果偏少。`,
    nextAction: 'relax_search',
    toolName: 'search_questions',
    adjustedInput,
    adjustmentSummary: describeSearchRelaxation(input, adjustedInput)
  };
}

module.exports = {
  evaluateToolResult
};
