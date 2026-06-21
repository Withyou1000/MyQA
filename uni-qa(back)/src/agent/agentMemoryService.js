const AgentMemoryModel = require('../models/AgentMemoryModel');

/**
 * 合并数组并按小写去重。
 * 技术关键词经常出现 Java/java 这种大小写差异，按小写去重能避免前端重复展示。
 */
function uniqueMerge(current = [], incoming = []) {
  const seen = new Set();
  return [...current, ...incoming]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/**
 * 把记忆项统一成小写 key。
 * 删除偏好时需要忽略大小写，否则 Java 和 java 会被当成两个不同主题。
 */
function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * 从已有数组中移除指定项。
 * 这里按 normalizeKey 比较，保证大小写不同也能正确删除。
 */
function removeItems(current = [], removing = []) {
  const removingKeys = new Set((removing || []).map(normalizeKey).filter(Boolean));
  return (current || []).filter((item) => !removingKeys.has(normalizeKey(item)));
}

/**
 * 把 memoryPatch 应用到 preferences。
 * add 追加偏好，replace 覆盖偏好，remove 移除正向偏好并加入规避项。
 */
function applyPreferencePatch(preferences, extracted) {
  const operation = extracted.operation || 'add';

  if (operation === 'replace') {
    preferences.topics = uniqueMerge([], extracted.topics);
    preferences.keywords = uniqueMerge([], extracted.keywords);
    preferences.avoidTopics = uniqueMerge([], extracted.avoidTopics);
  } else if (operation === 'remove') {
    const removeTopics = uniqueMerge(extracted.removeTopics, extracted.topics);
    const removeKeywords = uniqueMerge(extracted.removeKeywords, extracted.keywords);
    preferences.topics = removeItems(preferences.topics, removeTopics);
    preferences.keywords = removeItems(preferences.keywords, removeKeywords);
    preferences.avoidTopics = uniqueMerge(
      removeItems(preferences.avoidTopics, extracted.removeAvoidTopics),
      uniqueMerge(extracted.avoidTopics, removeTopics)
    );
  } else {
    preferences.topics = uniqueMerge(preferences.topics, extracted.topics);
    preferences.keywords = uniqueMerge(preferences.keywords, extracted.keywords);
    preferences.avoidTopics = uniqueMerge(preferences.avoidTopics, extracted.avoidTopics);
  }

  // 当前版本 minReward 只升不降，避免一句模糊表达把用户已设置的高赏金偏好降掉。
  if (extracted.minReward > preferences.minReward) {
    preferences.minReward = extracted.minReward;
  }
}

/**
 * 获取当前用户记忆，不存在就初始化。
 * Agent 每轮都需要读取记忆，所以这里统一处理 MongoDB 创建逻辑。
 */
async function getOrCreateMemory(userId) {
  let memory = await AgentMemoryModel.findOne({ userId });
  if (!memory) {
    memory = await AgentMemoryModel.create({ userId });
  }
  return memory;
}

/**
 * 把 AgentInputAnalyzer 产出的 memoryPatch 写入记忆文档。
 * 即使不写长期偏好，也会记录 lastExtractionMeta，方便 Trace 展示本轮判断来源。
 */
async function applyMemoryPatchToDocument(memory, extracted = {}) {
  const extractionMeta = {
    source: extracted.source || 'fallback',
    sourceLabel: extracted.sourceLabel || '规则兜底',
    shouldRemember: Boolean(extracted.shouldRemember),
    operation: extracted.operation || 'add',
    summary: extracted.summary || ''
  };

  if (!extracted.shouldRemember) {
    memory.$locals = {
      ...(memory.$locals || {}),
      lastExtractionMeta: extractionMeta
    };
    return memory;
  }

  applyPreferencePatch(memory.preferences, extracted);

  if (extracted.summary) {
    memory.summaries = uniqueMerge(memory.summaries, [extracted.summary]).slice(-10);
  }

  memory.updatedAt = new Date();
  await memory.save();
  memory.$locals = {
    ...(memory.$locals || {}),
    lastExtractionMeta: extractionMeta
  };
  return memory;
}

/**
 * 主流程使用的记忆更新入口。
 * 这里不再调用模型，只应用 AgentInputAnalyzer 已经分析好的 memoryPatch。
 */
async function updateMemoryWithPatch(userId, extracted) {
  const memory = await getOrCreateMemory(userId);
  return applyMemoryPatchToDocument(memory, extracted);
}

/**
 * 压缩结果卡片后写入短期上下文。
 * 只保留下一轮补参最常用的信息，避免 contextTurns 越积越大。
 */
function compactResultCards(cards = []) {
  return cards.slice(0, 5).map((card) => ({
    type: card.type || '',
    title: card.title || '',
    description: card.description || '',
    payload: card.payload
      ? {
          questionId: card.payload.questionId || card.payload.question?.questionId || '',
          total: card.payload.total,
          status: card.payload.status,
          count: Array.isArray(card.payload.applicants) ? card.payload.applicants.length : undefined
        }
      : null
  }));
}

/**
 * 保存最近 3 轮对话上下文。
 * 每轮会写入 user 和 agent 两条 turn，所以保留 6 条就是最近 3 轮。
 */
async function appendContextTurn(userId, { goal, intent, finalAnswer, resultCards }) {
  const memory = await getOrCreateMemory(userId);
  const now = new Date();

  memory.contextTurns = [
    ...(memory.contextTurns || []),
    {
      role: 'user',
      content: String(goal || ''),
      intent: '',
      resultSummary: '',
      resultCards: [],
      createdAt: now
    },
    {
      role: 'agent',
      content: String(finalAnswer || ''),
      intent: String(intent || ''),
      resultSummary: String(finalAnswer || ''),
      resultCards: compactResultCards(resultCards || []),
      createdAt: now
    }
  ].slice(-6);

  memory.updatedAt = now;
  await memory.save();
  return memory;
}

/**
 * 把 Mongoose 文档转换成普通对象。
 * 模型提示词、前端和 Trace 都只应该拿到必要字段，不直接暴露完整数据库文档。
 */
function serializeMemory(memory) {
  if (!memory) {
    return {
      preferences: {
        topics: [],
        keywords: [],
        minReward: 0,
        avoidTopics: []
      },
      summaries: [],
      contextTurns: []
    };
  }

  return {
    preferences: {
      topics: memory.preferences?.topics || [],
      keywords: memory.preferences?.keywords || [],
      minReward: memory.preferences?.minReward || 0,
      avoidTopics: memory.preferences?.avoidTopics || []
    },
    summaries: memory.summaries || [],
    lastExtractionMeta: memory.$locals?.lastExtractionMeta || null,
    contextTurns: (memory.contextTurns || []).map((turn) => ({
      role: turn.role,
      content: turn.content || '',
      intent: turn.intent || '',
      resultSummary: turn.resultSummary || '',
      resultCards: turn.resultCards || [],
      createdAt: turn.createdAt
    })),
    updatedAt: memory.updatedAt
  };
}

module.exports = {
  getOrCreateMemory,
  updateMemoryWithPatch,
  appendContextTurn,
  serializeMemory,
  applyPreferencePatch
};
